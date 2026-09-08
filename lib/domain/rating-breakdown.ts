import type { ContributionRow } from "./contribution";

const fmtSigned = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * Short Croatian hint for individual contribution, e.g. "+4 (2G, 1A)".
 * Omits empty G/A/AG parts; still shows the signed clamped total.
 */
export function formatContributionDetail(row: ContributionRow): string {
  const bits: string[] = [];
  if (row.goals > 0) bits.push(`${row.goals}G`);
  if (row.assists > 0) bits.push(`${row.assists}A`);
  if (row.ownGoals > 0) bits.push(`${row.ownGoals}AG`);
  const detail = bits.length > 0 ? ` (${bits.join(", ")})` : "";
  return `${fmtSigned(row.clamped)}${detail}`;
}

/**
 * One-line breakdown for a player's game: "Elo +12 · doprinos +4 (2G, 1A)".
 */
export function formatRatingBreakdown(eloDelta: number, contrib: ContributionRow): string {
  return `Elo ${fmtSigned(eloDelta)} · doprinos ${formatContributionDetail(contrib)}`;
}
