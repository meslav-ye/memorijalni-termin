/**
 * How many minutes before kickoff a match may be started.
 *
 * 30 minutes is about right: the group gathers, someone starts the clock and
 * they wait for the last arrivals. Wider than that and someone can start a
 * match by accident the day before and leave the clock running overnight.
 */
export const MINUTES_BEFORE_START = 30;

/**
 * Whether a match may be started at the given moment.
 *
 * After kickoff there is NO upper bound — if they were half an hour late or
 * only remembered the next day to enter what happened, they should still be
 * able to start.
 */
export function canStart(startsAt: string, now: Date): boolean {
  const kickoff = new Date(startsAt).getTime();
  return now.getTime() >= kickoff - MINUTES_BEFORE_START * 60_000;
}

/** Moment from which starting is allowed — for the user-facing message. */
export function earliestStartAt(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - MINUTES_BEFORE_START * 60_000);
}

export type StartOfferInput = {
  status: "najavljen" | "zakljucan" | "u_tijeku" | "zavrsen" | "otkazan";
  hasLineup: boolean;
  inLineup: boolean;
  startsAt: string;
  now: Date;
};

/**
 * Whether the teams screen should offer Pokreni / Nastavi at the top.
 * Start only after teams exist, to someone in the lineup, inside the window.
 */
export function shouldOfferStart(
  input: StartOfferInput,
): "start" | "continue" | null {
  if (input.status === "u_tijeku") return "continue";
  if (input.status === "zavrsen" || input.status === "otkazan") return null;
  if (!input.hasLineup || !input.inLineup) return null;
  if (!canStart(input.startsAt, input.now)) return null;
  return "start";
}
