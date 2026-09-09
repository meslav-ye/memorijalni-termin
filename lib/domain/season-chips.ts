/**
 * Which season chip should look selected.
 * Default view (no ?sezona=) shows the newest season — only that chip is active.
 */
export function isSeasonChipActive(opts: {
  /** Season uuid, or `"sve"` for all-time chip */
  chipId: string;
  /** Raw `?sezona=` value, or null if absent */
  requestedSeason: string | null;
  latestSeasonId: string | null;
}): boolean {
  const { chipId, requestedSeason, latestSeasonId } = opts;

  if (chipId === "sve") return requestedSeason === "sve";

  if (requestedSeason === "sve") return false;

  if (requestedSeason != null) return chipId === requestedSeason;

  // No query → newest season is the implicit selection
  return latestSeasonId != null && chipId === latestSeasonId;
}
