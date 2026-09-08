/**
 * Lineup glove rules.
 *
 * Profile flag ("Igram golmana") is the only way to become the marked
 * goalkeeper for a game. Live 🧤 used to allow any teammate — that let an
 * outfield tap (e.g. Jozo) steal the role mid-match from the real keeper
 * (Zdravko) and mis-attribute conceded goals.
 *
 * After the clock starts (`started_at` set), the glove is frozen for that game.
 */

export function canAssignLineupGoalkeeper(profileIsGoalkeeper: boolean): boolean {
  return profileIsGoalkeeper;
}

/** Goalkeeper may only be chosen before the game clock starts. */
export function canChangeLineupGoalkeeper(gameStartedAt: string | null): boolean {
  return gameStartedAt == null;
}

type TeamPlayer = { userId: string; isGoalkeeper: boolean };

/**
 * At most one lineup goalkeeper per team: the first profile keeper in team
 * order (`suggestTeams` puts designated keepers first). Outfield players
 * never receive the flag, even at index 0.
 */
export function assignLineupGoalkeeperFlags<T extends TeamPlayer>(
  team: T[],
): { userId: string; lineupIsGoalkeeper: boolean }[] {
  const designatedId = team.find((p) => p.isGoalkeeper)?.userId ?? null;
  return team.map((p) => ({
    userId: p.userId,
    lineupIsGoalkeeper: designatedId !== null && p.userId === designatedId,
  }));
}
