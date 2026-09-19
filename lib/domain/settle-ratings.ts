import { computeContributions, type ContributionEvent, type ContributionLineup } from "./contribution";
import { computeElo, INITIAL_RATING, type EloOutput } from "./elo";
import type { Team } from "./types";

export type DualPlayer = {
  userId: string;
  groupRating: number;
  globalRating: number;
};

export type DualEloInput = {
  teamA: DualPlayer[];
  teamB: DualPlayer[];
  scoreA: number;
  scoreB: number;
};

export type SettledRatingUpdate = {
  userId: string;
  ratingBefore: number;
  ratingAfter: number;
};

export type SettledRatingHistoryRow = {
  match_id: string;
  game_id: string;
  user_id: string;
  scope: "group" | "global";
  rating_before: number;
  rating_after: number;
};

export type SettledRatingsInput = {
  lineup: ContributionLineup[];
  events: ContributionEvent[];
  ratings: DualPlayer[];
  scoreA: number;
  scoreB: number;
  matchId: string;
  gameId: string;
};

export type SettledRatings = {
  groupUpdates: SettledRatingUpdate[];
  globalUpdates: SettledRatingUpdate[];
  historyRows: SettledRatingHistoryRow[];
};

export type SettleLineupRow = {
  user_id: string | null;
  team: Team;
  is_goalkeeper: boolean;
};

export type SettleEventRow = {
  type: string;
  team: Team | null;
  scorer_id: string | null;
  assist_id: string | null;
  elapsed_seconds: number;
  deleted_at: string | null;
};

export function toSettleSources(
  lineup: SettleLineupRow[],
  events: SettleEventRow[],
): Pick<SettledRatingsInput, "lineup" | "events"> {
  return {
    lineup: lineup.map((p) => ({
      userId: p.user_id!,
      team: p.team,
      isGoalkeeper: p.is_goalkeeper,
    })),
    events: events.map((e) => ({
      type: e.type as ContributionEvent["type"],
      team: e.team,
      scorerId: e.scorer_id,
      assistId: e.assist_id,
      elapsedSeconds: e.elapsed_seconds,
      deletedAt: e.deleted_at,
    })),
  };
}

/**
 * One match produces two Elo settlements: group (from group ratings) and
 * global (from each player's cross-group rating). Same score, different
 * before-ratings → different deltas. Same K as group rating — multi-group
 * players move faster globally; that is accepted for v1.
 */
export function computeDualElo({
  teamA,
  teamB,
  scoreA,
  scoreB,
}: DualEloInput): { group: EloOutput; global: EloOutput } {
  return {
    group: computeElo({
      teamA: teamA.map((p) => ({ userId: p.userId, rating: p.groupRating })),
      teamB: teamB.map((p) => ({ userId: p.userId, rating: p.groupRating })),
      scoreA,
      scoreB,
    }),
    global: computeElo({
      teamA: teamA.map((p) => ({ userId: p.userId, rating: p.globalRating })),
      teamB: teamB.map((p) => ({ userId: p.userId, rating: p.globalRating })),
      scoreA,
      scoreB,
    }),
  };
}

function applyClampedContribution(
  updates: { userId: string; ratingBefore: number; ratingAfter: number }[],
  contrib: Map<string, { clamped: number }>,
): SettledRatingUpdate[] {
  return updates.map((u) => ({
    userId: u.userId,
    ratingBefore: u.ratingBefore,
    ratingAfter: u.ratingAfter + (contrib.get(u.userId)?.clamped ?? 0),
  }));
}

function historyRowsFor(
  updates: SettledRatingUpdate[],
  scope: SettledRatingHistoryRow["scope"],
  matchId: string,
  gameId: string,
): SettledRatingHistoryRow[] {
  return updates.map((u) => ({
    match_id: matchId,
    game_id: gameId,
    user_id: u.userId,
    scope,
    rating_before: u.ratingBefore,
    rating_after: u.ratingAfter,
  }));
}

/** Dual Elo, contribution, and history rows for one finished game. */
export function computeSettledRatings({
  lineup,
  events,
  ratings,
  scoreA,
  scoreB,
  matchId,
  gameId,
}: SettledRatingsInput): SettledRatings {
  const ratingByUser = new Map(ratings.map((r) => [r.userId, r]));

  const teamPlayers = (side: Team): DualPlayer[] =>
    lineup
      .filter((p) => p.team === side)
      .map((p) => {
        const r = ratingByUser.get(p.userId);
        return {
          userId: p.userId,
          groupRating: r?.groupRating ?? INITIAL_RATING,
          globalRating: r?.globalRating ?? INITIAL_RATING,
        };
      });

  const { group, global } = computeDualElo({
    teamA: teamPlayers("A"),
    teamB: teamPlayers("B"),
    scoreA,
    scoreB,
  });

  const contrib = computeContributions({ lineup, events });
  const groupUpdates = applyClampedContribution(group.updates, contrib);
  const globalUpdates = applyClampedContribution(global.updates, contrib);

  return {
    groupUpdates,
    globalUpdates,
    historyRows: [
      ...historyRowsFor(groupUpdates, "group", matchId, gameId),
      ...historyRowsFor(globalUpdates, "global", matchId, gameId),
    ],
  };
}
