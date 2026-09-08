import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateStats, aggregateAttendance } from "@/lib/domain/stats";
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
  currentStreak: number;
  longestStreak: number;
};

export type StatRecord = { title: string; value: string; who: string };

export type LeaderboardData = {
  rows: LeaderboardRow[];
  seasons: { id: string; name: string }[];
  matchesPlayed: number;
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
    ["leaderboard", groupId, seasonId ?? "all"],
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
    .select("id, score_a, score_b, starts_at")
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
      records: [],
    };
  }

  const matchIds = allMatches.map((t) => t.id);

  const [{ data: lineups }, { data: events }, { data: ratings }] = await Promise.all([
    supabase.from("match_lineup").select("match_id, user_id, team").in("match_id", matchIds),
    supabase
      .from("match_events")
      .select("match_id, type, scorer_id, assist_id, deleted_at")
      .in("match_id", matchIds)
      .in("type", ["goal", "own_goal"]),
    supabase.from("player_ratings").select("user_id, rating").eq("group_id", groupId),
  ]);

  const forStats: MatchForStats[] = allMatches.map((t) => ({
    matchId: t.id,
    scoreA: t.score_a,
    scoreB: t.score_b,
    startsAt: t.starts_at,
    lineup: (lineups ?? [])
      .filter((p) => p.match_id === t.id)
      .map((p) => ({ userId: p.user_id, team: p.team as Team })),
    events: (events ?? [])
      .filter((e) => e.match_id === t.id)
      .map((e) => ({
        type: e.type as "goal" | "own_goal",
        scorerId: e.scorer_id,
        assistId: e.assist_id,
        deletedAt: e.deleted_at,
      })),
  }));

  const stats = aggregateStats(forStats);
  const players = stats.map((s) => s.userId);

  const lineupByMatch = new Map<string, Set<string>>();
  for (const t of allMatches) {
    lineupByMatch.set(
      t.id,
      new Set((lineups ?? []).filter((p) => p.match_id === t.id).map((p) => p.user_id)),
    );
  }

  const attendance = aggregateAttendance(matchIds, lineupByMatch, players);

  // Members who have not played any match yet do not appear in stats, but
  // must be on the leaderboard — otherwise newcomers "vanish" until they play.
  const allForDisplay = [...new Set([...players, ...memberIds])];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, is_goalkeeper")
    .in("id", allForDisplay.length ? allForDisplay : ["-"]);

  const rows: LeaderboardRow[] = stats.map((s) => {
    const d = attendance.find((x) => x.userId === s.userId);
    const p = profiles?.find((x) => x.id === s.userId);

    return {
      ...s,
      nickname: p?.nickname || "(bez nadimka)",
      isGoalkeeper: p?.is_goalkeeper ?? false,
      rating: ratings?.find((r) => r.user_id === s.userId)?.rating ?? 1000,
      attendanceRate: d?.rate ?? 0,
      currentStreak: d?.currentStreak ?? 0,
      longestStreak: d?.longestStreak ?? 0,
    };
  });

  const withoutPlayed = memberIds
    .filter((id) => !players.includes(id))
    .map((id) =>
      emptyRow(
        id,
        profiles?.find((p) => p.id === id)?.nickname || "(bez nadimka)",
        profiles?.find((p) => p.id === id)?.is_goalkeeper ?? false,
        ratings?.find((r) => r.user_id === id)?.rating ?? 1000,
      ),
    );

  const allRows = [...rows, ...withoutPlayed].sort(
    (a, b) =>
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.matches - a.matches ||
      a.nickname.localeCompare(b.nickname, "hr"),
  );

  return {
    rows: allRows,
    seasons: (seasons ?? []).map((s) => ({ id: s.id, name: s.name })),
    matchesPlayed: allMatches.length,
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
    currentStreak: 0,
    longestStreak: 0,
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

  // Most goals by one player in a single match.
  let bestMatch = { goals: 0, who: "" };
  for (const t of matches) {
    const counts = new Map<string, number>();
    for (const e of t.events) {
      if (e.type !== "goal" || e.deletedAt !== null || !e.scorerId) continue;
      counts.set(e.scorerId, (counts.get(e.scorerId) ?? 0) + 1);
    }
    for (const [id, n] of counts) {
      if (n > bestMatch.goals) bestMatch = { goals: n, who: nickname(id) };
    }
  }
  if (bestMatch.goals > 0) {
    records.push({
      title: "Najviše golova na terminu",
      value: String(bestMatch.goals),
      who: bestMatch.who,
    });
  }

  // Largest win by goal difference.
  //
  // This record is tied to the MATCH, not a player, so `who` is the match date.
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

  // A streak of one match is still a streak. The threshold used to be `> 1`,
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
