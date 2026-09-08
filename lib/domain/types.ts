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
  /** Session (termin) id — used for attendance and sazetak links. */
  matchId: string;
  /** Finished game (utakmica) id. Stats/wins/goals are per game. */
  gameId?: string;
  scoreA: number;
  scoreB: number;
  /** For records tied to a game, not a player (e.g. biggest win). */
  startsAt?: string;
  lineup: { userId: string; team: Team; isGoalkeeper: boolean }[];
  events: {
    type: "goal" | "own_goal" | "keeper_change";
    scorerId: string | null;
    assistId: string | null;
    /** Team credited with the goal, or the team changing keepers. */
    team: Team | null;
    elapsedSeconds: number;
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

export type KeeperStats = {
  userId: string;
  /** Goals conceded while this player was in goal. */
  goalsAgainst: number;
  /** Matches spent entirely in goal with zero goals against. */
  cleanSheets: number;
  /** Matches in which the player was in goal at any point. */
  matchesAsKeeper: number;
};
