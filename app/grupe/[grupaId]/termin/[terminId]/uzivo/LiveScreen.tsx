"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatClock, elapsedSeconds } from "@/lib/domain/timer";
import type { MatchTimerState, Team } from "@/lib/domain/types";
import { Stopwatch } from "@/components/termin/Stopwatch";
import { PlayerButton } from "@/components/termin/PlayerButton";
import { AssistStrip, type PendingAssist } from "@/components/termin/AssistStrip";
import {
  addAssist,
  resumeMatch,
  pauseMatch,
  undoEvent,
  changeGoalkeeper,
  recordOwnGoal,
  recordGoal,
  finishMatch,
} from "./actions";

export type LineupPlayer = {
  userId: string;
  nickname: string;
  team: Team;
  isGoalkeeper: boolean;
};

export type LiveEvent = {
  id: string;
  type: string;
  team: Team | null;
  scorerId: string | null;
  assistId: string | null;
  elapsedSeconds: number;
  createdAt: string;
  deletedAt: string | null;
};

export type MatchLiveState = MatchTimerState & { status: string };

/** Subscribe to online/offline changes for useSyncExternalStore. */
function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function LiveScreen({
  grupaId,
  terminId,
  initialLineup,
  initialEvents,
  initialState,
}: {
  grupaId: string;
  terminId: string;
  initialLineup: LineupPlayer[];
  initialEvents: LiveEvent[];
  initialState: MatchLiveState;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [lineup, setLineup] = useState(initialLineup);
  const [events, setEvents] = useState(initialEvents);
  const [state, setState] = useState(initialState);

  const [pendingAssist, setPendingAssist] = useState<PendingAssist | null>(null);
  const [duplicate, setDuplicate] = useState<{
    scorer: LineupPlayer;
    secondsBefore: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- Fresh data fetch -----------------------------------------------------

  const refresh = useCallback(async () => {
    const [{ data: eventRows }, { data: lineupRows }, { data: matchRow }] = await Promise.all([
      supabase
        .from("match_events")
        .select("id, type, team, scorer_id, assist_id, elapsed_seconds, created_at, deleted_at")
        .eq("match_id", terminId)
        .order("created_at", { ascending: false }),
      supabase
        .from("match_lineup")
        .select("user_id, team, is_goalkeeper")
        .eq("match_id", terminId),
      supabase
        .from("matches")
        .select("status, started_at, paused_at, total_paused_seconds")
        .eq("id", terminId)
        .maybeSingle(),
    ]);

    if (eventRows) {
      setEvents(
        eventRows.map((e) => ({
          id: e.id,
          type: e.type,
          team: e.team as Team | null,
          scorerId: e.scorer_id,
          assistId: e.assist_id,
          elapsedSeconds: e.elapsed_seconds,
          createdAt: e.created_at,
          deletedAt: e.deleted_at,
        })),
      );
    }

    if (lineupRows) {
      setLineup((prev) =>
        prev.map((p) => ({
          ...p,
          team: (lineupRows.find((x) => x.user_id === p.userId)?.team ?? p.team) as Team,
          isGoalkeeper: lineupRows.find((x) => x.user_id === p.userId)?.is_goalkeeper ?? false,
        })),
      );
    }

    if (matchRow) {
      setState({
        status: matchRow.status,
        startedAt: matchRow.started_at,
        pausedAt: matchRow.paused_at,
        totalPausedSeconds: matchRow.total_paused_seconds,
      });
    }
  }, [supabase, terminId]);

  // --- Live sync ------------------------------------------------------------

  useEffect(() => {
    const channel = supabase
      .channel(`termin:${terminId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${terminId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineup", filter: `match_id=eq.${terminId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${terminId}` },
        () => void refresh(),
      )
      .subscribe((status) => {
        // Fires on first connect and every reconnect after a drop. Pull
        // everything that happened while we were not listening — so refresh
        // does not need a separate effect on network state.
        if (status === "SUBSCRIBED") void refresh();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, terminId, refresh]);

  // --- Network state --------------------------------------------------------

  // Connection state is an external source that changes outside React, so it
  // is read via useSyncExternalStore. A manual useEffect + setState would
  // cause an extra render on every load and is not the recommended pattern.
  const online = useSyncExternalStore(
    subscribeToNetwork,
    () => navigator.onLine,
    () => true, // assume online on the server
  );

  // Refresh on reconnect does NOT live here — the Realtime subscription
  // callback above fires on every (re)connect. `online` is only for the
  // warning banner.

  // --- Derived values -------------------------------------------------------

  const activeEvents = events.filter((e) => e.deletedAt === null);
  const goals = activeEvents.filter((e) => e.type === "goal" || e.type === "own_goal");

  const scoreA = goals.filter((e) => e.team === "A").length;
  const scoreB = goals.filter((e) => e.team === "B").length;

  const playerGoals = (userId: string) =>
    activeEvents.filter((e) => e.type === "goal" && e.scorerId === userId).length;

  const nicknameOf = (userId: string | null) =>
    lineup.find((p) => p.userId === userId)?.nickname ?? "?";

  const teamA = lineup.filter((p) => p.team === "A");
  const teamB = lineup.filter((p) => p.team === "B");

  const inProgress = state.status === "u_tijeku";
  const locked = !inProgress || busy;

  function currentElapsed() {
    return elapsedSeconds(state, new Date());
  }

  // Stable reference: AssistStrip uses this as a countdown dependency.
  const closeStrip = useCallback(() => setPendingAssist(null), []);

  // --- Actions --------------------------------------------------------------

  async function afterChange() {
    await refresh();
    router.refresh();
  }

  async function recordPlayerGoal(player: LineupPlayer, confirmed = false) {
    setError(null);
    setBusy(true);

    const elapsed = currentElapsed();
    const result = await recordGoal(terminId, player.userId, player.team, elapsed, confirmed);

    setBusy(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    if ("possibleDuplicate" in result) {
      setDuplicate({
        scorer: player,
        secondsBefore: result.possibleDuplicate.secondsBefore,
      });
      return;
    }

    setPendingAssist({
      eventId: result.eventId,
      scorer: player.nickname,
      elapsed,
      teammates: lineup
        .filter((p) => p.team === player.team && p.userId !== player.userId)
        .map((p) => ({ userId: p.userId, nickname: p.nickname })),
    });

    await refresh();
  }

  async function recordPlayerOwnGoal(player: LineupPlayer) {
    setError(null);
    setBusy(true);
    const result = await recordOwnGoal(terminId, player.userId, player.team, currentElapsed());
    setBusy(false);

    if ("error" in result) setError(result.error);
    await afterChange();
  }

  async function setPlayerGoalkeeper(player: LineupPlayer) {
    setBusy(true);
    await changeGoalkeeper(terminId, player.userId, player.team, currentElapsed());
    setBusy(false);
    await afterChange();
  }

  async function undo(eventId: string) {
    setBusy(true);
    await undoEvent(terminId, eventId);
    setBusy(false);
    setPendingAssist(null);
    await afterChange();
  }

  async function selectAssistant(assistantId: string | null) {
    if (!pendingAssist) return;
    const id = pendingAssist.eventId;
    setPendingAssist(null);
    await addAssist(terminId, id, assistantId);
    await afterChange();
  }

  function openAssistFromTimeline(event: LiveEvent) {
    if (!inProgress || event.type !== "goal" || !event.scorerId) return;
    const scorer = lineup.find((p) => p.userId === event.scorerId);
    if (!scorer) return;

    setPendingAssist({
      eventId: event.id,
      scorer: scorer.nickname,
      elapsed: event.elapsedSeconds,
      teammates: lineup
        .filter((p) => p.team === scorer.team && p.userId !== scorer.userId)
        .map((p) => ({ userId: p.userId, nickname: p.nickname })),
      currentAssistId: event.assistId,
    });
  }

  async function togglePause() {
    setBusy(true);
    if (state.pausedAt) await resumeMatch(terminId);
    else await pauseMatch(terminId);
    setBusy(false);
    await afterChange();
  }

  const [confirmFinish, setConfirmFinish] = useState(false);

  async function finish() {
    setBusy(true);
    const result = await finishMatch(grupaId, terminId);
    setBusy(false);

    if ("error" in result) {
      setError(result.error);
      setConfirmFinish(false);
      return;
    }
    router.push(`/grupe/${grupaId}/termin/${terminId}/sazetak`);
  }

  // --- Render ---------------------------------------------------------------

  return (
    <div className="pb-56">
      {!online && (
        <p className="mb-3 rounded-lg bg-amber-500 px-3 py-2 text-center text-sm font-semibold text-white">
          Nema veze — unosi neće proći dok se ne vratiš na mrežu
        </p>
      )}

      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">
          {error}
        </p>
      )}

      {/* Score and stopwatch */}
      <div className="rounded-xl bg-marka p-4 text-center text-white">
        <div className="flex items-center justify-center gap-4">
          <span className="flex-1 text-right text-sm font-semibold uppercase text-slate-400">
            Ekipa A
          </span>
          <span className="text-4xl font-bold tabular-nums" aria-label="Rezultat">
            {scoreA} : {scoreB}
          </span>
          <span className="flex-1 text-left text-sm font-semibold uppercase text-slate-400">
            Ekipa B
          </span>
        </div>

        <div className="mt-2 flex justify-center">
          <Stopwatch state={state} />
        </div>

        {inProgress && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={togglePause}
              disabled={busy}
              className="h-12 flex-1 rounded-lg border border-slate-600 text-sm font-semibold
                         transition active:scale-[0.98] disabled:opacity-50"
            >
              {state.pausedAt ? "Nastavi" : "Pauza"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmFinish(true)}
              disabled={busy}
              className="h-12 flex-1 rounded-lg bg-white text-sm font-semibold text-slate-900
                         transition active:scale-[0.98] disabled:opacity-50"
            >
              Završi
            </button>
          </div>
        )}
      </div>

      {!inProgress && (
        <p className="mt-3 rounded-lg bg-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700">
          Termin je završen. Unos je zaključan.
        </p>
      )}

      {/* Players */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {teamA.map((p) => (
            <PlayerButton
              key={p.userId}
              nickname={p.nickname}
              goals={playerGoals(p.userId)}
              isGoalkeeper={p.isGoalkeeper}
              disabled={locked}
              onGoal={() => void recordPlayerGoal(p)}
              onOwnGoal={() => void recordPlayerOwnGoal(p)}
              onGoalkeeper={() => void setPlayerGoalkeeper(p)}
            />
          ))}
        </div>
        <div className="space-y-2">
          {teamB.map((p) => (
            <PlayerButton
              key={p.userId}
              nickname={p.nickname}
              goals={playerGoals(p.userId)}
              isGoalkeeper={p.isGoalkeeper}
              disabled={locked}
              onGoal={() => void recordPlayerGoal(p)}
              onOwnGoal={() => void recordPlayerOwnGoal(p)}
              onGoalkeeper={() => void setPlayerGoalkeeper(p)}
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Dodir = gol · Dugi pritisak = autogol · 🧤 = golman
      </p>

      {/* Timeline */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Što se dogodilo
        </h3>

        {activeEvents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
            Još nema golova.
          </p>
        ) : (
          <ul className="space-y-1">
            {activeEvents.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="w-12 shrink-0 tabular-nums text-slate-400">
                  {formatClock(e.elapsedSeconds)}
                </span>

                {e.type === "goal" && inProgress ? (
                  <button
                    type="button"
                    onClick={() => openAssistFromTimeline(e)}
                    disabled={busy}
                    className="min-w-0 flex-1 rounded text-left transition active:scale-[0.99]
                               disabled:opacity-40"
                    title="Dodaj ili izmijeni asistenciju"
                  >
                    ⚽ <span className="font-medium">{nicknameOf(e.scorerId)}</span>
                    {e.assistId ? (
                      <span className="text-slate-500"> ({nicknameOf(e.assistId)})</span>
                    ) : (
                      <span className="text-slate-400"> · asistent?</span>
                    )}
                  </button>
                ) : (
                  <span className="min-w-0 flex-1">
                    {e.type === "goal" && (
                      <>
                        ⚽ <span className="font-medium">{nicknameOf(e.scorerId)}</span>
                        {e.assistId && (
                          <span className="text-slate-500"> ({nicknameOf(e.assistId)})</span>
                        )}
                      </>
                    )}
                    {e.type === "own_goal" && (
                      <>
                        🥅 <span className="font-medium">{nicknameOf(e.scorerId)}</span>
                        <span className="text-slate-500"> — autogol</span>
                      </>
                    )}
                    {e.type === "keeper_change" && (
                      <>
                        🧤 <span className="font-medium">{nicknameOf(e.scorerId)}</span>
                        <span className="text-slate-500"> ide u gol</span>
                      </>
                    )}
                  </span>
                )}

                <span className="shrink-0 text-xs font-semibold text-slate-400">
                  {e.team}
                </span>

                {inProgress && (
                  <button
                    type="button"
                    onClick={() => void undo(e.id)}
                    disabled={busy}
                    className="h-8 w-8 shrink-0 rounded text-slate-400 transition
                               active:scale-90 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Poništi ovaj unos"
                    title="Poništi"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Assist strip */}
      {pendingAssist && (
        <AssistStrip
          key={pendingAssist.eventId}
          pending={pendingAssist}
          onSelect={(id) => void selectAssistant(id)}
          onDismiss={closeStrip}
          onExpire={closeStrip}
        />
      )}

      {/* Possible duplicate warning */}
      {duplicate && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-xl bg-white p-5">
            <h4 className="text-lg font-bold">Je li ovo drugi gol?</h4>
            <p className="mt-2 text-slate-600">
              Netko je već upisao gol za <strong>{duplicate.scorer.nickname}</strong> prije{" "}
              {duplicate.secondsBefore} s.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const player = duplicate.scorer;
                  setDuplicate(null);
                  void recordPlayerGoal(player, true);
                }}
                className="h-12 flex-1 rounded-lg bg-marka font-semibold text-white
                           transition active:scale-[0.98]"
              >
                Da, upiši
              </button>
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="h-12 flex-1 rounded-lg border border-slate-300 font-semibold
                           transition active:scale-[0.98]"
              >
                Ne, odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish confirmation */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-xl bg-white p-5">
            <h4 className="text-lg font-bold">Završiti termin?</h4>
            <p className="mt-2 text-slate-600">
              Nakon toga se statistika zaključava i golovi se više ne mogu unositi.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void finish()}
                disabled={busy}
                className="h-12 flex-1 rounded-lg bg-marka font-semibold text-white
                           transition active:scale-[0.98] disabled:opacity-50"
              >
                Da, završi
              </button>
              <button
                type="button"
                onClick={() => setConfirmFinish(false)}
                className="h-12 flex-1 rounded-lg border border-slate-300 font-semibold
                           transition active:scale-[0.98]"
              >
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
