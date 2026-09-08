import type { SignupRow, SignupBuckets } from "./types";

/**
 * Splits signups into confirmed and waitlist.
 *
 * Order: manual order (if set) wins, then signup time. Cancelled signups are
 * skipped — that is why the waitlist "fills itself" when someone withdraws,
 * with no extra logic.
 *
 * Status is intentionally NOT stored in the DB; it is always computed. That
 * way there is no state that can drift from reality.
 */
export function splitSignups(signups: SignupRow[], capacity: number): SignupBuckets {
  const ordered = signups
    .filter((s) => s.cancelledAt === null)
    .sort((a, b) => {
      // Manual order first; anyone without it goes after those who have it.
      if (a.manualOrder !== null && b.manualOrder !== null) {
        if (a.manualOrder !== b.manualOrder) return a.manualOrder - b.manualOrder;
      } else if (a.manualOrder !== null) {
        return -1;
      } else if (b.manualOrder !== null) {
        return 1;
      }
      return a.signedUpAt.localeCompare(b.signedUpAt);
    });

  const limit = Math.max(0, capacity);

  return {
    confirmed: ordered.slice(0, limit).map((s) => s.userId),
    waitlist: ordered.slice(limit).map((s) => s.userId),
  };
}
