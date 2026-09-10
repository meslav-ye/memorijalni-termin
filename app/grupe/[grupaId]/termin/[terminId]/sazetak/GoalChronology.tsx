"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { formatClock } from "@/lib/domain/timer";
import { teamPanelClass } from "@/lib/domain/team-colors";
import type { Team } from "@/lib/domain/types";
import { AssistStrip, type PendingAssist } from "@/components/termin/AssistStrip";
import { addAssist } from "../uzivo/actions";

export type ChronologyGoal = {
  id: string;
  type: "goal" | "own_goal";
  team: Team | null;
  scorerId: string | null;
  assistId: string | null;
  elapsedSeconds: number;
};

type Teammate = { userId: string; nickname: string; team: Team };

export function GoalChronology({
  terminId,
  goals,
  nicknames,
  lineup,
  canEditAssists,
}: {
  terminId: string;
  goals: ChronologyGoal[];
  nicknames: Record<string, string>;
  lineup: Teammate[];
  canEditAssists: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAssist | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nicknameOf = (id: string | null) => (id ? (nicknames[id] ?? "?") : "?");
  const dismiss = useCallback(() => setPending(null), []);

  function openAssist(goal: ChronologyGoal) {
    if (!canEditAssists || goal.type !== "goal" || !goal.scorerId || !goal.team) return;
    setPending({
      eventId: goal.id,
      scorer: nicknameOf(goal.scorerId),
      elapsed: goal.elapsedSeconds,
      teammates: lineup
        .filter((p) => p.team === goal.team && p.userId !== goal.scorerId)
        .map((p) => ({ userId: p.userId, nickname: p.nickname })),
      currentAssistId: goal.assistId,
    });
  }

  async function select(assistantId: string | null) {
    if (!pending) return;
    const eventId = pending.eventId;
    setPending(null);
    setBusy(true);
    setError(null);
    const result = await addAssist(terminId, eventId, assistantId);
    setBusy(false);
    if ("error" in result) setError(result.error);
    router.refresh();
  }

  if (goals.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Kronologija
      </h3>
      {canEditAssists && (
        <p className="mb-2 text-xs text-slate-500">
          Dodirni gol da dodaš ili izmijeniš asistenciju (admin, do 24h nakon utakmice).
        </p>
      )}
      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <ul className="space-y-1">
        {goals.map((e) => {
          const editable = canEditAssists && e.type === "goal" && !!e.scorerId;
          const body = (
            <>
              {e.type === "goal" ? "⚽ " : "🥅 "}
              <span className="font-medium">{nicknameOf(e.scorerId)}</span>
              {e.type === "goal" && e.assistId && (
                <span className="text-slate-500"> ({nicknameOf(e.assistId)})</span>
              )}
              {e.type === "goal" && !e.assistId && canEditAssists && (
                <span className="text-slate-400"> · asistent?</span>
              )}
              {e.type === "own_goal" && (
                <span className="text-slate-500"> — autogol</span>
              )}
            </>
          );

          return (
            <li
              key={e.id}
              className={
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm " +
                teamPanelClass(e.team)
              }
            >
              <span className="w-12 shrink-0 tabular-nums text-slate-400">
                {formatClock(e.elapsedSeconds)}
              </span>
              {editable ? (
                <button
                  type="button"
                  onClick={() => openAssist(e)}
                  disabled={busy}
                  className="min-w-0 flex-1 rounded text-left transition active:scale-[0.99] disabled:opacity-40"
                  title="Dodaj ili izmijeni asistenciju"
                >
                  {body}
                </button>
              ) : (
                <span className="min-w-0 flex-1">{body}</span>
              )}
              <span className="shrink-0 text-xs font-semibold text-slate-400">{e.team}</span>
            </li>
          );
        })}
      </ul>

      {pending && (
        <AssistStrip
          pending={pending}
          onSelect={(id) => void select(id)}
          onDismiss={dismiss}
          onExpire={dismiss}
        />
      )}
    </div>
  );
}
