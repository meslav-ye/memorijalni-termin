/** Everyone starts here. Rating is PER GROUP — same person in two groups has two. */
export const INITIAL_RATING = 1000;

/**
 * Maximum rating shift per match.
 *
 * 24 means a win over an equally strong team yields 12 points. Enough for
 * differences to show over a season, small enough that one bad day does not
 * wreck the picture.
 */
export const K_FACTOR = 24;

export type EloTeam = { userId: string; rating: number }[];

export type EloInput = {
  teamA: EloTeam;
  teamB: EloTeam;
  scoreA: number;
  scoreB: number;
};

export type EloOutput = {
  deltaA: number;
  deltaB: number;
  updates: { userId: string; ratingBefore: number; ratingAfter: number }[];
};

/**
 * Elo by teams.
 *
 * Expected outcome is computed from the AVERAGE of team ratings, not the sum —
 * otherwise a team with more players would automatically look "stronger". The
 * shift is the same for every player on a team and zero-sum: whatever one team
 * gains, the other loses.
 *
 * Goal difference is intentionally NOT used: 6:0 and 6:5 move the same.
 * Recreational scores depend too much on who was in form that day.
 */
export function computeElo({ teamA, teamB, scoreA, scoreB }: EloInput): EloOutput {
  if (teamA.length === 0 || teamB.length === 0) {
    return { deltaA: 0, deltaB: 0, updates: [] };
  }

  const average = (t: EloTeam) => t.reduce((s, p) => s + p.rating, 0) / t.length;

  const ratingA = average(teamA);
  const ratingB = average(teamB);

  // Probability that A wins, per Elo formula.
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

  const actualA = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;

  const deltaA = Math.round(K_FACTOR * (actualA - expectedA));
  // `|| 0` because -deltaA at zero would yield -0, which is not the same as 0.
  const deltaB = -deltaA || 0;

  return {
    deltaA,
    deltaB,
    updates: [
      ...teamA.map((p) => ({
        userId: p.userId,
        ratingBefore: p.rating,
        ratingAfter: p.rating + deltaA,
      })),
      ...teamB.map((p) => ({
        userId: p.userId,
        ratingBefore: p.rating,
        ratingAfter: p.rating + deltaB,
      })),
    ],
  };
}
