import type { MatchForStats, Team } from "./types";

export type SingleGameRecord = {
  value: number;
  userId: string;
  startsAt: string | null;
};

function opposite(team: Team): Team {
  return team === "A" ? "B" : "A";
}

/**
 * Who was in goal for `team` at `elapsedSeconds` (lineup starter + keeper_change).
 * Change at the same second as a goal counts as already applied.
 */
function keeperAt(
  match: MatchForStats,
  team: Team,
  elapsedSeconds: number,
): string | null {
  let keeper =
    match.lineup.find((p) => p.team === team && p.isGoalkeeper)?.userId ?? null;

  const changes = match.events
    .filter(
      (e) =>
        e.type === "keeper_change" &&
        e.team === team &&
        e.deletedAt === null &&
        e.scorerId !== null,
    )
    .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);

  for (const c of changes) {
    if (c.elapsedSeconds > elapsedSeconds) break;
    keeper = c.scorerId;
  }

  return keeper;
}

function keepersWhoStood(match: MatchForStats): Set<string> {
  const ids = new Set<string>();
  for (const p of match.lineup) {
    if (p.isGoalkeeper) ids.add(p.userId);
  }
  for (const e of match.events) {
    if (e.type !== "keeper_change" || e.deletedAt !== null || !e.scorerId) continue;
    ids.add(e.scorerId);
  }
  return ids;
}

/**
 * Most goals by one player in a single finished game.
 * Soft-deleted events ignored; own goals do not count.
 */
export function bestGoalsInSingleGame(
  matches: MatchForStats[],
): SingleGameRecord | null {
  let best: SingleGameRecord | null = null;

  for (const m of matches) {
    const counts = new Map<string, number>();
    for (const e of m.events) {
      if (e.type !== "goal" || e.deletedAt !== null || !e.scorerId) continue;
      counts.set(e.scorerId, (counts.get(e.scorerId) ?? 0) + 1);
    }
    for (const [userId, n] of counts) {
      if (!best || n > best.value) {
        best = { value: n, userId, startsAt: m.startsAt ?? null };
      }
    }
  }

  return best;
}

/**
 * Highest goals + assists by one player in a single finished game.
 */
export function bestGoalsAssistsInSingleGame(
  matches: MatchForStats[],
): SingleGameRecord | null {
  let best: SingleGameRecord | null = null;

  for (const m of matches) {
    const counts = new Map<string, number>();
    for (const e of m.events) {
      if (e.deletedAt !== null) continue;
      if (e.type !== "goal") continue;
      if (e.scorerId) {
        counts.set(e.scorerId, (counts.get(e.scorerId) ?? 0) + 1);
      }
      if (e.assistId) {
        counts.set(e.assistId, (counts.get(e.assistId) ?? 0) + 1);
      }
    }
    for (const [userId, n] of counts) {
      if (!best || n > best.value) {
        best = { value: n, userId, startsAt: m.startsAt ?? null };
      }
    }
  }

  return best;
}

/**
 * Fewest goals conceded while in goal in a single game.
 * Any player who stood in goal that match (lineup flag or keeper_change).
 */
export function fewestGoalsAgainstInSingleGame(
  matches: MatchForStats[],
): SingleGameRecord | null {
  let best: SingleGameRecord | null = null;

  for (const m of matches) {
    const stood = keepersWhoStood(m);
    if (stood.size === 0) continue;

    const against = new Map<string, number>();
    for (const id of stood) against.set(id, 0);

    for (const e of m.events) {
      if (e.deletedAt !== null) continue;
      if (e.type !== "goal" && e.type !== "own_goal") continue;
      if (e.team !== "A" && e.team !== "B") continue;
      const keeperId = keeperAt(m, opposite(e.team), e.elapsedSeconds);
      if (!keeperId || !against.has(keeperId)) continue;
      against.set(keeperId, (against.get(keeperId) ?? 0) + 1);
    }

    for (const [userId, n] of against) {
      if (!best || n < best.value) {
        best = { value: n, userId, startsAt: m.startsAt ?? null };
      }
    }
  }

  return best;
}
