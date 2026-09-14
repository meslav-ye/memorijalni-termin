/**
 * PostgREST `.in()` cannot take an empty list (it would match every row).
 * A dummy `"-"` is not a valid uuid, so Postgres logs `22P02`.
 */
export const UNMATCHABLE_UUID = "00000000-0000-0000-0000-000000000000";

export function inUuids(ids: readonly string[]): string[] {
  return ids.length > 0 ? [...ids] : [UNMATCHABLE_UUID];
}
