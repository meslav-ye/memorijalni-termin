"use server";

import { revalidatePath, updateTag } from "next/cache";
import { leaderboardTag } from "@/lib/data/leaderboard";
import { copyLineup, ensureDraftGame, getCurrentGame } from "@/lib/data/games";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findRecentDuplicate, secondsAgo, DUPLICATE_WINDOW_SECONDS } from "@/lib/domain/duplicates";
import { INITIAL_RATING } from "@/lib/domain/elo";
import { computeContributions } from "@/lib/domain/contribution";
import { computeDualElo } from "@/lib/domain/settle-ratings";
import { canStart, MINUTES_BEFORE_START } from "@/lib/domain/startability";
import { canAssignLineupGoalkeeper, canChangeLineupGoalkeeper } from "@/lib/domain/lineup-goalkeeper";
import type { Team } from "@/lib/domain/types";

/**
 * Action result. Explicitly typed as a two-branch union — without that,
 * TypeScript infers optional fields on both sides, so `"error" in result`
 * does not narrow and `result.error` becomes `string | undefined`.
 */
export type ActionResult = { ok: true } | { error: string };

export type GoalActionResult =
  | { ok: true; eventId: string }
  | { possibleDuplicate: { secondsBefore: number } }
  | { error: string };

/** Whether the signed-in user may touch this session (any game's lineup). */
async function requireLineupAccess(matchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: lineup } = await supabase
    .from("match_lineup")
    .select("team")
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!lineup) return null;

  return { supabase, user };
}

async function requireOpenGame(matchId: string) {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Nemaš pravo." as const };

  const game = await getCurrentGame(matchId, ctx.supabase);
  if (!game || game.status !== "u_tijeku") {
    return { error: "Nema otvorene utakmice." as const };
  }

  return { ...ctx, game };
}

/** Score on `games` is a fast copy for display. Events are the source of truth. */
async function refreshScore(gameId: string) {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("match_events")
    .select("team")
    .eq("game_id", gameId)
    .is("deleted_at", null)
    .in("type", ["goal", "own_goal"]);

  const a = (events ?? []).filter((e) => e.team === "A").length;
  const b = (events ?? []).filter((e) => e.team === "B").length;

  await supabase.from("games").update({ score_a: a, score_b: b }).eq("id", gameId);
}

export async function startMatch(groupId: string, matchId: string): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Termin pokreće netko tko je u postavi." };

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status, starts_at")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return { error: "Termin nije pronađen." };
  if (match.status === "zavrsen") return { error: "Termin je već završen." };
  if (match.status === "otkazan") return { error: "Termin je otkazan." };
  if (match.status === "u_tijeku") return { ok: true };

  if (!canStart(match.starts_at, new Date())) {
    return {
      error: `Termin se može pokrenuti tek ${MINUTES_BEFORE_START} minuta prije početka.`,
    };
  }

  const game = await ensureDraftGame(matchId, ctx.supabase);
  if (!game) return { error: "Utakmica nije pripremljena. Pokušaj ponovno." };

  const now = new Date().toISOString();

  const { error: matchError } = await ctx.supabase
    .from("matches")
    .update({ status: "u_tijeku" })
    .eq("id", matchId);

  if (matchError) return { error: "Pokretanje nije uspjelo. Pokušaj ponovno." };

  const { error: gameError } = await ctx.supabase
    .from("games")
    .update({
      started_at: game.started_at ?? now,
      paused_at: null,
      total_paused_seconds: game.started_at ? game.total_paused_seconds : 0,
      status: "u_tijeku",
    })
    .eq("id", game.id);

  if (gameError) return { error: "Pokretanje nije uspjelo. Pokušaj ponovno." };

  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  return { ok: true };
}

export async function pauseMatch(matchId: string): Promise<ActionResult> {
  const open = await requireOpenGame(matchId);
  if (!("game" in open)) return { error: open.error };

  const { error } = await open.supabase
    .from("games")
    .update({ paused_at: new Date().toISOString() })
    .eq("id", open.game.id)
    .is("paused_at", null);

  return error ? { error: "Pauziranje nije uspjelo." } : { ok: true };
}

export async function resumeMatch(matchId: string): Promise<ActionResult> {
  const open = await requireOpenGame(matchId);
  if (!("game" in open)) return { error: open.error };

  if (!open.game.paused_at) return { ok: true };

  const pauseDuration = Math.floor(
    (Date.now() - new Date(open.game.paused_at).getTime()) / 1000,
  );

  const { error } = await open.supabase
    .from("games")
    .update({
      paused_at: null,
      total_paused_seconds: open.game.total_paused_seconds + Math.max(0, pauseDuration),
    })
    .eq("id", open.game.id);

  return error ? { error: "Nastavak nije uspio." } : { ok: true };
}

export async function recordGoal(
  matchId: string,
  scorerId: string,
  team: Team,
  elapsed: number,
  confirmedDuplicate = false,
): Promise<GoalActionResult> {
  const open = await requireOpenGame(matchId);
  if ("error" in open) return { error: "Golove unosi netko tko je u postavi." };

  if (!confirmedDuplicate) {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_SECONDS * 1000).toISOString();

    const { data: recent } = await open.supabase
      .from("match_events")
      .select("id, type, scorer_id, created_at, deleted_at")
      .eq("game_id", open.game.id)
      .eq("type", "goal")
      .eq("scorer_id", scorerId)
      .is("deleted_at", null)
      .gte("created_at", since);

    const duplicate = findRecentDuplicate(
      (recent ?? []).map((e) => ({
        id: e.id,
        type: "goal" as const,
        scorerId: e.scorer_id,
        createdAt: e.created_at,
        deletedAt: e.deleted_at,
      })),
      scorerId,
      new Date(),
    );

    if (duplicate) {
      return { possibleDuplicate: { secondsBefore: secondsAgo(duplicate, new Date()) } };
    }
  }

  const { data, error } = await open.supabase
    .from("match_events")
    .insert({
      match_id: matchId,
      game_id: open.game.id,
      type: "goal",
      team,
      scorer_id: scorerId,
      assist_id: null,
      elapsed_seconds: elapsed,
      created_by: open.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Gol nije upisan. Pokušaj ponovno." };

  await refreshScore(open.game.id);
  return { ok: true, eventId: data.id };
}

export async function addAssist(
  matchId: string,
  eventId: string,
  assistId: string | null,
): Promise<ActionResult> {
  const open = await requireOpenGame(matchId);
  if ("error" in open) return { error: "Nemaš pravo." };

  const { error } = await open.supabase
    .from("match_events")
    .update({ assist_id: assistId })
    .eq("id", eventId);

  return error ? { error: "Asistencija nije spremljena." } : { ok: true };
}

export async function recordOwnGoal(
  matchId: string,
  playerId: string,
  theirTeam: Team,
  elapsed: number,
): Promise<ActionResult> {
  const open = await requireOpenGame(matchId);
  if ("error" in open) return { error: "Nemaš pravo." };

  const { error } = await open.supabase.from("match_events").insert({
    match_id: matchId,
    game_id: open.game.id,
    type: "own_goal",
    team: theirTeam === "A" ? "B" : "A",
    scorer_id: playerId,
    elapsed_seconds: elapsed,
    created_by: open.user.id,
  });

  if (error) return { error: "Autogol nije upisan." };

  await refreshScore(open.game.id);
  return { ok: true };
}

export async function undoEvent(matchId: string, eventId: string): Promise<ActionResult> {
  const open = await requireOpenGame(matchId);
  if ("error" in open) return { error: "Nemaš pravo." };

  const { error } = await open.supabase
    .from("match_events")
    .update({ deleted_at: new Date().toISOString(), deleted_by: open.user.id })
    .eq("id", eventId);

  if (error) return { error: "Poništavanje nije uspjelo." };

  await refreshScore(open.game.id);
  return { ok: true };
}

/**
 * Elo rating settlement for a finished game (group + global).
 */
async function settleRatings(groupId: string, matchId: string, gameId: string) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("rating_history")
    .select("scope")
    .eq("game_id", gameId);

  const hasGroup = (existing ?? []).some((r) => r.scope === "group");
  const hasGlobal = (existing ?? []).some((r) => r.scope === "global");
  if (hasGroup && hasGlobal) return;

  const { data: game } = await admin
    .from("games")
    .select("score_a, score_b")
    .eq("id", gameId)
    .maybeSingle();

  const { data: lineup } = await admin
    .from("match_lineup")
    .select("user_id, team, is_goalkeeper")
    .eq("game_id", gameId);

  if (!game || !lineup?.length) return;

  const { data: events } = await admin
    .from("match_events")
    .select("type, team, scorer_id, assist_id, elapsed_seconds, deleted_at")
    .eq("game_id", gameId)
    .in("type", ["goal", "own_goal", "keeper_change"]);

  const userIds = lineup.map((p) => p.user_id);

  const { data: ratings } = !hasGroup
    ? await admin
        .from("player_ratings")
        .select("user_id, rating")
        .eq("group_id", groupId)
        .in("user_id", userIds)
    : { data: [] as { user_id: string; rating: number }[] };

  const { data: profiles } = !hasGlobal
    ? await admin.from("profiles").select("id, global_rating").in("id", userIds)
    : { data: [] as { id: string; global_rating: number }[] };

  const teamPlayers = (side: Team) =>
    lineup
      .filter((p) => p.team === side)
      .map((p) => ({
        userId: p.user_id,
        groupRating:
          ratings?.find((r) => r.user_id === p.user_id)?.rating ?? INITIAL_RATING,
        globalRating:
          profiles?.find((pr) => pr.id === p.user_id)?.global_rating ?? INITIAL_RATING,
      }));

  const { group, global } = computeDualElo({
    teamA: teamPlayers("A"),
    teamB: teamPlayers("B"),
    scoreA: game.score_a,
    scoreB: game.score_b,
  });

  const contrib = computeContributions({
    lineup: lineup.map((p) => ({
      userId: p.user_id,
      team: p.team as Team,
      isGoalkeeper: p.is_goalkeeper,
    })),
    events: (events ?? []).map((e) => ({
      type: e.type as "goal" | "own_goal" | "keeper_change",
      team: e.team as Team | null,
      scorerId: e.scorer_id,
      assistId: e.assist_id,
      elapsedSeconds: e.elapsed_seconds,
      deletedAt: e.deleted_at,
    })),
  });

  const withContrib = <T extends { userId: string; ratingBefore: number; ratingAfter: number }>(
    updates: T[],
  ) =>
    updates.map((u) => {
      const c = contrib.get(u.userId)?.clamped ?? 0;
      return { ...u, ratingAfter: u.ratingAfter + c };
    });

  const groupUpdates = withContrib(group.updates);
  const globalUpdates = withContrib(global.updates);

  const historyRows = [
    ...(!hasGroup
      ? groupUpdates.map((u) => ({
          match_id: matchId,
          game_id: gameId,
          user_id: u.userId,
          scope: "group" as const,
          rating_before: u.ratingBefore,
          rating_after: u.ratingAfter,
        }))
      : []),
    ...(!hasGlobal
      ? globalUpdates.map((u) => ({
          match_id: matchId,
          game_id: gameId,
          user_id: u.userId,
          scope: "global" as const,
          rating_before: u.ratingBefore,
          rating_after: u.ratingAfter,
        }))
      : []),
  ];

  if (historyRows.length === 0) return;

  await admin.from("rating_history").upsert(historyRows, {
    onConflict: "game_id,user_id,scope",
  });

  if (!hasGroup) {
    for (const u of groupUpdates) {
      await admin.rpc("apply_rating", {
        p_group: groupId,
        p_user: u.userId,
        p_rating: u.ratingAfter,
      });
    }
  }

  if (!hasGlobal) {
    for (const u of globalUpdates) {
      await admin.rpc("apply_global_rating", {
        p_user: u.userId,
        p_rating: u.ratingAfter,
      });
    }
  }
}

/** Close the current game and settle Elo; termin stays open. */
export async function finishGame(groupId: string, matchId: string): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Utakmicu završava netko tko je u postavi." };

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (match?.status === "zavrsen") return { ok: true };
  if (match?.status !== "u_tijeku") return { error: "Termin nije u tijeku." };

  const game = await getCurrentGame(matchId, ctx.supabase);
  if (!game) return { error: "Utakmica nije pronađena." };
  if (game.status === "zavrsena") return { ok: true };

  await refreshScore(game.id);

  // Freeze the clock at pause time if already paused; otherwise at finish click.
  // Clearing paused_at without ended_at would let the stopwatch keep running.
  const endedAt = game.paused_at ?? new Date().toISOString();

  const { error } = await ctx.supabase
    .from("games")
    .update({
      status: "zavrsena",
      ended_at: endedAt,
      paused_at: null,
    })
    .eq("id", game.id);

  if (error) return { error: "Završavanje nije uspjelo. Pokušaj ponovno." };

  await settleRatings(groupId, matchId, game.id);

  updateTag(leaderboardTag(groupId));

  revalidatePath(`/grupe/${groupId}`);
  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  return { ok: true };
}

export async function startNextGame(groupId: string, matchId: string): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Novu utakmicu pokreće netko tko je u postavi." };

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (match?.status !== "u_tijeku") {
    return { error: "Termin mora biti u tijeku." };
  }

  const { data: open } = await ctx.supabase
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .eq("status", "u_tijeku")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();

  if (open) {
    if (open.started_at) {
      return { error: "Prvo završi trenutnu utakmicu." };
    }

    const { error } = await ctx.supabase
      .from("games")
      .update({
        started_at: now,
        paused_at: null,
        total_paused_seconds: 0,
      })
      .eq("id", open.id);

    if (error) return { error: "Pokretanje nije uspjelo." };

    revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
    revalidatePath(`/grupe/${groupId}/termin/${matchId}/uzivo`);
    return { ok: true };
  }

  const { data: latest } = await ctx.supabase
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return { error: "Nema prethodne utakmice." };

  const { data: next, error: insertError } = await ctx.supabase
    .from("games")
    .insert({
      match_id: matchId,
      seq: latest.seq + 1,
      status: "u_tijeku",
      started_at: now,
      team_a_name: latest.team_a_name,
      team_b_name: latest.team_b_name,
    })
    .select("*")
    .single();

  if (insertError || !next) return { error: "Nova utakmica nije kreirana." };

  await copyLineup(latest.id, next.id, ctx.supabase);

  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  revalidatePath(`/grupe/${groupId}/termin/${matchId}/uzivo`);
  return { ok: true };
}

export async function endTermin(groupId: string, matchId: string): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Termin završava netko tko je u postavi." };

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (match?.status === "zavrsen") return { ok: true };
  if (match?.status !== "u_tijeku") return { error: "Termin nije u tijeku." };

  const { data: openLive } = await ctx.supabase
    .from("games")
    .select("id, started_at")
    .eq("match_id", matchId)
    .eq("status", "u_tijeku")
    .not("started_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (openLive) {
    return { error: "Prvo završi trenutnu utakmicu." };
  }

  await ctx.supabase
    .from("games")
    .delete()
    .eq("match_id", matchId)
    .eq("status", "u_tijeku")
    .is("started_at", null);

  const { error } = await ctx.supabase
    .from("matches")
    .update({ status: "zavrsen" })
    .eq("id", matchId);

  if (error) return { error: "Završavanje termina nije uspjelo." };

  updateTag(leaderboardTag(groupId));

  revalidatePath(`/grupe/${groupId}`);
  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  return { ok: true };
}

export async function changeGoalkeeper(
  matchId: string,
  playerId: string,
  team: Team,
  elapsed: number,
): Promise<ActionResult> {
  const open = await requireOpenGame(matchId);
  if ("error" in open) return { error: "Nemaš pravo." };

  if (!canChangeLineupGoalkeeper(open.game.started_at)) {
    return { error: "Golman se bira na Ekipama prije početka utakmice." };
  }

  const { data: profile } = await open.supabase
    .from("profiles")
    .select("is_goalkeeper")
    .eq("id", playerId)
    .maybeSingle();

  // Regression guard: Jozo (outfield) must not steal the glove from Zdravko mid-match.
  if (!canAssignLineupGoalkeeper(profile?.is_goalkeeper ?? false)) {
    return { error: "Golmana može biti samo igrač označen kao golman na profilu." };
  }

  await open.supabase
    .from("match_lineup")
    .update({ is_goalkeeper: false })
    .eq("game_id", open.game.id)
    .eq("team", team);

  await open.supabase
    .from("match_lineup")
    .update({ is_goalkeeper: true })
    .eq("game_id", open.game.id)
    .eq("user_id", playerId);

  await open.supabase.from("match_events").insert({
    match_id: matchId,
    game_id: open.game.id,
    type: "keeper_change",
    team,
    scorer_id: playerId,
    elapsed_seconds: elapsed,
    created_by: open.user.id,
  });

  return { ok: true };
}
