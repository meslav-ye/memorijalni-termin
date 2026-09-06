/**
 * Tipovi domenskog sloja.
 *
 * Ovaj sloj ne zna nista o Reactu, Nextu ni Supabaseu. Prima obicne objekte i
 * vraca obicne objekte, pa se najtezi dijelovi aplikacije — lista cekanja,
 * balansiranje ekipa, Elo, stoperica, statistika — testiraju u milisekundama,
 * bez baze i bez preglednika.
 */

export type Team = "A" | "B";

// ---------- Prijave i lista cekanja ----------

export type SignupRow = {
  userId: string;
  /** ISO 8601. Odredjuje mjesto u redu kad manualOrder nije postavljen. */
  signedUpAt: string;
  /** Admin je rucno preuredio red; null znaci "idi po vremenu prijave". */
  manualOrder: number | null;
  /** Meko otkazivanje: redak ostaje, ali se ne broji. */
  cancelledAt: string | null;
};

export type SignupBuckets = {
  /** userId-evi koji su unutra, redom. */
  confirmed: string[];
  /** userId-evi na listi cekanja, redom. */
  waitlist: string[];
};

// ---------- Slaganje ekipa ----------

export type PlayerForBalancing = {
  userId: string;
  rating: number;
  isGoalkeeper: boolean;
};

export type SuggestedTeams = {
  teamA: PlayerForBalancing[];
  teamB: PlayerForBalancing[];
  /** Poruke na hrvatskom, npr. "Ekipa B nema golmana." */
  warnings: string[];
};

// ---------- Stoperica ----------

export type MatchTimerState = {
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedSeconds: number;
};

// ---------- Dogadjaji ----------

export type GoalEventLite = {
  id: string;
  type: "goal" | "own_goal";
  scorerId: string | null;
  createdAt: string;
  deletedAt: string | null;
};

// ---------- Statistika ----------

export type MatchForStats = {
  matchId: string;
  scoreA: number;
  scoreB: number;
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
