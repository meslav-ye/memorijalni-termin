import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateStats, aggregateAttendance } from "@/lib/domain/stats";
import { aggregateKeeperStats } from "@/lib/domain/keepers";
import {
  bestGoalsAssistsInSingleGame,
  bestGoalsInSingleGame,
  fewestGoalsAgainstInSingleGame,
} from "@/lib/domain/records";
import { formatShortDate } from "@/lib/format";
import { isMember } from "@/lib/data/user";
import type { MatchForStats, PlayerStats, Team } from "@/lib/domain/types";

/** Cache tag per group — invalidated when a match finishes. */
export const leaderboardTag = (groupId: string) => `leaderboard-${groupId}`;

export type LeaderboardRow = PlayerStats & {
  nickname: string;
  isGoalkeeper: boolean;
  rating: number;
  attendanceRate: number;
  /** Finished sessions (termini) this player appeared in any game lineup. */
  sessionsAttended: number;
  currentStreak: number;
  longestStreak: number;
  goalsAgainst: number;
  cleanSheets: number;
  matchesAsKeeper: number;
};

export type StatRecord = { title: string; value: string; who: string };

export type LeaderboardData = {
  rows: LeaderboardRow[];
  seasons: { id: string; name: string }[];
  /** Finished games (utakmice). */
  matchesPlayed: number;
  /** Finished sessions (termini). */
  sessionsPlayed: number;
  records: StatRecord[];
};

/**
 * Everything for the "Ljestvica" and "Statistika" tabs.
 *
 * Access control is checked here, not inside the computation. The computation
 * uses the service-role key (bypasses RLS) because the result is cached and
 * shared across all group members — everyone sees the same leaderboard. If
 * the computation used the user client, it could not be cached: the cache
 * must not read cookies.
 *
 * @param seasonId season id, or null for "all time"
 */
export async function getLeaderboard(
  groupId: string,
  seasonId: string | null,
): Promise<LeaderboardData> {
  if (!(await isMember(groupId))) notFound();

  return cachedLeaderboard(groupId, seasonId);
}

/**
 * Cached computation.
 *
 * Uses `unstable_cache` rather than the newer `use cache` directive, because
 * that requires enabling `cacheComponents: true` — which changes cache
 * semantics for the WHOLE app. Too large a change for a gain that is not
 * urgent here.
 *
 * TTL is 5 minutes as a safety net; real refresh goes through the tag when
 * a match finishes or membership changes.
 */
function cachedLeaderboard(groupId: string, seasonId: string | null) {
  return unstable_cache(
    () => computeLeaderboard(groupId, seasonId),
    ["leaderboard", "v7-records-dates", groupId, seasonId ?? "all"],
    { tags: [leaderboardTag(groupId)], revalidate: 300 },
  )();
}

async function computeLeaderboard(
  groupId: string,
  seasonId: string | null,
): Promise<LeaderboardData> {
  const supabase = createAdminClient();

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("group_id", groupId)
    .order("name", { ascending: false });

  // Members are always fetched, regardless of matches. The leaderboard thus
  // shows who is in the group from day one, all zeros, instead of an empty
  // state — you immediately see what will fill in.
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("status", "active");

  const memberIds = (members ?? []).map((c) => c.user_id);

  let query = supabase
    .from("matches")
    .select("id, starts_at")
    .eq("group_id", groupId)
    .eq("status", "zavrsen")
    .order("starts_at", { ascending: true });

  if (seasonId) query = query.eq("season_id", seasonId);

  const { data: matches } = await query;
  const allMatches = matches ?? [];

  if (allMatches.length === 0) {
    return {
      rows: await emptyLeaderboard(groupId, memberIds),
      seasons: (seasons ?? []).map((s) => ({ id: s.id, name: s.name })),
      matchesPlayed: 0,
      sessionsPlayed: 0,
      records: [],
    };
  }

  const matchIds = allMatches.map((t) => t.id);
  const startsByMatch = new Map(allMatches.map((t) => [t.id, t.starts_at]));

  const { data: finishedGames } = await supabase
    .from("games")
    .select("id, match_id, score_a, score_b, seq, started_at")
    .in("match_id", matchIds)
    .eq("status", "zavrsena")
    .order("seq", { ascending: true });

  const allGames = finishedGames ?? [];

  if (allGames.length === 0) {
    return {
      rows: await emptyLeaderboard(groupId, memberIds),
      seasons: (seasons ?? []).map((s) => ({ id: s.id, name: s.name })),
      matchesPlayed: 0,
      sessionsPlayed: allMatches.length,
      records: [],
    };
  }

  const gameIds = allGames.map((g) => g.id);

  const [{ data: lineups }, { data: events }, { data: ratings }] = await Promise.all([
    supabase
      .from("match_lineup")
      .select("game_id, match_id, user_id, team, is_goalkeeper")
      .in("game_id", gameIds),
    supabase
      .from("match_events")
      .select("game_id, type, scorer_id, assist_id, team, elapsed_seconds, deleted_at")
      .in("game_id", gameIds)
      .in("type", ["goal", "own_goal", "keeper_change"]),
    supabase.from("player_ratings").select("user_id, rating").eq("group_id", groupId),
  ]);

  const forStats: MatchForStats[] = allGames.map((g) => ({
    matchId: g.match_id,
    gameId: g.id,
    scoreA: g.score_a,
    scoreB: g.score_b,
    startsAt: startsByMatch.get(g.match_id) ?? g.started_at ?? undefined,
    lineup: (lineups ?? [])
      .filter((p) => p.game_id === g.id)
      .map((p) => ({
        userId: p.user_id,
        team: p.team as Team,
        isGoalkeeper: p.is_goalkeeper,
      })),
    events: (events ?? [])
      .filter((e) => e.game_id === g.id)
      .map((e) => ({
        type: e.type as "goal" | "own_goal" | "keeper_change",
        scorerId: e.scorer_id,
        assistId: e.assist_id,
        team: (e.team as Team | null) ?? null,
        elapsedSeconds: e.elapsed_seconds,
        deletedAt: e.deleted_at,
      })),
  }));

  const stats = aggregateStats(forStats);

  // Profile keepers must be known before aggregating — outfield stand-ins
  // (glove toggled mid-match when a team has no keeper) must not enter
  // goals-against leaderboards.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, is_goalkeeper")
    .in("id", memberIds.length ? memberIds : ["-"]);

  const profileKeeperIds = new Set(
    (profiles ?? []).filter((p) => p.is_goalkeeper).map((p) => p.id),
  );

  const keeperStats = aggregateKeeperStats(forStats, profileKeeperIds);
  const keeperById = new Map(keeperStats.map((k) => [k.userId, k]));
  const players = stats.map((s) => s.userId);

  // Attendance is per termin: anyone in any game's lineup for that session.
  const lineupBySession = new Map<string, Set<string>>();
  for (const t of allMatches) {
    lineupBySession.set(t.id, new Set());
  }
  for (const p of lineups ?? []) {
    const set = lineupBySession.get(p.match_id);
    if (set) set.add(p.user_id);
  }

  const attendance = aggregateAttendance(matchIds, lineupBySession, players);

  // Profiles for anyone who appeared in stats but is no longer a member
  // (edge case) — refill gaps without a second full fetch when possible.
  const missingIds = players.filter((id) => !(profiles ?? []).some((p) => p.id === id));
  let allProfiles = profiles ?? [];
  if (missingIds.length > 0) {
    const { data: extra } = await supabase
      .from("profiles")
      .select("id, nickname, is_goalkeeper")
      .in("id", missingIds);
    allProfiles = [...allProfiles, ...(extra ?? [])];
  }

  const rows: LeaderboardRow[] = stats.map((s) => {
    const d = attendance.find((x) => x.userId === s.userId);
    const p = allProfiles.find((x) => x.id === s.userId);
    const k = keeperById.get(s.userId);

    return {
      ...s,
      nickname: p?.nickname || "(bez nadimka)",
      isGoalkeeper: p?.is_goalkeeper ?? false,
      rating: ratings?.find((r) => r.user_id === s.userId)?.rating ?? 1000,
      attendanceRate: d?.rate ?? 0,
      sessionsAttended: d?.played ?? 0,
      currentStreak: d?.currentStreak ?? 0,
      longestStreak: d?.longestStreak ?? 0,
      goalsAgainst: k?.goalsAgainst ?? 0,
      cleanSheets: k?.cleanSheets ?? 0,
      matchesAsKeeper: k?.matchesAsKeeper ?? 0,
    };
  });

  // Only players who appeared in a finished game. Members with 0 U stay off
  // the board once games exist (empty state still uses emptyLeaderboard).
  const allRows = [...rows].sort(
    (a, b) =>
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.rating - a.rating ||
      b.matches - a.matches ||
      a.nickname.localeCompare(b.nickname, "hr"),
  );

  return {
    rows: allRows,
    seasons: (seasons ?? []).map((s) => ({ id: s.id, name: s.name })),
    matchesPlayed: allGames.length,
    sessionsPlayed: allMatches.length,
    records: computeRecords(forStats, rows),
  };
}

/**
 * Leaderboard row for a player who has not played any match yet.
 * All zeros; rating as stored (default 1000).
 */
function emptyRow(
  userId: string,
  nickname: string,
  isGoalkeeper: boolean,
  rating: number,
): LeaderboardRow {
  return {
    userId,
    nickname,
    isGoalkeeper,
    rating,
    goals: 0,
    assists: 0,
    ownGoals: 0,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsPerMatch: 0,
    winRate: 0,
    attendanceRate: 0,
    sessionsAttended: 0,
    currentStreak: 0,
    longestStreak: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
    matchesAsKeeper: 0,
  };
}

/**
 * Leaderboard before any match has been played: all group members at zero.
 *
 * Exists because an empty screen says nothing. This way, from day one you see
 * who is in the group, that everyone starts at 1000, and which columns are tracked.
 */
async function emptyLeaderboard(
  groupId: string,
  memberIds: string[],
): Promise<LeaderboardRow[]> {
  if (memberIds.length === 0) return [];

  // Same reason as in the main computation: this runs inside the cache, where
  // cookies must not be read.
  const supabase = createAdminClient();

  const [{ data: profiles }, { data: ratings }] = await Promise.all([
    supabase.from("profiles").select("id, nickname, is_goalkeeper").in("id", memberIds),
    supabase
      .from("player_ratings")
      .select("user_id, rating")
      .eq("group_id", groupId)
      .in("user_id", memberIds),
  ]);

  return memberIds
    .map((id) =>
      emptyRow(
        id,
        profiles?.find((p) => p.id === id)?.nickname || "(bez nadimka)",
        profiles?.find((p) => p.id === id)?.is_goalkeeper ?? false,
        ratings?.find((r) => r.user_id === id)?.rating ?? 1000,
      ),
    )
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "hr"));
}

function computeRecords(
  matches: MatchForStats[],
  rows: LeaderboardRow[],
): StatRecord[] {
  const records: StatRecord[] = [];
  const nickname = (id: string) => rows.find((r) => r.userId === id)?.nickname ?? "?";
  const whoWithDate = (userId: string, startsAt: string | null) => {
    const date = startsAt ? formatShortDate(startsAt) : "—";
    return `${nickname(userId)} · ${date}`;
  };

  const bestGoals = bestGoalsInSingleGame(matches);
  if (bestGoals) {
    records.push({
      title: "Najviše golova na utakmici",
      value: String(bestGoals.value),
      who: whoWithDate(bestGoals.userId, bestGoals.startsAt),
    });
  }

  const bestGa = bestGoalsAssistsInSingleGame(matches);
  if (bestGa) {
    records.push({
      title: "Najviše G+A",
      value: String(bestGa.value),
      who: whoWithDate(bestGa.userId, bestGa.startsAt),
    });
  }

  const fewestGa = fewestGoalsAgainstInSingleGame(matches);
  if (fewestGa) {
    records.push({
      title: "Najmanje primljenih na utakmici",
      value: String(fewestGa.value),
      who: whoWithDate(fewestGa.userId, fewestGa.startsAt),
    });
  }

  // Largest win by goal difference.
  //
  // This record is tied to the GAME, not a player, so `who` is the session date.
  // Previously it was left empty, and the card treats empty `who` as "no record" —
  // so a real result showed greyed out next to "jos nitko".
  const largest = matches.reduce(
    (best, t) => {
      const diff = Math.abs(t.scoreA - t.scoreB);
      return diff > best.diff
        ? {
            diff,
            score: `${Math.max(t.scoreA, t.scoreB)}:${Math.min(t.scoreA, t.scoreB)}`,
            when: t.startsAt ?? "",
          }
        : best;
    },
    { diff: 0, score: "", when: "" },
  );
  if (largest.diff > 0) {
    records.push({
      title: "Najveća pobjeda",
      value: largest.score,
      who: largest.when ? formatShortDate(largest.when) : "—",
    });
  }

  // A streak of one session is still a streak. The threshold used to be `> 1`,
  // so after the first played match nobody was shown.
  const longestStreak = rows.reduce(
    (best, r) => (best && r.longestStreak > best.longestStreak ? r : (best ?? r)),
    rows[0] as LeaderboardRow | undefined,
  );
  if (longestStreak && longestStreak.longestStreak > 0) {
    records.push({
      title: "Najviše termina zaredom",
      value: String(longestStreak.longestStreak),
      who: longestStreak.nickname,
    });
  }

  // "Najbolji strijelac" is NOT added here. It already appears among Leaders,
  // computed as the max by goals; here it used to read `rows[0]` — an unsorted
  // array, so a random player showed up. Two cards with the same title and
  // different numbers made stats look broken.

  return records;
}
