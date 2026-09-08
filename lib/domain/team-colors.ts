import type { Team } from "./types";

/**
 * Light team surfaces so nicknames and emoji stay readable, while A/B stay
 * distinct in live lists and summary chronology.
 */
export function teamPanelClass(team: Team | null | undefined): string {
  if (team === "A") return "border-sky-200 bg-sky-50";
  if (team === "B") return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-white";
}

/** Team labels on the dark scoreboard. */
export function teamNameOnDarkClass(team: Team): string {
  return team === "A" ? "text-sky-300" : "text-amber-300";
}

/** Compact heading tint above a team column. */
export function teamHeadingClass(team: Team): string {
  return team === "A" ? "text-sky-800" : "text-amber-900";
}
