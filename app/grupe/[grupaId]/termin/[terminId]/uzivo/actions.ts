"use server";

import { revalidatePath, updateTag } from "next/cache";
import { leaderboardTag } from "@/lib/data/leaderboard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findRecentDuplicate, secondsAgo, DUPLICATE_WINDOW_SECONDS } from "@/lib/domain/duplicates";
import { computeElo, INITIAL_RATING } from "@/lib/domain/elo";
import { canStart, MINUTES_BEFORE_START } from "@/lib/domain/startability";
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

/** Whether the signed-in user may touch this match at all. */
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
    .maybeSingle();

  // Only lineup members can enter events. RLS enforces this in the DB too —
  // this is just so the user gets a clear message instead of a silent failure.
  if (!lineup) return null;

  return { supabase, user };
}

/**
 * The score on `matches` is only a fast copy for match list display.
 * Events are the source of truth, so the score is always recomputed from them.
 */
async function refreshScore(matchId: string) {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("match_events")
    .select("team")
    .eq("match_id", matchId)
    .is("deleted_at", null)
    .in("type", ["goal", "own_goal"]);

  const a = (events ?? []).filter((e) => e.team === "A").length;
  const b = (events ?? []).filter((e) => e.team === "B").length;

  await supabase.from("matches").update({ score_a: a, score_b: b }).eq("id", matchId);
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

  // Earliest half an hour before kickoff — otherwise someone starts the match
  // a day early and the stopwatch runs all night.
  if (!canStart(match.starts_at, new Date())) {
    return {
      error: `Termin se može pokrenuti tek ${MINUTES_BEFORE_START} minuta prije početka.`,
    };
  }

  const { error } = await ctx.supabase
    .from("matches")
    .update({
      status: "u_tijeku",
      started_at: new Date().toISOString(),
      paused_at: null,
      total_paused_seconds: 0,
    })
    .eq("id", matchId);

  if (error) return { error: "Pokretanje nije uspjelo. Pokušaj ponovno." };

  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  return { ok: true };
}

export async function pauseMatch(matchId: string): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Nemaš pravo." };

  const { error } = await ctx.supabase
    .from("matches")
    .update({ paused_at: new Date().toISOString() })
    .eq("id", matchId)
    .is("paused_at", null);

  return error ? { error: "Pauziranje nije uspjelo." } : { ok: true };
}

export async function resumeMatch(matchId: string): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Nemaš pravo." };

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("paused_at, total_paused_seconds")
    .eq("id", matchId)
    .maybeSingle();

  if (!match?.paused_at) return { ok: true };

  const pauseDuration = Math.floor(
    (Date.now() - new Date(match.paused_at).getTime()) / 1000,
  );

  const { error } = await ctx.supabase
    .from("matches")
    .update({
      paused_at: null,
      total_paused_seconds: match.total_paused_seconds + Math.max(0, pauseDuration),
    })
    .eq("id", matchId);

  return error ? { error: "Nastavak nije uspio." } : { ok: true };
}

export async function recordGoal(
  matchId: string,
  scorerId: string,
  team: Team,
  elapsed: number,
  confirmedDuplicate = false,
): Promise<GoalActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Golove unosi netko tko je u postavi." };

  if (!confirmedDuplicate) {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_SECONDS * 1000).toISOString();

    const { data: recent } = await ctx.supabase
      .from("match_events")
      .select("id, type, scorer_id, created_at, deleted_at")
      .eq("match_id", matchId)
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

  // Goal is written IMMEDIATELY, without an assist. The assistant is added
  // with a second tap. If the phone locks mid-entry, the goal is already saved.
  const { data, error } = await ctx.supabase
    .from("match_events")
    .insert({
      match_id: matchId,
      type: "goal",
      team,
      scorer_id: scorerId,
      assist_id: null,
      elapsed_seconds: elapsed,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Gol nije upisan. Pokušaj ponovno." };

  await refreshScore(matchId);
  return { ok: true, eventId: data.id };
}

export async function addAssist(
  matchId: string,
  eventId: string,
  assistId: string | null,
): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Nemaš pravo." };

  const { error } = await ctx.supabase
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
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Nemaš pravo." };

  const { error } = await ctx.supabase.from("match_events").insert({
    match_id: matchId,
    type: "own_goal",
    // The goal is credited to the OPPOSING team; the player gets an own-goal mark.
    team: theirTeam === "A" ? "B" : "A",
    scorer_id: playerId,
    elapsed_seconds: elapsed,
    created_by: ctx.user.id,
  });

  if (error) return { error: "Autogol nije upisan." };

  await refreshScore(matchId);
  return { ok: true };
}

export async function undoEvent(matchId: string, eventId: string): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Nemaš pravo." };

  // Soft delete — the row stays so we always know who entered and withdrew what.
  const { error } = await ctx.supabase
    .from("match_events")
    .update({ deleted_at: new Date().toISOString(), deleted_by: ctx.user.id })
    .eq("id", eventId);

  if (error) return { error: "Poništavanje nije uspjelo." };

  await refreshScore(matchId);
  return { ok: true };
}

/**
 * Elo rating settlement for a finished match.
 *
 * Goes through the service role because player_ratings intentionally has no
 * write policy — nobody in the browser may touch ratings, theirs or anyone else's.
 *
 * Idempotent: if rating_history already has a row for this match, settlement
 * already ran and a second call does nothing. Without that, two simultaneous
 * taps on "Finish" would move ratings twice.
 */
async function settleRatings(groupId: string, matchId: string) {
  const admin = createAdminClient();

  const { data: alreadySettled } = await admin
    .from("rating_history")
    .select("id")
    .eq("match_id", matchId)
    .limit(1);

  if (alreadySettled && alreadySettled.length > 0) return;

  const { data: match } = await admin
    .from("matches")
    .select("score_a, score_b")
    .eq("id", matchId)
    .maybeSingle();

  const { data: lineup } = await admin
    .from("match_lineup")
    .select("user_id, team")
    .eq("match_id", matchId);

  if (!match || !lineup?.length) return;

  const { data: ratings } = await admin
    .from("player_ratings")
    .select("user_id, rating")
    .eq("group_id", groupId)
    .in(
      "user_id",
      lineup.map((p) => p.user_id),
    );

  const teamPlayers = (side: Team) =>
    lineup
      .filter((p) => p.team === side)
      .map((p) => ({
        userId: p.user_id,
        rating: ratings?.find((r) => r.user_id === p.user_id)?.rating ?? INITIAL_RATING,
      }));

  const result = computeElo({
    teamA: teamPlayers("A"),
    teamB: teamPlayers("B"),
    scoreA: match.score_a,
    scoreB: match.score_b,
  });

  if (result.updates.length === 0) return;

  // History first: if a rating write stalls halfway, history shows where we got to.
  await admin.from("rating_history").upsert(
    result.updates.map((u) => ({
      match_id: matchId,
      user_id: u.userId,
      rating_before: u.ratingBefore,
      rating_after: u.ratingAfter,
    })),
    { onConflict: "match_id,user_id" },
  );

  for (const u of result.updates) {
    await admin.rpc("apply_rating", {
      p_group: groupId,
      p_user: u.userId,
      p_rating: u.ratingAfter,
    });
  }
}

/** Close the match, stop entry, and settle ratings. */
export async function finishMatch(groupId: string, matchId: string): Promise<ActionResult> {
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Termin završava netko tko je u postavi." };

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (match?.status === "zavrsen") return { ok: true };
  if (match?.status !== "u_tijeku") return { error: "Termin nije u tijeku." };

  await refreshScore(matchId);

  const { error } = await ctx.supabase
    .from("matches")
    .update({ status: "zavrsen", ended_at: new Date().toISOString(), paused_at: null })
    .eq("id", matchId);

  if (error) return { error: "Završavanje nije uspjelo. Pokušaj ponovno." };

  await settleRatings(groupId, matchId);

  // Leaderboard is cached; this is the only moment it actually changes, so
  // invalidate here.
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
  const ctx = await requireLineupAccess(matchId);
  if (!ctx) return { error: "Nemaš pravo." };

  await ctx.supabase
    .from("match_lineup")
    .update({ is_goalkeeper: false })
    .eq("match_id", matchId)
    .eq("team", team);

  await ctx.supabase
    .from("match_lineup")
    .update({ is_goalkeeper: true })
    .eq("match_id", matchId)
    .eq("user_id", playerId);

  // Timeline trail: later used to compute who conceded which goal.
  await ctx.supabase.from("match_events").insert({
    match_id: matchId,
    type: "keeper_change",
    team,
    scorer_id: playerId,
    elapsed_seconds: elapsed,
    created_by: ctx.user.id,
  });

  return { ok: true };
}
