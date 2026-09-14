"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { formatClock } from "@/lib/domain/timer";
import { teamPanelClass } from "@/lib/domain/team-colors";
import type { Team } from "@/lib/domain/types";
import { AssistStrip, type PendingAssist } from "@/components/termin/AssistStrip";
import { addAssist, type EventPlayerRef } from "../uzivo/actions";

export type ChronologyGoal = {
  id: string;
  type: "goal" | "own_goal";
  team: Team | null;
  scorerId: string | null;
  scorerFillerId: string | null;
  assistId: string | null;
  assistFillerId: string | null;
  elapsedSeconds: number;
};

type Teammate = {
  userId: string | null;
  fillerId: string | null;
  nickname: string;
  team: Team;
  isGuest: boolean;
};

function teammateRef(p: Teammate): EventPlayerRef | null {
  if (p.isGuest) return p.fillerId ? { kind: "filler", id: p.fillerId } : null;
  return p.userId ? { kind: "user", id: p.userId } : null;
}

function sameTeammate(a: Teammate, b: Teammate): boolean {
  if (a.isGuest || b.isGuest) return Boolean(a.fillerId && a.fillerId === b.fillerId);
  return Boolean(a.userId && a.userId === b.userId);
}

export function GoalChronology({
  terminId,
  goals,
  nicknames,
  fillerNames,
  lineup,
  canEditAssists,
}: {
  terminId: string;
  goals: ChronologyGoal[];
  nicknames: Record<string, string>;
  fillerNames: Record<string, string>;
  lineup: Teammate[];
  canEditAssists: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAssist | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (userId: string | null, fillerId: string | null) => {
    if (fillerId) return fillerNames[fillerId] ?? "?";
    if (userId) return nicknames[userId] ?? "?";
    return "?";
  };
  const dismiss = useCallback(() => setPending(null), []);

  function openAssist(goal: ChronologyGoal) {
    if (!canEditAssists || goal.type !== "goal" || !goal.team) return;
    if (!goal.scorerId && !goal.scorerFillerId) return;
    const scorer = goal.scorerFillerId
      ? lineup.find((p) => p.fillerId === goal.scorerFillerId)
      : lineup.find((p) => p.userId === goal.scorerId);
    if (!scorer) return;

    const currentAssist: EventPlayerRef | null = goal.assistFillerId
      ? { kind: "filler", id: goal.assistFillerId }
      : goal.assistId
        ? { kind: "user", id: goal.assistId }
        : null;

    setPending({
      eventId: goal.id,
      scorer: scorer.nickname,
      elapsed: goal.elapsedSeconds,
      teammates: lineup
        .filter((p) => p.team === goal.team && !sameTeammate(p, scorer))
        .flatMap((p) => {
          const ref = teammateRef(p);
          return ref ? [{ ref, nickname: p.nickname }] : [];
        }),
      currentAssist,
    });
  }

  async function select(assistant: EventPlayerRef | null) {
    if (!pending) return;
    const eventId = pending.eventId;
    setPending(null);
    setBusy(true);
    setError(null);
    const result = await addAssist(terminId, eventId, assistant);
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
          const editable =
            canEditAssists && e.type === "goal" && (!!e.scorerId || !!e.scorerFillerId);
          const scorerLabel = nameOf(e.scorerId, e.scorerFillerId);
          const assistLabel =
            e.assistId || e.assistFillerId
              ? nameOf(e.assistId, e.assistFillerId)
              : null;
          const body = (
            <>
              {e.type === "goal" ? "⚽ " : "🥅 "}
              <span className="font-medium">{scorerLabel}</span>
              {e.type === "goal" && assistLabel && (
                <span className="text-slate-500"> ({assistLabel})</span>
              )}
              {e.type === "goal" && !assistLabel && canEditAssists && (
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
