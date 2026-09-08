import { computeElo, type EloOutput } from "./elo";

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
