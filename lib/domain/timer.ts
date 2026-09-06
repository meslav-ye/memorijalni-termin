import type { MatchTimerState } from "./types";

/**
 * Proteklo vrijeme utakmice u sekundama.
 *
 * Izvodi se iz vremena SERVERA (started_at, paused_at, total_paused_seconds),
 * a ne broji lokalno. Zato svaki uredjaj — i onaj koji se spojio u 23. minuti —
 * pokazuje isti broj, bez ikakve sinkronizacije preko mreze.
 */
export function elapsedSeconds(state: MatchTimerState, now: Date): number {
  if (!state.startedAt) return 0;

  const pocetak = new Date(state.startedAt).getTime();
  const kraj = state.pausedAt ? new Date(state.pausedAt).getTime() : now.getTime();
  const sirovo = Math.floor((kraj - pocetak) / 1000) - state.totalPausedSeconds;

  return Math.max(0, sirovo);
}

/** Sekunde u "MM:SS". Preko 99 minuta minute jednostavno rastu: "100:00". */
export function formatClock(totalSeconds: number): string {
  const minute = Math.floor(totalSeconds / 60);
  const sekunde = totalSeconds % 60;

  return `${String(minute).padStart(2, "0")}:${String(sekunde).padStart(2, "0")}`;
}
