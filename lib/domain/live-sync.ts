import type { Team } from "@/lib/domain/types";
import { teamDisplayName } from "@/lib/domain/team-name";

/** Event shape the live screen keeps in memory. */
export type LiveSyncEvent = {
  id: string;
  type: string;
  team: Team | null;
  scorerId: string | null;
  scorerFillerId: string | null;
  assistId: string | null;
  assistFillerId: string | null;
  elapsedSeconds: number;
  createdAt: string;
  deletedAt: string | null;
};

export type LiveEventRow = {
  id: string;
  game_id: string;
  type: string;
  team: string | null;
  scorer_id: string | null;
  scorer_filler_id: string | null;
  assist_id: string | null;
  assist_filler_id: string | null;
  elapsed_seconds: number;
  created_at: string;
  deleted_at: string | null;
};

export type LiveGameRow = {
  id: string;
  seq: number;
  status: string;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  total_paused_seconds: number;
  team_a_name: string | null;
  team_b_name: string | null;
};

export type LiveGamePatch = {
  gameId: string;
  gameStatus: string;
  gameSeq: number;
  startedAt: string | null;
  pausedAt: string | null;
  endedAt: string | null;
  totalPausedSeconds: number;
  teamAName: string;
  teamBName: string;
};

export type ApplyResult<T> =
  | { kind: "apply"; value: T }
  | { kind: "unchanged" }
  | { kind: "refresh" };

export function liveEventFromRow(row: LiveEventRow): LiveSyncEvent {
  return {
    id: row.id,
    type: row.type,
    team: row.team === "A" || row.team === "B" ? row.team : null,
    scorerId: row.scorer_id,
    scorerFillerId: row.scorer_filler_id,
    assistId: row.assist_id,
    assistFillerId: row.assist_filler_id,
    elapsedSeconds: row.elapsed_seconds,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

export function parseLiveEventRow(raw: unknown): LiveEventRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.game_id !== "string") return null;
  if (typeof r.type !== "string" || typeof r.created_at !== "string") return null;
  if (typeof r.elapsed_seconds !== "number") return null;
  return {
    id: r.id,
    game_id: r.game_id,
    type: r.type,
    team: typeof r.team === "string" ? r.team : null,
    scorer_id: typeof r.scorer_id === "string" ? r.scorer_id : null,
    scorer_filler_id: typeof r.scorer_filler_id === "string" ? r.scorer_filler_id : null,
    assist_id: typeof r.assist_id === "string" ? r.assist_id : null,
    assist_filler_id: typeof r.assist_filler_id === "string" ? r.assist_filler_id : null,
    elapsed_seconds: r.elapsed_seconds,
    created_at: r.created_at,
    deleted_at: typeof r.deleted_at === "string" ? r.deleted_at : null,
  };
}

export function parseLiveGameRow(raw: unknown): LiveGameRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.status !== "string") return null;
  if (typeof r.seq !== "number" || typeof r.total_paused_seconds !== "number") return null;
  return {
    id: r.id,
    seq: r.seq,
    status: r.status,
    started_at: typeof r.started_at === "string" ? r.started_at : null,
    paused_at: typeof r.paused_at === "string" ? r.paused_at : null,
    ended_at: typeof r.ended_at === "string" ? r.ended_at : null,
    total_paused_seconds: r.total_paused_seconds,
    team_a_name: typeof r.team_a_name === "string" ? r.team_a_name : null,
    team_b_name: typeof r.team_b_name === "string" ? r.team_b_name : null,
  };
}

/**
 * Apply a Realtime event row. Other games are ignored. Unknown shapes
 * tell the caller to fall back to a full fetch.
 */
export function applyLiveEvent(
  events: LiveSyncEvent[],
  eventType: string,
  row: LiveEventRow | null,
  gameId: string,
): ApplyResult<LiveSyncEvent[]> {
  if (eventType === "DELETE") {
    if (!row) return { kind: "refresh" };
    if (row.game_id !== gameId) return { kind: "unchanged" };
    if (!events.some((e) => e.id === row.id)) return { kind: "unchanged" };
    return { kind: "apply", value: events.filter((e) => e.id !== row.id) };
  }

  if (!row) return { kind: "refresh" };
  if (row.game_id !== gameId) return { kind: "unchanged" };

  const next = liveEventFromRow(row);

  if (eventType === "INSERT") {
    if (events.some((e) => e.id === next.id)) return { kind: "unchanged" };
    return {
      kind: "apply",
      value: [next, ...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  if (eventType === "UPDATE") {
    if (!events.some((e) => e.id === next.id)) {
      return {
        kind: "apply",
        value: [next, ...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    }
    return { kind: "apply", value: events.map((e) => (e.id === next.id ? next : e)) };
  }

  return { kind: "refresh" };
}

export function applyLiveGame(
  currentGameId: string,
  eventType: string,
  row: LiveGameRow | null,
): ApplyResult<LiveGamePatch> {
  if (!row) return { kind: "refresh" };
  if (eventType === "INSERT" && row.id !== currentGameId) return { kind: "refresh" };
  if (eventType === "DELETE") return { kind: "refresh" };
  if (row.id !== currentGameId) return { kind: "unchanged" };

  return {
    kind: "apply",
    value: {
      gameId: row.id,
      gameStatus: row.status,
      gameSeq: row.seq,
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      endedAt: row.ended_at,
      totalPausedSeconds: row.total_paused_seconds,
      teamAName: teamDisplayName("A", row.team_a_name),
      teamBName: teamDisplayName("B", row.team_b_name),
    },
  };
}
