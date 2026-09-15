import type { ContributionRow } from "./contribution";

const fmtSigned = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * Short Croatian hint for individual contribution, e.g. "+4 (2G, 1A)".
 * Omits empty G/A/AG parts; still shows the signed clamped total.
 */
function formatContributionDetail(row: ContributionRow): string {
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

export type RatingBreakdownLine = {
  label: string;
  points: number;
};

/**
 * Ordered lines for sažetak expand: Elo, non-zero components, optional clamp, Ukupno.
 */
export function ratingBreakdownLines({
  eloDelta,
  contrib,
  delta,
}: {
  eloDelta: number;
  contrib: ContributionRow;
  delta: number;
}): RatingBreakdownLine[] {
  const lines: RatingBreakdownLine[] = [{ label: "Timski Elo", points: eloDelta }];

  if (contrib.goalPoints !== 0) {
    lines.push({ label: `Golovi (${contrib.goals})`, points: contrib.goalPoints });
  }
  if (contrib.assistPoints !== 0) {
    lines.push({
      label: `Asistencije (${contrib.assists})`,
      points: contrib.assistPoints,
    });
  }
  if (contrib.ownGoalPoints !== 0) {
    lines.push({
      label: `Autogolovi (${contrib.ownGoals})`,
      points: contrib.ownGoalPoints,
    });
  }
  if (contrib.keeperPoints !== 0) {
    lines.push({
      label: `Golman (primljeno ${contrib.conceded})`,
      points: contrib.keeperPoints,
    });
  }
  if (contrib.teamConcededPoints !== 0) {
    lines.push({ label: "Obrana ekipe", points: contrib.teamConcededPoints });
  }

  const clampDelta = contrib.clamped - contrib.raw;
  if (clampDelta !== 0) {
    lines.push({ label: "Ograničenje ±12", points: clampDelta });
  }

  lines.push({ label: "Ukupno", points: delta });
  return lines;
}
