import type { Team } from "./types";

export type LiveScoreEvent = {
  type: string;
  team: Team | null;
  scorerId: string | null;
  scorerFillerId: string | null;
  deletedAt: string | null;
};

export type LiveScorePlayer = {
  userId: string;
  fillerId: string | null;
  isGuest: boolean;
};

/** Goal tally shown on the live scoreboard. Own goals count for the credited team. */
export function liveScore(events: LiveScoreEvent[]): { a: number; b: number } {
  const goals = events.filter(
    (e) => e.deletedAt === null && (e.type === "goal" || e.type === "own_goal"),
  );
  return {
    a: goals.filter((e) => e.team === "A").length,
    b: goals.filter((e) => e.team === "B").length,
  };
}

/** Goals shown next to a player on the live pitch. Own goals do not count here. */
export function livePlayerGoals(events: LiveScoreEvent[], player: LiveScorePlayer): number {
  return events.filter((e) => {
    if (e.deletedAt !== null || e.type !== "goal") return false;
    if (player.isGuest) return e.scorerFillerId === player.fillerId;
    return e.scorerId === player.userId;
  }).length;
}

export type LivePhase = "live" | "awaiting_next" | "termin_done" | "idle";

/**
 * Which live-screen chrome to show: running game, "Nova utakmica", or locked.
 */
export function livePhase(state: {
  matchStatus: string;
  gameStatus: string;
  startedAt: string | null;
}): LivePhase {
  if (state.matchStatus === "zavrsen") return "termin_done";
  if (state.matchStatus !== "u_tijeku") return "idle";
  if (state.gameStatus === "u_tijeku" && state.startedAt != null) return "live";
  if (
    state.gameStatus === "zavrsena" ||
    (state.gameStatus === "u_tijeku" && state.startedAt == null)
  ) {
    return "awaiting_next";
  }
  return "idle";
}
