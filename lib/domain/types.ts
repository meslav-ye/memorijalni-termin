/**
 * Domain-layer types.
 *
 * This layer knows nothing about React, Next, or Supabase. It takes plain
 * objects and returns plain objects, so the hardest parts of the app —
 * waitlist, team balancing, Elo, stopwatch, stats — are tested in
 * milliseconds, without a database or a browser.
 */

export type Team = "A" | "B";

// ---------- Signups and waitlist ----------

export type SignupRow = {
  userId: string;
  /** ISO 8601. Determines queue place when manualOrder is not set. */
  signedUpAt: string;
  /** Admin manually reordered the queue; null means "go by signup time". */
  manualOrder: number | null;
  /** Soft cancel: the row stays, but is not counted. */
  cancelledAt: string | null;
};

export type SignupBuckets = {
  /** userIds who are in, in order. */
  confirmed: string[];
  /** userIds on the waitlist, in order. */
  waitlist: string[];
};

// ---------- Team balancing ----------

export type PlayerForBalancing = {
  userId: string;
  rating: number;
  isGoalkeeper: boolean;
};

export type SuggestedTeams = {
  teamA: PlayerForBalancing[];
  teamB: PlayerForBalancing[];
  /** Messages in Croatian, e.g. "Ekipa B nema golmana." */
  warnings: string[];
};

// ---------- Stopwatch ----------

export type MatchTimerState = {
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedSeconds: number;
};

// ---------- Match events ----------

export type GoalEventLite = {
  id: string;
  type: "goal" | "own_goal";
  scorerId: string | null;
  createdAt: string;
  deletedAt: string | null;
};

// ---------- Stats ----------

export type MatchForStats = {
  matchId: string;
  scoreA: number;
  scoreB: number;
  /** For records tied to a match, not a player (e.g. biggest win). */
  startsAt?: string;
  lineup: { userId: string; team: Team }[];
  events: {
    type: "goal" | "own_goal";
    scorerId: string | null;
    assistId: string | null;
    deletedAt: string | null;
  }[];
};

export type PlayerStats = {
  userId: string;
  goals: number;
  assists: number;
  ownGoals: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsPerMatch: number;
  winRate: number;
};
