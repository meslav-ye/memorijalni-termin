/**
 * Client-side sort keys for the leaderboard table.
 * Pure helpers — safe to unit-test without React.
 */

export type SortKey =
  | "nickname"
  | "goals"
  | "assists"
  | "ownGoals"
  | "matches"
  | "goalsPerMatch"
  | "record"
  | "winRate"
  | "rating";

export type SortDir = "asc" | "desc";

export type SortableLeaderboardRow = {
  userId: string;
  nickname: string;
  goals: number;
  assists: number;
  ownGoals: number;
  matches: number;
  goalsPerMatch: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  rating: number;
};

/** Default board order (same as server): rating first. */
export function defaultLeaderboardOrder<T extends SortableLeaderboardRow>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) =>
      b.rating - a.rating ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.matches - a.matches ||
      a.nickname.localeCompare(b.nickname, "hr"),
  );
}

function cmpNickname(a: SortableLeaderboardRow, b: SortableLeaderboardRow): number {
  return a.nickname.localeCompare(b.nickname, "hr");
}

function cmpRecord(a: SortableLeaderboardRow, b: SortableLeaderboardRow): number {
  return a.wins - b.wins || a.draws - b.draws || a.losses - b.losses;
}

function cmpKey(
  a: SortableLeaderboardRow,
  b: SortableLeaderboardRow,
  key: SortKey,
): number {
  switch (key) {
    case "nickname":
      return cmpNickname(a, b);
    case "goals":
      return a.goals - b.goals;
    case "assists":
      return a.assists - b.assists;
    case "ownGoals":
      return a.ownGoals - b.ownGoals;
    case "matches":
      return a.matches - b.matches;
    case "goalsPerMatch":
      return a.goalsPerMatch - b.goalsPerMatch;
    case "record":
      return cmpRecord(a, b);
    case "winRate":
      return a.winRate - b.winRate;
    case "rating":
      return a.rating - b.rating;
  }
}

/**
 * Sort rows by column. Direction applies to the primary key;
 * nickname ascending is the tie-breaker (except when sorting by nickname).
 */
export function sortLeaderboardRows<T extends SortableLeaderboardRow>(
  rows: T[],
  key: SortKey,
  dir: SortDir,
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = cmpKey(a, b, key);
    if (primary !== 0) return primary * sign;
    if (key === "nickname") return 0;
    return cmpNickname(a, b);
  });
}

/** First click on a column → desc; click again → flip. */
export function nextSortState(
  currentKey: SortKey | null,
  currentDir: SortDir,
  clicked: SortKey,
): { key: SortKey; dir: SortDir } {
  if (currentKey === clicked) {
    return { key: clicked, dir: currentDir === "desc" ? "asc" : "desc" };
  }
  return { key: clicked, dir: "desc" };
}
