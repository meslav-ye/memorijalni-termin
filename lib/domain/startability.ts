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
