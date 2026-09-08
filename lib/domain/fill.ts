export type FillTone = "low" | "enough" | "full";

export type FillStatus = {
  /** User-facing text, e.g. "Fali još 3" or "Igra se — još 2 mjesta". */
  label: string;
  tone: FillTone;
  /** How many more people needed to play for sure. Zero once minimum is reached. */
  shortOfMin: number;
  /** How many spots left until capacity. Zero when full. */
  freeSlots: number;
};

/** Croatian singular/plural for spots: 1 mjesto, 2 mjesta. */
function spotsLabel(n: number): string {
  return n === 1 ? "1 mjesto" : `${n} mjesta`;
}

/**
 * Match fill status from two thresholds.
 *
 *   min      = enough to play for sure (5v5 without subs)
 *   capacity = max spots (with subs); beyond that goes to the waitlist
 */
export function fillStatus(signedUp: number, min: number, capacity: number): FillStatus {
  const shortOfMin = Math.max(0, min - signedUp);
  const freeSlots = Math.max(0, capacity - signedUp);

  if (freeSlots === 0) {
    return { label: "Popunjeno", tone: "full", shortOfMin, freeSlots };
  }

  if (shortOfMin > 0) {
    return {
      label: `Fali još ${shortOfMin}`,
      tone: "low",
      shortOfMin,
      freeSlots,
    };
  }

  return {
    label: `Igra se — još ${spotsLabel(freeSlots)}`,
    tone: "enough",
    shortOfMin,
    freeSlots,
  };
}
