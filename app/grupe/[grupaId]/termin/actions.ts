"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchYear, ensureSeason } from "@/lib/seasons";
import { zagrebUIso, zagrebNowParts } from "@/lib/format";
import { zagrebWeekdayFromYmd } from "@/lib/domain/recurring";
import { splitSignups } from "@/lib/domain/waitlist";
import { suggestTeams } from "@/lib/domain/teams";
import { normalizeTeamName } from "@/lib/domain/team-name";
import {
  assignLineupGoalkeeperFlags,
  canAssignLineupGoalkeeper,
} from "@/lib/domain/lineup-goalkeeper";
import {
  planRatingReverts,
  usersWithLaterRatingHistory,
  type RatingScope,
} from "@/lib/domain/revert-ratings";
import { leaderboardTag } from "@/lib/data/leaderboard";
import { ensureDraftGame, ensureEditableGame } from "@/lib/data/games";

export type MatchFormState = {
  error?: string;
  message?: string;
};

async function membership(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.status !== "active") return null;
  return { supabase, user, admin: data.role === "admin" };
}

export async function createMatch(
  groupId: string,
  _previous: MatchFormState,
  formData: FormData,
): Promise<MatchFormState> {
  const playNow = formData.get("igramoOdmah") === "on";
  const recurring = !playNow && formData.get("stalni") === "on";

  let date = String(formData.get("datum") ?? "");
  let time = String(formData.get("vrijeme") ?? "");
  if (playNow) {
    const now = zagrebNowParts();
    date = now.date;
    time = now.time;
  }

  const capacity = Number(formData.get("kvota") ?? 12);
  const minPlayers = Number(formData.get("minIgraca") ?? 10);
  const locationId = String(formData.get("lokacija") ?? "").trim();
  const locationText = String(formData.get("lokacijaTekst") ?? "").trim();
  const notes = String(formData.get("napomena") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Odaberi datum." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Odaberi vrijeme." };
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 30) {
    return { error: "Najviše mjesta mora biti između 2 i 30." };
  }
  if (!Number.isInteger(minPlayers) || minPlayers < 2 || minPlayers > 30) {
    return { error: "Najmanje igrača mora biti između 2 i 30." };
  }
  if (minPlayers > capacity) {
    return { error: "Najmanje igrača ne može biti više od broja mjesta." };
  }
  if (!locationId && !locationText) {
    return { error: "Odaberi lokaciju ili je upiši." };
  }

  const ctx = await membership(groupId);
  if (!ctx) return { error: "Nemaš pravo otvoriti termin u ovoj grupi." };
  if (!ctx.admin) return { error: "Termine otvara admin grupe." };

  // User enters Zagreb local time; the server may run in any timezone.
  const startsAt = zagrebUIso(date, time);

  const seasonId = await ensureSeason(groupId, matchYear(startsAt));
  if (!seasonId) return { error: "Sezona nije pripremljena. Pokušaj ponovno." };

  let seriesId: string | null = null;
  if (recurring) {
    const { data: series, error: seriesError } = await ctx.supabase
      .from("match_series")
      .insert({
        group_id: groupId,
        weekday: zagrebWeekdayFromYmd(date),
        time_local: time,
        location_id: locationId || null,
        location_text: locationId ? null : locationText,
        capacity,
        min_players: minPlayers,
        notes: notes || null,
        created_by: ctx.user.id,
      })
      .select("id")
      .single();

    if (seriesError || !series) {
      return { error: "Stalni termin nije spremljen. Pokušaj ponovno." };
    }
    seriesId = series.id;
  }

  const { data: match, error } = await ctx.supabase
    .from("matches")
    .insert({
      group_id: groupId,
      season_id: seasonId,
      series_id: seriesId,
      location_id: locationId || null,
      location_text: locationId ? null : locationText,
      starts_at: startsAt,
      capacity,
      min_players: minPlayers,
      notes: notes || null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !match) return { error: "Termin nije kreiran. Pokušaj ponovno." };

  await ensureDraftGame(match.id, ctx.supabase);

  if (playNow) {
    // Creator is already on the pitch — sign them up so they can enter the lineup.
    await ctx.supabase.from("match_signups").upsert(
      {
        match_id: match.id,
        user_id: ctx.user.id,
        cancelled_at: null,
        signed_up_at: new Date().toISOString(),
      },
      { onConflict: "match_id,user_id" },
    );
    redirect(`/grupe/${groupId}/termin/${match.id}/ekipe`);
  }

  redirect(`/grupe/${groupId}/termin/${match.id}`);
}

export async function signUpForMatch(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");

  const ctx = await membership(groupId);
  if (!ctx) return;

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (match?.status !== "najavljen") return;

  // Re-signing after withdrawing clears the cancellation, but goes to the end
  // of the queue — otherwise withdraw + re-sign would be a way to skip the line.
  await ctx.supabase.from("match_signups").upsert(
    {
      match_id: matchId,
      user_id: ctx.user.id,
      cancelled_at: null,
      signed_up_at: new Date().toISOString(),
    },
    { onConflict: "match_id,user_id" },
  );

  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  revalidatePath(`/grupe/${groupId}`);
}

export async function withdrawFromMatch(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");

  const ctx = await membership(groupId);
  if (!ctx) return;

  await ctx.supabase
    .from("match_signups")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .eq("user_id", ctx.user.id);

  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  revalidatePath(`/grupe/${groupId}`);
}

/** Admin signs one or more members up (WhatsApp confirmation, forgot the app). */
export async function adminSignUpForMatch(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const userIds = [
    ...new Set(
      formData
        .getAll("userId")
        .map((v) => String(v).trim())
        .filter(Boolean),
    ),
  ];

  if (userIds.length === 0) return;

  const ctx = await membership(groupId);
  if (!ctx?.admin) return;

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (match?.status !== "najavljen") return;

  const { data: targets } = await ctx.supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .in("user_id", userIds)
    .eq("status", "active");

  const allowed = new Set((targets ?? []).map((t) => t.user_id));
  const toAdd = userIds.filter((id) => allowed.has(id));
  if (toAdd.length === 0) return;

  // Preserve tap order in the queue: each gets a distinct signed_up_at.
  const base = Date.now();
  await ctx.supabase.from("match_signups").upsert(
    toAdd.map((userId, i) => ({
      match_id: matchId,
      user_id: userId,
      cancelled_at: null,
      signed_up_at: new Date(base + i).toISOString(),
    })),
    { onConflict: "match_id,user_id" },
  );

  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  revalidatePath(`/grupe/${groupId}/termin/${matchId}/ekipe`);
  revalidatePath(`/grupe/${groupId}`);
}

/** Admin withdraws someone else's signup (mirror of soft self-withdraw). */
export async function adminWithdrawFromMatch(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) return;

  const ctx = await membership(groupId);
  if (!ctx?.admin) return;

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (match?.status !== "najavljen") return;

  await ctx.supabase
    .from("match_signups")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .eq("user_id", userId);

  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
  revalidatePath(`/grupe/${groupId}/termin/${matchId}/ekipe`);
  revalidatePath(`/grupe/${groupId}`);
}

/**
 * Build a team suggestion and save it as the lineup.
 *
 * Any existing lineup is deleted and written from scratch — the button is
 * meant as "reshuffle", so every call produces a clean proposal.
 */
export async function proposeTeams(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");

  const ctx = await membership(groupId);
  if (!ctx) return;

  const { supabase } = ctx;

  const { data: match } = await supabase
    .from("matches")
    .select("capacity, status")
    .eq("id", matchId)
    .maybeSingle();

  // After the match has started, the lineup is no longer reshuffled.
  if (!match || match.status === "zavrsen" || match.status === "otkazan") return;

  const { data: signups } = await supabase
    .from("match_signups")
    .select("user_id, signed_up_at, manual_order, cancelled_at")
    .eq("match_id", matchId);

  const { confirmed } = splitSignups(
    (signups ?? []).map((p) => ({
      userId: p.user_id,
      signedUpAt: p.signed_up_at,
      manualOrder: p.manual_order,
      cancelledAt: p.cancelled_at,
    })),
    match.capacity,
  );

  if (confirmed.length === 0) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, is_goalkeeper")
    .in("id", confirmed);

  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("user_id, rating")
    .eq("group_id", groupId)
    .in("user_id", confirmed);

  const players = confirmed.map((userId) => ({
    userId,
    rating: ratings?.find((r) => r.user_id === userId)?.rating ?? 1000,
    isGoalkeeper: profiles?.find((p) => p.id === userId)?.is_goalkeeper ?? false,
  }));

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("status", "zavrsen");

  const { teamA, teamB } = suggestTeams(players, count ?? 0);

  const game = await ensureEditableGame(matchId, supabase);
  if (!game) return;

  const flaggedA = assignLineupGoalkeeperFlags(teamA);
  const flaggedB = assignLineupGoalkeeperFlags(teamB);

  await supabase.from("match_lineup").delete().eq("game_id", game.id);
  await supabase.from("match_lineup").insert([
    ...flaggedA.map((p) => ({
      game_id: game.id,
      match_id: matchId,
      user_id: p.userId,
      team: "A" as const,
      is_goalkeeper: p.lineupIsGoalkeeper,
    })),
    ...flaggedB.map((p) => ({
      game_id: game.id,
      match_id: matchId,
      user_id: p.userId,
      team: "B" as const,
      is_goalkeeper: p.lineupIsGoalkeeper,
    })),
  ]);

  revalidatePath(`/grupe/${groupId}/termin/${matchId}/ekipe`);
}

export async function movePlayer(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const team = String(formData.get("ekipa") ?? "");

  if (team !== "A" && team !== "B") return;

  const ctx = await membership(groupId);
  if (!ctx) return;

  const game = await ensureEditableGame(matchId, ctx.supabase);
  if (!game) return;

  // A player who switches teams is no longer that team's goalkeeper.
  await ctx.supabase
    .from("match_lineup")
    .update({ team, is_goalkeeper: false })
    .eq("game_id", game.id)
    .eq("user_id", userId);

  revalidatePath(`/grupe/${groupId}/termin/${matchId}/ekipe`);
}

export async function setGoalkeeper(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const team = String(formData.get("ekipa") ?? "");

  if (team !== "A" && team !== "B") return;

  const ctx = await membership(groupId);
  if (!ctx) return;

  const game = await ensureEditableGame(matchId, ctx.supabase);
  if (!game) return;

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("is_goalkeeper")
    .eq("id", userId)
    .maybeSingle();

  // Outfield players must not wear the glove — same rule as live changeGoalkeeper.
  if (!canAssignLineupGoalkeeper(profile?.is_goalkeeper ?? false)) return;

  const { data: current } = await ctx.supabase
    .from("match_lineup")
    .select("is_goalkeeper")
    .eq("game_id", game.id)
    .eq("user_id", userId)
    .maybeSingle();

  // Clicking the same goalkeeper again clears the mark.
  const becoming = !current?.is_goalkeeper;

  // At most one marked goalkeeper per team.
  await ctx.supabase
    .from("match_lineup")
    .update({ is_goalkeeper: false })
    .eq("game_id", game.id)
    .eq("team", team);

  if (becoming) {
    await ctx.supabase
      .from("match_lineup")
      .update({ is_goalkeeper: true })
      .eq("game_id", game.id)
      .eq("user_id", userId);
  }

  revalidatePath(`/grupe/${groupId}/termin/${matchId}/ekipe`);
}

export async function setTeamNames(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const teamAName = normalizeTeamName(String(formData.get("teamAName") ?? ""));
  const teamBName = normalizeTeamName(String(formData.get("teamBName") ?? ""));

  const ctx = await membership(groupId);
  if (!ctx) return;

  const game = await ensureEditableGame(matchId, ctx.supabase);
  if (!game) return;

  // Any active member may rename — same bar as rearranging the lineup.
  await ctx.supabase
    .from("games")
    .update({ team_a_name: teamAName, team_b_name: teamBName })
    .eq("id", game.id);

  revalidatePath(`/grupe/${groupId}/termin/${matchId}/ekipe`);
  revalidatePath(`/grupe/${groupId}/termin/${matchId}/uzivo`);
  revalidatePath(`/grupe/${groupId}/termin/${matchId}/sazetak`);
}

export async function cancelMatch(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");

  const ctx = await membership(groupId);
  if (!ctx?.admin) return;

  await ctx.supabase
    .from("matches")
    .update({ status: "otkazan" })
    .eq("id", matchId)
    .in("status", ["najavljen", "zakljucan"]);

  revalidatePath(`/grupe/${groupId}`);
  revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
}

/** Permanently remove a finished or cancelled termin (admin only). */
export async function deleteMatch(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");

  const ctx = await membership(groupId);
  if (!ctx?.admin) return;

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("status, starts_at")
    .eq("id", matchId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (!match || (match.status !== "zavrsen" && match.status !== "otkazan")) {
    return;
  }

  // Unwind Elo before cascade deletes rating_history with the match.
  if (match.status === "zavrsen") {
    await revertRatingsForDeletedMatch(groupId, matchId, match.starts_at);
  }

  const { error } = await ctx.supabase.from("matches").delete().eq("id", matchId);
  if (error) return;

  updateTag(leaderboardTag(groupId));
  revalidatePath(`/grupe/${groupId}`);
  redirect(`/grupe/${groupId}`);
}

/**
 * Restore group/global ratings using history from this termin, when it is still
 * each player's latest rated game. Later history is left alone (needs a full
 * chronological replay we do not do on delete).
 */
async function revertRatingsForDeletedMatch(
  groupId: string,
  matchId: string,
  startsAt: string,
) {
  const admin = createAdminClient();

  const { data: history } = await admin
    .from("rating_history")
    .select("user_id, scope, rating_before, game_id, games(seq)")
    .eq("match_id", matchId);

  if (!history?.length) return;

  const rows = history.flatMap((h) => {
    const seq = h.games?.seq;
    if (typeof seq !== "number") return [];
    return [
      {
        userId: h.user_id,
        scope: h.scope as RatingScope,
        ratingBefore: h.rating_before,
        gameSeq: seq,
      },
    ];
  });

  if (rows.length === 0) return;

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const { data: others } = await admin
    .from("rating_history")
    .select("user_id, scope, game_id, games(seq, matches(starts_at))")
    .in("user_id", userIds)
    .neq("match_id", matchId);

  const later = usersWithLaterRatingHistory(
    startsAt,
    rows.map((r) => r.gameSeq),
    (others ?? []).flatMap((o) => {
      const seq = o.games?.seq;
      const otherStarts = o.games?.matches?.starts_at;
      if (typeof seq !== "number" || !otherStarts) return [];
      return [
        {
          userId: o.user_id,
          scope: o.scope as RatingScope,
          startsAt: otherStarts,
          gameSeq: seq,
        },
      ];
    }),
  );

  const plan = planRatingReverts(rows, later);

  for (const step of plan) {
    if (step.scope === "group") {
      const { data: current } = await admin
        .from("player_ratings")
        .select("matches_played")
        .eq("group_id", groupId)
        .eq("user_id", step.userId)
        .maybeSingle();

      await admin
        .from("player_ratings")
        .update({
          rating: step.rating,
          matches_played: Math.max(0, (current?.matches_played ?? 0) - step.gamesToRemove),
          updated_at: new Date().toISOString(),
        })
        .eq("group_id", groupId)
        .eq("user_id", step.userId);
    } else {
      const { data: profile } = await admin
        .from("profiles")
        .select("global_matches_played")
        .eq("id", step.userId)
        .maybeSingle();

      await admin
        .from("profiles")
        .update({
          global_rating: step.rating,
          global_matches_played: Math.max(
            0,
            (profile?.global_matches_played ?? 0) - step.gamesToRemove,
          ),
        })
        .eq("id", step.userId);
    }
  }
}

/** Pause weekly series — existing matches stay; no new occurrences. */
export async function pauseSeries(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const seriesId = String(formData.get("seriesId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");

  const ctx = await membership(groupId);
  if (!ctx?.admin || !seriesId) return;

  await ctx.supabase
    .from("match_series")
    .update({ paused_at: new Date().toISOString() })
    .eq("id", seriesId)
    .eq("group_id", groupId);

  revalidatePath(`/grupe/${groupId}`);
  if (matchId) revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
}

/** Resume a paused weekly series. */
export async function resumeSeries(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const seriesId = String(formData.get("seriesId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");

  const ctx = await membership(groupId);
  if (!ctx?.admin || !seriesId) return;

  await ctx.supabase
    .from("match_series")
    .update({ paused_at: null })
    .eq("id", seriesId)
    .eq("group_id", groupId);

  revalidatePath(`/grupe/${groupId}`);
  if (matchId) revalidatePath(`/grupe/${groupId}/termin/${matchId}`);
}
