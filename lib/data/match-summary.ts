import { cache } from "react";
import { unstable_cache, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { inUuids } from "@/lib/supabase/in-filter";
import { isMember } from "@/lib/data/user";
import { matchShareText } from "@/lib/domain/match-summary-text";
import { computeContributions } from "@/lib/domain/contribution";
import { ratingBreakdownLines, type RatingBreakdownLine } from "@/lib/domain/rating-breakdown";
import { teamDisplayName } from "@/lib/domain/team-name";
import type { Team } from "@/lib/domain/types";

/** Cache tag per finished match — busted on description, activity, assists, finish. */
export const matchSummaryTag = (matchId: string) => `match-summary-${matchId}`;

export function invalidateMatchSummary(matchId: string) {
  updateTag(matchSummaryTag(matchId));
}

export type SummaryActivity = {
  distanceKm: number | null;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
};

export type SummaryPlayer = {
  lineupId: string;
  nickname: string;
  isGuest: boolean;
  team: Team;
  goals: number;
  assists: number;
  ownGoals: number;
  delta: number | null;
  breakdown: RatingBreakdownLine[] | null;
};

export type SummaryGoal = {
  id: string;
  type: "goal" | "own_goal";
  team: Team | null;
  scorerId: string | null;
  scorerFillerId: string | null;
  assistId: string | null;
  assistFillerId: string | null;
  elapsedSeconds: number;
};

export type SummaryChronologyLineup = {
  userId: string | null;
  fillerId: string | null;
  nickname: string;
  team: Team;
  isGuest: boolean;
};

export type SummaryGameBlock = {
  game: {
    id: string;
    seq: number;
    score_a: number;
    score_b: number;
    started_at: string | null;
    ended_at: string | null;
    total_paused_seconds: number;
    team_a_name: string | null;
    team_b_name: string | null;
  };
  players: SummaryPlayer[];
  goals: SummaryGoal[];
  winner: Team | null;
  duration: number | null;
  labelA: string;
  labelB: string;
  scorers: string;
  chronologyLineup: SummaryChronologyLineup[];
};

export type MatchSummary = {
  match: {
    id: string;
    startsAt: string;
    description: string | null;
    location: string;
  };
  allUserIds: string[];
  nicknameMap: Record<string, string>;
  fillerNameMap: Record<string, string>;
  activityByUser: Record<string, SummaryActivity>;
  activityPlayers: Array<{ userId: string; nickname: string } & SummaryActivity>;
  gameBlocks: SummaryGameBlock[];
  shareText: string;
};

export type MatchSummaryResult =
  | { kind: "missing" }
  | { kind: "not_finished" }
  | { kind: "ok"; data: MatchSummary };

/**
 * Finished-match sažetak, fetched at most once per request and shared across
 * members between requests. Membership is checked outside the cache; the
 * cached load uses the service-role key so it does not read cookies.
 *
 * User-specific bits (admin, "my activity", assist-edit window) stay on the page.
 */
export const getMatchSummary = cache(
  async (groupId: string, matchId: string): Promise<MatchSummaryResult> => {
    if (!(await isMember(groupId))) return { kind: "missing" };
    return cachedMatchSummary(groupId, matchId);
  },
);

function cachedMatchSummary(groupId: string, matchId: string) {
  return unstable_cache(
    () => loadMatchSummary(groupId, matchId),
    ["match-summary", "v1", groupId, matchId],
    { tags: [matchSummaryTag(matchId)], revalidate: 3600 },
  )();
}

function nestedLocationName(
  loc: { name: string } | { name: string }[] | null | undefined,
): string | null {
  if (!loc) return null;
  return Array.isArray(loc) ? (loc[0]?.name ?? null) : loc.name;
}

async function loadMatchSummary(
  groupId: string,
  matchId: string,
): Promise<MatchSummaryResult> {
  const supabase = createAdminClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, status, starts_at, location_text, description, locations(name)")
    .eq("id", matchId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (!match) return { kind: "missing" };
  if (match.status !== "zavrsen") return { kind: "not_finished" };

  const { data: games } = await supabase
    .from("games")
    .select(
      "id, seq, score_a, score_b, started_at, ended_at, total_paused_seconds, team_a_name, team_b_name",
    )
    .eq("match_id", matchId)
    .eq("status", "zavrsena")
    .order("seq", { ascending: true });

  const finished = games ?? [];
  const gameIds = finished.map((g) => g.id);

  const [{ data: lineup }, { data: events }, { data: history }] = await Promise.all([
    supabase
      .from("match_lineup")
      .select("game_id, id, user_id, filler_id, team, is_goalkeeper, display_name, is_guest")
      .in("game_id", inUuids(gameIds)),
    supabase
      .from("match_events")
      .select(
        "id, game_id, type, team, scorer_id, scorer_filler_id, assist_id, assist_filler_id, elapsed_seconds, deleted_at",
      )
      .in("game_id", inUuids(gameIds))
      .is("deleted_at", null)
      .in("type", ["goal", "own_goal", "keeper_change"])
      .order("elapsed_seconds"),
    supabase
      .from("rating_history")
      .select("game_id, user_id, rating_before, rating_after")
      .in("game_id", inUuids(gameIds))
      .eq("scope", "group"),
  ]);

  const allUserIds = [
    ...new Set(
      (lineup ?? []).map((p) => p.user_id).filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: profiles }, { data: activities }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", inUuids(allUserIds)),
    supabase
      .from("match_activity")
      .select("user_id, distance_km, max_speed_kmh, avg_speed_kmh")
      .eq("match_id", matchId),
  ]);

  const nicknameOf = (id: string | null) =>
    profiles?.find((p) => p.id === id)?.nickname || "?";

  const nicknameMap: Record<string, string> = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.nickname || "?"]),
  );

  const fillerNameMap: Record<string, string> = Object.fromEntries(
    (lineup ?? [])
      .filter((p) => p.is_guest && p.filler_id)
      .map((p) => [p.filler_id!, p.display_name ?? "Gost"]),
  );

  const activityByUser: Record<string, SummaryActivity> = {};
  for (const a of activities ?? []) {
    activityByUser[a.user_id] = {
      distanceKm: a.distance_km === null ? null : Number(a.distance_km),
      maxSpeedKmh: a.max_speed_kmh === null ? null : Number(a.max_speed_kmh),
      avgSpeedKmh: a.avg_speed_kmh === null ? null : Number(a.avg_speed_kmh),
    };
  }

  const activityPlayers = allUserIds
    .map((userId) => {
      const row = activityByUser[userId];
      return {
        userId,
        nickname: nicknameOf(userId),
        distanceKm: row?.distanceKm ?? null,
        maxSpeedKmh: row?.maxSpeedKmh ?? null,
        avgSpeedKmh: row?.avgSpeedKmh ?? null,
      };
    })
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "hr"));

  const location =
    nestedLocationName(match.locations) ?? match.location_text ?? "";

  const gameBlocks: SummaryGameBlock[] = finished.map((game) => {
    const gameLineup = (lineup ?? []).filter((p) => p.game_id === game.id);
    const gameEvents = (events ?? []).filter((e) => e.game_id === game.id);
    const goals = gameEvents.filter((e) => e.type === "goal" || e.type === "own_goal");
    const gameHistory = (history ?? []).filter((h) => h.game_id === game.id);

    const registeredLineup = gameLineup.filter((p) => p.user_id && !p.is_guest);
    const contrib = computeContributions({
      lineup: registeredLineup.map((p) => ({
        userId: p.user_id!,
        team: p.team as Team,
        isGoalkeeper: p.is_goalkeeper,
      })),
      events: gameEvents.map((e) => ({
        type: e.type as "goal" | "own_goal" | "keeper_change",
        team: e.team as Team | null,
        scorerId: e.scorer_id,
        assistId: e.assist_id,
        elapsedSeconds: e.elapsed_seconds,
        deletedAt: e.deleted_at,
      })),
    });

    const players: SummaryPlayer[] = gameLineup.map((p) => {
      if (p.is_guest || !p.user_id) {
        const fillerId = p.filler_id;
        return {
          lineupId: p.id,
          nickname: p.display_name ?? "Gost",
          isGuest: true,
          team: p.team as Team,
          goals: goals.filter(
            (e) => e.type === "goal" && e.scorer_filler_id === fillerId,
          ).length,
          assists: goals.filter((e) => e.assist_filler_id === fillerId).length,
          ownGoals: goals.filter(
            (e) => e.type === "own_goal" && e.scorer_filler_id === fillerId,
          ).length,
          delta: null,
          breakdown: null,
        };
      }
      const record = gameHistory.find((r) => r.user_id === p.user_id);
      const delta = record ? record.rating_after - record.rating_before : null;
      const row = contrib.get(p.user_id);
      const contribution = row?.clamped ?? 0;
      const eloDelta = delta !== null ? delta - contribution : null;
      const breakdown =
        delta !== null && eloDelta !== null && row
          ? ratingBreakdownLines({ eloDelta, contrib: row, delta })
          : null;
      return {
        lineupId: p.id,
        nickname: nicknameOf(p.user_id),
        isGuest: false,
        team: p.team as Team,
        goals: goals.filter((e) => e.type === "goal" && e.scorer_id === p.user_id).length,
        assists: goals.filter((e) => e.assist_id === p.user_id).length,
        ownGoals: goals.filter((e) => e.type === "own_goal" && e.scorer_id === p.user_id).length,
        delta,
        breakdown,
      };
    });

    const winner: Team | null =
      game.score_a > game.score_b ? "A" : game.score_b > game.score_a ? "B" : null;

    const duration =
      game.started_at && game.ended_at
        ? Math.max(
            0,
            Math.floor(
              (new Date(game.ended_at).getTime() - new Date(game.started_at).getTime()) / 1000,
            ) - game.total_paused_seconds,
          )
        : null;

    const labelA = teamDisplayName("A", game.team_a_name);
    const labelB = teamDisplayName("B", game.team_b_name);

    const scorers = players
      .filter((i) => i.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .map((i) => `${i.nickname} ${i.goals}`)
      .join(", ");

    const summaryGoals: SummaryGoal[] = goals.map((e) => ({
      id: e.id,
      type: e.type as "goal" | "own_goal",
      team: e.team as Team | null,
      scorerId: e.scorer_id,
      scorerFillerId: e.scorer_filler_id,
      assistId: e.assist_id,
      assistFillerId: e.assist_filler_id,
      elapsedSeconds: e.elapsed_seconds,
    }));

    const chronologyLineup: SummaryChronologyLineup[] = gameLineup.map((p) => ({
      userId: p.user_id,
      fillerId: p.filler_id,
      nickname: p.is_guest ? (p.display_name ?? "Gost") : nicknameOf(p.user_id),
      team: p.team as Team,
      isGuest: p.is_guest,
    }));

    return {
      game,
      players,
      goals: summaryGoals,
      winner,
      duration,
      labelA,
      labelB,
      scorers,
      chronologyLineup,
    };
  });

  const shareText = matchShareText(
    match.starts_at,
    location,
    gameBlocks.map((b) => ({
      seq: b.game.seq,
      labelA: b.labelA,
      labelB: b.labelB,
      scoreA: b.game.score_a,
      scoreB: b.game.score_b,
      scorers: b.scorers,
    })),
  );

  return {
    kind: "ok",
    data: {
      match: {
        id: match.id,
        startsAt: match.starts_at,
        description: match.description,
        location,
      },
      allUserIds,
      nicknameMap,
      fillerNameMap,
      activityByUser,
      activityPlayers,
      gameBlocks,
      shareText,
    },
  };
}
