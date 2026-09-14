/** True when session expires_at (unix seconds) is more than `skewSec` in the future. */
export function isExpiresAtFresh(
  expiresAtSec: number | null | undefined,
  nowMs: number = Date.now(),
  skewSec: number = 90,
): boolean {
  if (expiresAtSec == null || !Number.isFinite(expiresAtSec)) return false;
  return expiresAtSec * 1000 > nowMs + skewSec * 1000;
}
