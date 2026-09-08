"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatClock, elapsedSeconds } from "@/lib/domain/timer";
import type { MatchTimerState, Team } from "@/lib/domain/types";
import { teamDisplayName } from "@/lib/domain/team-name";
import { useOptionalBusy } from "@/components/BusyProvider";
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
  finishGame,
  startNextGame,
  endTermin,
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

export type LiveState = MatchTimerState & {
  matchStatus: string;
  gameStatus: string;
  gameSeq: number;
};

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
  gameId: _gameId,
  initialLineup,
  initialEvents,
  initialState,
  teamAName: initialTeamAName,
  teamBName: initialTeamBName,
}: {
  grupaId: string;
  terminId: string;
  gameId: string;
  initialLineup: LineupPlayer[];
  initialEvents: LiveEvent[];
  initialState: LiveState;
  teamAName: string;
  teamBName: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { setBusy: setGlobalBusy } = useOptionalBusy();

  const [lineup, setLineup] = useState(initialLineup);
  const [events, setEvents] = useState(initialEvents);
  const [state, setState] = useState(initialState);
  const [teamAName, setTeamAName] = useState(initialTeamAName);
  const [teamBName, setTeamBName] = useState(initialTeamBName);

  const [pendingAssist, setPendingAssist] = useState<PendingAssist | null>(null);
  const [duplicate, setDuplicate] = useState<{
    scorer: LineupPlayer;
    secondsBefore: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setGlobalBusy(busy);
    return () => setGlobalBusy(false);
  }, [busy, setGlobalBusy]);

  const refresh = useCallback(async () => {
    const [{ data: matchRow }, { data: openGame }, { data: latestGame }] = await Promise.all([
      supabase.from("matches").select("status").eq("id", terminId).maybeSingle(),
      supabase
        .from("games")
        .select("*")
        .eq("match_id", terminId)
        .eq("status", "u_tijeku")
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("games")
        .select("*")
        .eq("match_id", terminId)
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const game = openGame ?? latestGame;
    if (!game || !matchRow) return;

    setTeamAName(teamDisplayName("A", game.team_a_name));
    setTeamBName(teamDisplayName("B", game.team_b_name));
    setState({
      matchStatus: matchRow.status,
      gameStatus: game.status,
      gameSeq: game.seq,
      startedAt: game.started_at,
      pausedAt: game.paused_at,
      endedAt: game.ended_at,
      totalPausedSeconds: game.total_paused_seconds,
    });

    const [{ data: eventRows }, { data: lineupRows }] = await Promise.all([
      supabase
        .from("match_events")
        .select("id, type, team, scorer_id, assist_id, elapsed_seconds, created_at, deleted_at")
        .eq("game_id", game.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("match_lineup")
        .select("user_id, team, is_goalkeeper")
        .eq("game_id", game.id),
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
      setLineup((prev) => {
        const byId = new Map(lineupRows.map((x) => [x.user_id, x]));
        const next = prev
          .filter((p) => byId.has(p.userId))
          .map((p) => {
            const row = byId.get(p.userId)!;
            return {
              ...p,
              team: row.team as Team,
              isGoalkeeper: row.is_goalkeeper,
            };
          });
        for (const row of lineupRows) {
          if (!next.some((p) => p.userId === row.user_id)) {
            const known = prev.find((p) => p.userId === row.user_id);
            next.push({
              userId: row.user_id,
              nickname: known?.nickname ?? "?",
              team: row.team as Team,
              isGoalkeeper: row.is_goalkeeper,
            });
          }
        }
        return next;
      });
    }
  }, [supabase, terminId]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `match_id=eq.${terminId}` },
        () => void refresh(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, terminId, refresh]);

  const online = useSyncExternalStore(
    subscribeToNetwork,
    () => navigator.onLine,
    () => true,
  );

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

  const gameLive =
    state.matchStatus === "u_tijeku" &&
    state.gameStatus === "u_tijeku" &&
    state.startedAt != null;
  const awaitingNext =
    state.matchStatus === "u_tijeku" &&
    (state.gameStatus === "zavrsena" ||
      (state.gameStatus === "u_tijeku" && state.startedAt == null));
  const terminDone = state.matchStatus === "zavrsen";
  const locked = !gameLive || busy;

  function currentElapsed() {
    return elapsedSeconds(state, new Date());
  }

  const closeStrip = useCallback(() => setPendingAssist(null), []);

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
      setDuplicate({ scorer: player, secondsBefore: result.possibleDuplicate.secondsBefore });
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
    if (!gameLive || event.type !== "goal" || !event.scorerId) return;
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
  const [confirmEndTermin, setConfirmEndTermin] = useState(false);

  async function finish() {
    setBusy(true);
    const result = await finishGame(grupaId, terminId);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      setConfirmFinish(false);
      return;
    }
    setConfirmFinish(false);
    setPendingAssist(null);
    // Freeze the clock immediately; refresh will confirm ended_at from the server.
    setState((s) => ({
      ...s,
      gameStatus: "zavrsena",
      endedAt: s.pausedAt ?? new Date().toISOString(),
      pausedAt: null,
    }));
    await afterChange();
  }

  async function nextGame() {
    setError(null);
    setBusy(true);
    const result = await startNextGame(grupaId, terminId);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    await afterChange();
  }

  async function finishTermin() {
    setBusy(true);
    const result = await endTermin(grupaId, terminId);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      setConfirmEndTermin(false);
      return;
    }
    router.push(`/grupe/${grupaId}/termin/${terminId}/sazetak`);
  }

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

      <div className="rounded-xl bg-marka p-4 text-center text-white">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Utakmica {state.gameSeq}
        </p>
        <div className="flex items-center justify-center gap-4">
          <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold uppercase text-slate-400">
            {teamAName}
          </span>
          <span className="text-4xl font-bold tabular-nums" aria-label="Rezultat">
            {scoreA} : {scoreB}
          </span>
          <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold uppercase text-slate-400">
            {teamBName}
          </span>
        </div>
        <div className="mt-2 flex justify-center">
          <Stopwatch state={state} />
        </div>
        {gameLive && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={togglePause}
              disabled={busy}
              className="h-12 flex-1 rounded-lg border border-slate-600 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
            >
              {state.pausedAt ? "Nastavi" : "Pauza"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmFinish(true)}
              disabled={busy}
              className="h-12 flex-1 rounded-lg bg-white text-sm font-semibold text-slate-900 transition active:scale-[0.98] disabled:opacity-50"
            >
              Završi utakmicu
            </button>
          </div>
        )}
      </div>

      {awaitingNext && (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-center text-sm font-semibold text-slate-800">
            {state.gameStatus === "zavrsena"
              ? `Utakmica ${state.gameSeq} je završena.`
              : "Spremno za sljedeću utakmicu."}
          </p>
          <p className="text-center text-xs text-slate-500">
            Možeš promiješati ekipe, pokrenuti novu utakmicu ili završiti termin.
          </p>
          <button
            type="button"
            onClick={() => void nextGame()}
            disabled={busy}
            className="h-12 w-full rounded-lg bg-marka text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            Nova utakmica
          </button>
          <Link
            href={`/grupe/${grupaId}/termin/${terminId}/ekipe`}
            className="flex h-12 w-full items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold transition active:scale-[0.98]"
          >
            Promiješaj ekipe
          </Link>
          <button
            type="button"
            onClick={() => setConfirmEndTermin(true)}
            disabled={busy}
            className="h-12 w-full rounded-lg border border-slate-300 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
          >
            Završi termin
          </button>
        </div>
      )}

      {terminDone && (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg bg-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700">
            Termin je završen. Unos je zaključan.
          </p>
          <Link
            href={`/grupe/${grupaId}/termin/${terminId}/sazetak`}
            className="flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-semibold"
          >
            Pogledaj sažetak
          </Link>
        </div>
      )}

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
                {e.type === "goal" && gameLive ? (
                  <button
                    type="button"
                    onClick={() => openAssistFromTimeline(e)}
                    disabled={busy}
                    className="min-w-0 flex-1 rounded text-left transition active:scale-[0.99] disabled:opacity-40"
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
                <span className="shrink-0 text-xs font-semibold text-slate-400">{e.team}</span>
                {gameLive && (
                  <button
                    type="button"
                    onClick={() => void undo(e.id)}
                    disabled={busy}
                    className="h-8 w-8 shrink-0 rounded text-slate-400 transition active:scale-90 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
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

      {pendingAssist && (
        <AssistStrip
          key={pendingAssist.eventId}
          pending={pendingAssist}
          onSelect={(id) => void selectAssistant(id)}
          onDismiss={closeStrip}
          onExpire={closeStrip}
        />
      )}

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
                className="h-12 flex-1 rounded-lg bg-marka font-semibold text-white transition active:scale-[0.98]"
              >
                Da, upiši
              </button>
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="h-12 flex-1 rounded-lg border border-slate-300 font-semibold transition active:scale-[0.98]"
              >
                Ne, odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-xl bg-white p-5">
            <h4 className="text-lg font-bold">Završiti utakmicu?</h4>
            <p className="mt-2 text-slate-600">
              Rating se obračunava za ovu utakmicu. Termin ostaje otvoren — možeš
              pokrenuti novu ili završiti termin.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void finish()}
                disabled={busy}
                className="h-12 flex-1 rounded-lg bg-marka font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                Da, završi
              </button>
              <button
                type="button"
                onClick={() => setConfirmFinish(false)}
                className="h-12 flex-1 rounded-lg border border-slate-300 font-semibold transition active:scale-[0.98]"
              >
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEndTermin && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-xl bg-white p-5">
            <h4 className="text-lg font-bold">Završiti termin?</h4>
            <p className="mt-2 text-slate-600">
              Nakon toga se više ne mogu pokretati nove utakmice u ovom terminu.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void finishTermin()}
                disabled={busy}
                className="h-12 flex-1 rounded-lg bg-marka font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                Da, završi termin
              </button>
              <button
                type="button"
                onClick={() => setConfirmEndTermin(false)}
                className="h-12 flex-1 rounded-lg border border-slate-300 font-semibold transition active:scale-[0.98]"
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
