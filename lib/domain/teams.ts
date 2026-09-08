import type { PlayerForBalancing, SuggestedTeams } from "./types";

/**
 * Below this many matches played, rating is not calibrated yet — everyone
 * starts at 1000, so "balancing" would be false precision. Until then, split
 * randomly.
 */
export const MIN_MATCHES_FOR_RATING = 5;

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Goalkeeper pair with the smallest rating gap.
 *
 * Those two are separated, not best and worst: the goal is for both teams to
 * have roughly equally good keepers.
 */
function pickGoalkeeperPair(
  keepers: PlayerForBalancing[],
): [PlayerForBalancing, PlayerForBalancing] {
  const sorted = [...keepers].sort((a, b) => b.rating - a.rating);

  let best: [PlayerForBalancing, PlayerForBalancing] = [sorted[0], sorted[1]];
  let smallestGap = Infinity;

  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i].rating - sorted[i + 1].rating;
    if (gap < smallestGap) {
      smallestGap = gap;
      best = [sorted[i], sorted[i + 1]];
    }
  }

  return best;
}

/**
 * Suggest two teams.
 *
 * Decision order:
 *   1. Keepers are split — one per team.
 *   2. Everyone else is assigned: by rating if the group has enough matches
 *      played, otherwise randomly.
 *   3. Always fill the smaller team; on equal size pick the one with the
 *      weaker sum. On a sorted list that yields a snake draft A, B, B, A, A, …
 *      which balances teams well.
 *
 * @param random  Injected for deterministic tests.
 */
export function suggestTeams(
  players: PlayerForBalancing[],
  matchesPlayed: number,
  random: () => number = Math.random,
): SuggestedTeams {
  const teamA: PlayerForBalancing[] = [];
  const teamB: PlayerForBalancing[] = [];
  const warnings: string[] = [];

  const keepers = players.filter((p) => p.isGoalkeeper);
  let others = players.filter((p) => !p.isGoalkeeper);

  if (keepers.length >= 2) {
    const [first, second] = pickGoalkeeperPair(keepers);
    teamA.push(first);
    teamB.push(second);
    // Extra keepers go into the normal pool — they will play outfield.
    others = [...others, ...keepers.filter((g) => g !== first && g !== second)];
  } else if (keepers.length === 1) {
    const toTeamA = random() < 0.5;
    (toTeamA ? teamA : teamB).push(keepers[0]);
    warnings.push(`Ekipa ${toTeamA ? "B" : "A"} nema golmana.`);
  } else {
    warnings.push("Nijedna ekipa nema golmana.");
  }

  const order =
    matchesPlayed >= MIN_MATCHES_FOR_RATING
      ? [...others].sort((a, b) => b.rating - a.rating)
      : shuffle(others, random);

  const sum = (t: PlayerForBalancing[]) => t.reduce((s, p) => s + p.rating, 0);

  for (const player of order) {
    if (teamA.length < teamB.length) teamA.push(player);
    else if (teamB.length < teamA.length) teamB.push(player);
    else if (sum(teamA) <= sum(teamB)) teamA.push(player);
    else teamB.push(player);
  }

  return { teamA, teamB, warnings };
}
