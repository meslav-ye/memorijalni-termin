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

export type LiveLineupRow = {
  id: string;
  game_id: string;
  match_id: string;
  user_id: string | null;
  filler_id: string | null;
  team: Team;
  is_goalkeeper: boolean;
  display_name: string | null;
  is_guest: boolean;
};

export type LiveSyncLineupPlayer = {
  lineupId: string;
  userId: string;
  fillerId: string | null;
  nickname: string;
  team: Team;
  isGoalkeeper: boolean;
  isGuest: boolean;
};

export function parseLiveLineupRow(raw: unknown): LiveLineupRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.game_id !== "string") return null;
  if (typeof r.match_id !== "string") return null;
  if (r.team !== "A" && r.team !== "B") return null;
  if (typeof r.is_goalkeeper !== "boolean" || typeof r.is_guest !== "boolean") return null;
  return {
    id: r.id,
    game_id: r.game_id,
    match_id: r.match_id,
    user_id: typeof r.user_id === "string" ? r.user_id : null,
    filler_id: typeof r.filler_id === "string" ? r.filler_id : null,
    team: r.team,
    is_goalkeeper: r.is_goalkeeper,
    display_name: typeof r.display_name === "string" ? r.display_name : null,
    is_guest: r.is_guest,
  };
}

function nicknameForLineup(
  row: LiveLineupRow,
  existing: LiveSyncLineupPlayer[],
): string | null {
  if (row.is_guest) return row.display_name ?? "Gost";
  const known =
    existing.find((p) => p.lineupId === row.id)?.nickname ??
    existing.find((p) => !p.isGuest && p.userId === row.user_id)?.nickname ??
    row.display_name;
  return known || null;
}

export type LiveLineupSnapshotRow = {
  id: string;
  user_id: string | null;
  filler_id: string | null;
  team: Team | string;
  is_goalkeeper: boolean;
  display_name: string | null;
  is_guest: boolean;
};

/**
 * Rebuild the on-screen lineup from DB rows.
 * Nova utakmica copies players under new lineup ids — match by user / filler
 * so nicknames do not collapse to "?".
 */
export function mergeLiveLineup(
  prev: LiveSyncLineupPlayer[],
  rows: LiveLineupSnapshotRow[],
  extraNicknames: Map<string, string> = new Map(),
): LiveSyncLineupPlayer[] {
  const teamOf = (team: Team | string): Team => (team === "B" ? "B" : "A");

  return rows.flatMap((row) => {
    if (row.is_guest) {
      const known = prev.find((p) => p.isGuest && p.fillerId === row.filler_id);
      return [
        {
          lineupId: row.id,
          userId: "",
          fillerId: row.filler_id,
          nickname: row.display_name ?? known?.nickname ?? "Gost",
          team: teamOf(row.team),
          isGoalkeeper: row.is_goalkeeper,
          isGuest: true,
        },
      ];
    }
    if (!row.user_id) return [];
    const known =
      prev.find((p) => p.lineupId === row.id) ??
      prev.find((p) => !p.isGuest && p.userId === row.user_id);
    return [
      {
        lineupId: row.id,
        userId: row.user_id,
        fillerId: null,
        nickname:
          (known?.nickname && known.nickname !== "?"
            ? known.nickname
            : extraNicknames.get(row.user_id)) ?? "?",
        team: teamOf(row.team),
        isGoalkeeper: row.is_goalkeeper,
        isGuest: false,
      },
    ];
  });
}

export function liveLineupFromRow(
  row: LiveLineupRow,
  nickname: string,
): LiveSyncLineupPlayer {
  return {
    lineupId: row.id,
    userId: row.is_guest ? "" : (row.user_id ?? ""),
    fillerId: row.filler_id,
    nickname,
    team: row.team,
    isGoalkeeper: row.is_goalkeeper,
    isGuest: row.is_guest,
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

export function applyLiveLineup(
  lineup: LiveSyncLineupPlayer[],
  eventType: string,
  row: LiveLineupRow | null,
  gameId: string,
): ApplyResult<LiveSyncLineupPlayer[]> {
  if (eventType === "DELETE") {
    if (!row) return { kind: "refresh" };
    if (row.game_id !== gameId) return { kind: "unchanged" };
    if (!lineup.some((p) => p.lineupId === row.id)) return { kind: "unchanged" };
    return { kind: "apply", value: lineup.filter((p) => p.lineupId !== row.id) };
  }

  if (!row) return { kind: "refresh" };
  if (row.game_id !== gameId) return { kind: "unchanged" };

  const nickname = nicknameForLineup(row, lineup);
  if (!nickname) return { kind: "refresh" };

  const next = liveLineupFromRow(row, nickname);

  if (eventType === "INSERT") {
    if (lineup.some((p) => p.lineupId === next.lineupId)) return { kind: "unchanged" };
    return { kind: "apply", value: [...lineup, next] };
  }

  if (eventType === "UPDATE") {
    if (!lineup.some((p) => p.lineupId === next.lineupId)) {
      return { kind: "apply", value: [...lineup, next] };
    }
    return {
      kind: "apply",
      value: lineup.map((p) => (p.lineupId === next.lineupId ? next : p)),
    };
  }

  return { kind: "refresh" };
}
