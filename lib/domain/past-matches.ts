export const PAST_MATCH_LIMIT = 20;

/**
 * Past list = already started, plus cancelled rows that are still in the future.
 * Kept as a merge (not a single `.or` filter) because PostgREST treats `:`, `.`
 * in ISO timestamps as syntax inside `or=(...)`.
 */
export function mergePastMatchRows<T extends { starts_at: string }>(
  started: T[],
  cancelledUpcoming: T[],
  limit = PAST_MATCH_LIMIT,
): T[] {
  return [...started, ...cancelledUpcoming]
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .slice(0, limit);
}
