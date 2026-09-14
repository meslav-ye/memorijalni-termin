import type { Team } from "./types";

export const FILLER_NAME_MAX = 40;

/** Trim, collapse spaces; null if empty or too long. */
export function normalizeFillerName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > FILLER_NAME_MAX) return null;
  return name;
}

/** Signup slots after reserving popunjač places. */
export function signupCapacity(capacity: number, fillerCount: number): number {
  return Math.max(0, capacity - fillerCount);
}

/** Headcount for fill status (prijavljeni + popunjači). */
export function matchHeadcount(confirmedSignups: number, fillerCount: number): number {
  return confirmedSignups + fillerCount;
}

export type RegisteredLineupEntry = {
  userId: string;
  team: Team;
  isGoalkeeper: boolean;
};

export function registeredLineupOnly(
  rows: { userId: string | null; team: Team; isGoalkeeper: boolean; isGuest?: boolean }[],
): RegisteredLineupEntry[] {
  return rows
    .filter((p): p is typeof p & { userId: string } => Boolean(p.userId) && !p.isGuest)
    .map((p) => ({
      userId: p.userId,
      team: p.team,
      isGoalkeeper: p.isGoalkeeper,
    }));
}

/** Smaller team first; tie → A. */
export function defaultGuestTeam(countA: number, countB: number): Team {
  return countA <= countB ? "A" : "B";
}
