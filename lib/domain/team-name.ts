import type { Team } from "./types";

/** Max length for a team label — live screen is two columns on a narrow phone. */
export const MAX_TEAM_NAME_LENGTH = 14;

/**
 * User-facing team label.
 *
 * Custom name wins when non-empty; otherwise "Ekipa A" / "Ekipa B".
 * Truncates to MAX_TEAM_NAME_LENGTH for safety if a longer value slipped in.
 */
export function teamDisplayName(side: Team, custom: string | null | undefined): string {
  const trimmed = custom?.trim() ?? "";
  if (!trimmed) return side === "A" ? "Ekipa A" : "Ekipa B";
  return trimmed.length > MAX_TEAM_NAME_LENGTH
    ? trimmed.slice(0, MAX_TEAM_NAME_LENGTH)
    : trimmed;
}

/** Normalize form input for storage: empty → null, otherwise trimmed & capped. */
export function normalizeTeamName(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_TEAM_NAME_LENGTH);
}
