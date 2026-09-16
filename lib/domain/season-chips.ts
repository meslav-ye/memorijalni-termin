/**
 * Maps `?sezona=` to `getLeaderboard`'s season argument.
 *
 * Missing → `undefined` (latest season, resolved inside the cache so pages
 * do not need a separate seasons query). `"sve"` → `null` (all time).
 * Anything else is a season id.
 */
export function seasonIdFromQuery(sezona: string | null): string | null | undefined {
  if (sezona == null) return undefined;
  if (sezona === "sve") return null;
  return sezona;
}

/** Cache key so "latest" and "all time" never share an entry. */
export function leaderboardSeasonCacheKey(
  seasonId: string | null | undefined,
): string {
  if (seasonId === undefined) return "latest";
  return seasonId ?? "all";
}

/**
 * Season id to filter matches by, after seasons are already loaded
 * (newest name first). `undefined` means the default latest-season view.
 */
export function resolveLeaderboardSeasonId(
  seasonId: string | null | undefined,
  seasonsNewestFirst: { id: string }[],
): string | null {
  if (seasonId === undefined) return seasonsNewestFirst[0]?.id ?? null;
  return seasonId;
}

export function latestSeasonIdFromList(seasons: { id: string }[]): string | null {
  return seasons[0]?.id ?? null;
}

/**
 * Which season chip should look selected.
 * Default view (no ?sezona=) shows the newest season — only that chip is active.
 * When the group has no seasons yet, all-time ("sve") is the implicit selection.
 */
export function isSeasonChipActive(opts: {
  /** Season uuid, or `"sve"` for all-time chip */
  chipId: string;
  /** Raw `?sezona=` value, or null if absent */
  requestedSeason: string | null;
  latestSeasonId: string | null;
}): boolean {
  const { chipId, requestedSeason, latestSeasonId } = opts;

  if (chipId === "sve") {
    return (
      requestedSeason === "sve" ||
      (requestedSeason == null && latestSeasonId == null)
    );
  }

  if (requestedSeason === "sve") return false;

  if (requestedSeason != null) return chipId === requestedSeason;

  // No query → newest season is the implicit selection
  return latestSeasonId != null && chipId === latestSeasonId;
}
