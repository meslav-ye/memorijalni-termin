import type { Team } from "./types";

const FILLER_NAME_MAX = 40;

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

/** Smaller team first; tie → A. */
export function defaultGuestTeam(countA: number, countB: number): Team {
  return countA <= countB ? "A" : "B";
}
