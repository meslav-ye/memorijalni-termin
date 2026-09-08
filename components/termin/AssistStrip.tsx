"use client";

import { useEffect } from "react";
import { formatClock } from "@/lib/domain/timer";

/** After this long with no interaction the strip closes itself, without an assist. */
const AUTO_CLOSE_MS = 8000;

export type PendingAssist = {
  eventId: string;
  scorer: string;
  elapsed: number;
  teammates: { userId: string; nickname: string }[];
  /** When editing from the timeline, show which assist is already set. */
  currentAssistId?: string | null;
};

/**
 * Bottom strip for picking an assist after a goal (or from the timeline).
 *
 * The goal is already in the DB — this only updates assist_id. Closing or
 * timing out does not delete the goal; undo lives on the timeline row.
 */
export function AssistStrip({
  pending,
  onSelect,
  onDismiss,
  onExpire,
}: {
  pending: PendingAssist;
  onSelect: (assistantId: string | null) => void;
  onDismiss: () => void;
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
            onClick={onDismiss}
            className="h-10 shrink-0 rounded-lg border border-slate-500 px-3 text-sm
                       font-semibold text-slate-300 transition active:scale-95"
          >
            Bez asistencije
          </button>
        </div>

        <p className="mb-2 text-sm text-slate-400">Tko je asistirao?</p>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {pending.teammates.map((s) => (
            <button
              key={s.userId}
              type="button"
              onClick={() => onSelect(s.userId)}
              className={
                "h-12 shrink-0 rounded-lg px-4 text-sm font-bold uppercase transition active:scale-95 " +
                (pending.currentAssistId === s.userId
                  ? "bg-emerald-300 text-slate-900"
                  : "bg-white text-slate-900")
              }
            >
              {s.nickname}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={
              "h-12 shrink-0 rounded-lg border px-4 text-sm font-bold uppercase transition active:scale-95 " +
              (pending.currentAssistId == null
                ? "border-slate-300 bg-slate-600 text-white"
                : "border-slate-500 text-slate-300")
            }
          >
            Nitko
          </button>
        </div>
      </div>
    </div>
  );
}
