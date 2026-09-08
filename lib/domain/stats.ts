import type { MatchForStats, PlayerStats } from "./types";

function empty(userId: string): PlayerStats {
  return {
    userId,
    goals: 0,
    assists: 0,
    ownGoals: 0,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsPerMatch: 0,
    winRate: 0,
  };
}

/**
 * Aggregates per-player stats from a list of FINISHED matches.
 *
 * Rules that are easy to miss:
 *  - Matches played are counted from the LINEUP, not from goals — someone who
 *    played and did not score still played the match.
 *  - Soft-deleted events (deleted_at) are skipped.
 *  - Own goals are tracked separately and do NOT count as goals.
 *  - Assists are counted only with a real goal, never with an own goal.
 *  - Anyone not in the lineup is excluded from stats, even if they appear in events.
 */
export function aggregateStats(matches: MatchForStats[]): PlayerStats[] {
  const byPlayer = new Map<string, PlayerStats>();

  for (const m of matches) {
    for (const { userId, team } of m.lineup) {
      if (!byPlayer.has(userId)) byPlayer.set(userId, empty(userId));
      const s = byPlayer.get(userId)!;

      s.matches += 1;

      if (m.scoreA === m.scoreB) s.draws += 1;
      else if ((team === "A") === (m.scoreA > m.scoreB)) s.wins += 1;
      else s.losses += 1;
    }

    for (const e of m.events) {
      if (e.deletedAt !== null) continue;

      if (e.type !== "goal" && e.type !== "own_goal") continue;

      if (e.scorerId) {
        const scorer = byPlayer.get(e.scorerId);
        if (scorer) {
          if (e.type === "goal") scorer.goals += 1;
          else scorer.ownGoals += 1;
        }
      }

      // Own goals have no assist.
      if (e.type === "goal" && e.assistId) {
        const assister = byPlayer.get(e.assistId);
        if (assister) assister.assists += 1;
      }
    }
  }

  return [...byPlayer.values()].map((s) => ({
    ...s,
    goalsPerMatch: s.matches === 0 ? 0 : Math.round((s.goals / s.matches) * 100) / 100,
    winRate: s.matches === 0 ? 0 : (s.wins + s.draws * 0.5) / s.matches,
  }));
}

// ---------- Attendance ----------

export type Attendance = {
  userId: string;
  played: number;
  rate: number;
  currentStreak: number;
  longestStreak: number;
};

/**
 * Attendance per player.
 *
 * @param matchIdsChronological finished match ids, OLDEST to newest
 * @param lineups               who played in which match
 */
export function aggregateAttendance(
  matchIdsChronological: string[],
  lineups: Map<string, Set<string>>,
  allPlayers: string[],
): Attendance[] {
  const total = matchIdsChronological.length;

  return allPlayers.map((userId) => {
    let played = 0;
    let currentStreak = 0;
    let longestStreak = 0;

    for (const matchId of matchIdsChronological) {
      const playedThis = lineups.get(matchId)?.has(userId) ?? false;

      if (playedThis) {
        played += 1;
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return {
      userId,
      played,
      rate: total === 0 ? 0 : played / total,
      currentStreak,
      longestStreak,
    };
  });
}
