"use client";

import { useEffect } from "react";
import { formatClock } from "@/lib/domain/timer";

/** After this long with no interaction the strip closes itself, without an assist. */
const AUTO_CLOSE_MS = 5000;

export type PendingAssist = {
  eventId: string;
  scorer: string;
  elapsed: number;
  teammates: { userId: string; nickname: string }[];
};

/**
 * Bottom strip that appears IMMEDIATELY after a recorded goal.
 *
 * The goal is already in the DB — this is only a second tap that adds the
 * assistant. If nothing is touched for 5 seconds, the strip disappears and
 * the goal stays without an assist. Nobody has to finish anything.
 */
export function AssistStrip({
  pending,
  onSelect,
  onUndo,
  onExpire,
}: {
  pending: PendingAssist;
  onSelect: (assistantId: string | null) => void;
  onUndo: () => void;
  onExpire: () => void;
}) {
  // `onExpire` must be stable (useCallback in the parent), otherwise the
  // countdown would reset on every render and the strip would never close.
  useEffect(() => {
    const id = setTimeout(onExpire, AUTO_CLOSE_MS);
    return () => clearTimeout(id);
  }, [onExpire]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-slate-700 bg-marka p-3 text-white shadow-2xl">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-bold">
            ⚽ GOL — {pending.scorer}{" "}
            <span className="font-normal text-slate-400 tabular-nums">
              {formatClock(pending.elapsed)}
            </span>
          </p>
          <button
            type="button"
            onClick={onUndo}
            className="h-10 shrink-0 rounded-lg border border-red-400 px-3 text-sm
                       font-semibold text-red-300 transition active:scale-95"
          >
            Poništi
          </button>
        </div>

        <p className="mb-2 text-sm text-slate-400">Tko je asistirao?</p>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {pending.teammates.map((s) => (
            <button
              key={s.userId}
              type="button"
              onClick={() => onSelect(s.userId)}
              className="h-12 shrink-0 rounded-lg bg-white px-4 text-sm font-bold
                         uppercase text-slate-900 transition active:scale-95"
            >
              {s.nickname}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="h-12 shrink-0 rounded-lg border border-slate-500 px-4 text-sm
                       font-bold uppercase text-slate-300 transition active:scale-95"
          >
            Nitko
          </button>
        </div>
      </div>
    </div>
  );
}
