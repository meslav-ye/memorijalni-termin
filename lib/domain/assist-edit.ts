/** Matches RLS: admin may update events while game.ended_at is within 24h. */
export const ASSIST_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function withinAssistEditWindow(
  endedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!endedAt) return false;
  const ended = new Date(endedAt).getTime();
  if (Number.isNaN(ended)) return false;
  return now.getTime() - ended < ASSIST_EDIT_WINDOW_MS;
}
