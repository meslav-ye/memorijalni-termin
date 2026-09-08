"use client";

import { useSyncExternalStore } from "react";
import { elapsedSeconds, formatClock } from "@/lib/domain/timer";
import type { MatchTimerState } from "@/lib/domain/types";

/**
 * Clock ticks as an external store.
 *
 * Checks 4 times per second so the transition is accurate, but the snapshot
 * is QUANTIZED to whole seconds — `getSnapshot` must return a stable value,
 * otherwise React re-renders in a loop. Result: one render per second, as
 * much as the display needs.
 */
function subscribeToTicks(onStoreChange: () => void) {
  const id = setInterval(onStoreChange, 250);
  return () => clearInterval(id);
}

const currentSecond = () => Math.floor(Date.now() / 1000);

/**
 * The stopwatch is NOT sent over the network. Each device computes it from
 * started_at / paused_at / total_paused_seconds set by the server — so
 * everyone shows the same time, including someone who joins in minute 23.
 */
export function Stopwatch({ state }: { state: MatchTimerState }) {
  const second = useSyncExternalStore(
    subscribeToTicks,
    currentSecond,
    // No clock on the server or during hydration; the first tick fixes the display.
    () => 0,
  );

  const elapsed = second === 0 ? 0 : elapsedSeconds(state, new Date(second * 1000));

  return (
    <div
      className="stoperica text-5xl font-bold tabular-nums"
      role="timer"
      aria-label="Proteklo vrijeme"
    >
      {formatClock(elapsed)}
      {state.pausedAt && (
        <span className="ml-3 align-middle text-base font-semibold text-amber-600">
          PAUZA
        </span>
      )}
    </div>
  );
}
