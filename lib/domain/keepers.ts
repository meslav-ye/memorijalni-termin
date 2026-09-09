import type { KeeperStats, MatchForStats, Team } from "./types";

function empty(userId: string): KeeperStats {
  return {
    userId,
    goalsAgainst: 0,
    cleanSheets: 0,
    matchesAsKeeper: 0,
  };
}

export type KeeperGoalsAgainstRow = {
  userId: string;
  nickname: string;
  goalsAgainst: number;
  matchesAsKeeper: number;
  /** Profile flag — only these belong on the keeper leader card. */
  isGoalkeeper: boolean;
};

/**
 * Keeper with the lowest goals conceded per match spent in goal.
 * Clean sheets are rare in recreational games; this is the useful leaderboard.
 * Only players marked as goalkeepers on their profile are eligible.
 */
export function bestKeeperByGoalsAgainst(
  rows: KeeperGoalsAgainstRow[],
): { userId: string; nickname: string; average: number } | null {
  const keepers = rows.filter((r) => r.isGoalkeeper && r.matchesAsKeeper > 0);
  if (keepers.length === 0) return null;

  const best = [...keepers].sort((a, b) => {
    const avgA = a.goalsAgainst / a.matchesAsKeeper;
    const avgB = b.goalsAgainst / b.matchesAsKeeper;
    return avgA - avgB || a.nickname.localeCompare(b.nickname, "hr");
  })[0]!;

  return {
    userId: best.userId,
    nickname: best.nickname,
    average: best.goalsAgainst / best.matchesAsKeeper,
  };
}

function opposite(team: Team): Team {
  return team === "A" ? "B" : "A";
}

/**
 * Who was in goal for `team` at `elapsedSeconds`, from the starting lineup
 * and the keeper_change sequence.
 *
 * A change at exactly the same second as a goal counts as already applied —
 * the new keeper is the one who concedes.
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

/**
 * True when the player started in goal and no other player took over for that
 * team — v1 clean sheets require the entire match in goal.
 */
function wasFullMatchKeeper(match: MatchForStats, userId: string, team: Team): boolean {
  const starter = match.lineup.find((p) => p.team === team && p.isGoalkeeper)?.userId;
  if (starter !== userId) return false;

  return match.events
    .filter(
      (e) =>
        e.type === "keeper_change" &&
        e.team === team &&
        e.deletedAt === null &&
        e.scorerId !== null,
    )
    .every((e) => e.scorerId === userId);
}

/**
 * Aggregates goalkeeper stats from finished matches.
 *
 * - Only players in `profileKeeperIds` (profile "igram golmana") are tracked.
 *   Outfield players who stand in when a team has no keeper must not appear
 *   on "fewest conceded" — that rotation is not real keeper play.
 * - Conceding team is always the opposite of the goal event's `team`
 *   (credited side). Own goals use the same polarity — do not special-case.
 * - Clean sheet only if the tracked keeper was in goal the entire match and
 *   conceded nothing.
 */
export function aggregateKeeperStats(
  matches: MatchForStats[],
  profileKeeperIds: ReadonlySet<string>,
): KeeperStats[] {
  const byPlayer = new Map<string, KeeperStats>();

  const ensure = (userId: string) => {
    if (!byPlayer.has(userId)) byPlayer.set(userId, empty(userId));
    return byPlayer.get(userId)!;
  };

  for (const m of matches) {
    const keepersThisMatch = new Set<string>();
    const goalsAgainstThisMatch = new Map<string, number>();

    for (const p of m.lineup) {
      if (p.isGoalkeeper && profileKeeperIds.has(p.userId)) {
        keepersThisMatch.add(p.userId);
      }
    }
    for (const e of m.events) {
      if (e.type !== "keeper_change" || e.deletedAt !== null || !e.scorerId) continue;
      if (!profileKeeperIds.has(e.scorerId)) continue;
      keepersThisMatch.add(e.scorerId);
    }

    for (const e of m.events) {
      if (e.deletedAt !== null) continue;
      if (e.type !== "goal" && e.type !== "own_goal") continue;
      if (e.team !== "A" && e.team !== "B") continue;

      const concedingTeam = opposite(e.team);
      const keeperId = keeperAt(m, concedingTeam, e.elapsedSeconds);
      if (!keeperId || !profileKeeperIds.has(keeperId)) continue;

      keepersThisMatch.add(keeperId);
      goalsAgainstThisMatch.set(
        keeperId,
        (goalsAgainstThisMatch.get(keeperId) ?? 0) + 1,
      );
    }

    for (const userId of keepersThisMatch) {
      const s = ensure(userId);
      s.matchesAsKeeper += 1;
      s.goalsAgainst += goalsAgainstThisMatch.get(userId) ?? 0;

      const team =
        m.lineup.find((p) => p.userId === userId)?.team ??
        m.events.find(
          (e) =>
            e.type === "keeper_change" &&
            e.scorerId === userId &&
            e.deletedAt === null &&
            (e.team === "A" || e.team === "B"),
        )?.team;

      if (
        (team === "A" || team === "B") &&
        wasFullMatchKeeper(m, userId, team) &&
        (goalsAgainstThisMatch.get(userId) ?? 0) === 0
      ) {
        s.cleanSheets += 1;
      }
    }
  }

  return [...byPlayer.values()];
}
