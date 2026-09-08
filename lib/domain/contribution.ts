import type { Team } from "./types";

/** Max absolute individual contribution per game (after summing components). */
export const CONTRIBUTION_CAP = 6;

export const GOAL_POINTS = 2;
export const ASSIST_POINTS = 1;
export const OWN_GOAL_POINTS = -1;
/** All teammates: −1 per this many goals the side conceded, capped. */
export const TEAM_CONCEDED_STEP = 4;
export const TEAM_CONCEDED_PENALTY_CAP = 3;

export type ContributionEvent = {
  type: "goal" | "own_goal" | "keeper_change";
  team: Team | null;
  scorerId: string | null;
  assistId: string | null;
  elapsedSeconds: number;
  deletedAt: string | null;
};

export type ContributionLineup = {
  userId: string;
  team: Team;
  isGoalkeeper: boolean;
};

export type ContributionRow = {
  userId: string;
  /** Unclamped sum of goal/assist/OG/keeper components. */
  raw: number;
  /** raw clamped to ±CONTRIBUTION_CAP. */
  clamped: number;
  goals: number;
  assists: number;
  ownGoals: number;
  conceded: number;
};

function opposite(team: Team): Team {
  return team === "A" ? "B" : "A";
}

/**
 * Keeper contribution from goals conceded while in goal.
 * Soft bands — recreational matches often see many goals.
 */
export function keeperConcededPoints(conceded: number): number {
  if (conceded <= 2) return 2;
  if (conceded <= 4) return 1;
  if (conceded <= 6) return 0;
  if (conceded <= 9) return -1;
  if (conceded <= 12) return -2;
  return -3;
}

/**
 * Shared defensive stake: every player on a side loses points as goals against climb.
 * −⌊conceded / 4⌋, capped at −3 — enough that “only attack” leaks hurt the whole team.
 */
export function teamConcededPoints(conceded: number): number {
  if (conceded < TEAM_CONCEDED_STEP) return 0;
  const steps = Math.floor(conceded / TEAM_CONCEDED_STEP);
  return -Math.min(TEAM_CONCEDED_PENALTY_CAP, steps);
}

function keeperAt(
  lineup: ContributionLineup[],
  events: ContributionEvent[],
  team: Team,
  elapsedSeconds: number,
): string | null {
  let keeper =
    lineup.find((p) => p.team === team && p.isGoalkeeper)?.userId ?? null;

  const changes = events
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

function clamp(n: number): number {
  return Math.max(-CONTRIBUTION_CAP, Math.min(CONTRIBUTION_CAP, n));
}

/**
 * Individual rating contribution for one finished game.
 * Additive on top of team Elo; same value for group and global.
 */
export function computeContributions({
  lineup,
  events,
}: {
  lineup: ContributionLineup[];
  events: ContributionEvent[];
}): Map<string, ContributionRow> {
  const byId = new Map<string, ContributionRow>();

  for (const p of lineup) {
    byId.set(p.userId, {
      userId: p.userId,
      raw: 0,
      clamped: 0,
      goals: 0,
      assists: 0,
      ownGoals: 0,
      conceded: 0,
    });
  }

  const active = events.filter((e) => e.deletedAt === null);

  for (const e of active) {
    if (e.type === "goal" && e.scorerId && byId.has(e.scorerId)) {
      const row = byId.get(e.scorerId)!;
      row.goals += 1;
      row.raw += GOAL_POINTS;
    }
    if (e.type === "own_goal" && e.scorerId && byId.has(e.scorerId)) {
      const row = byId.get(e.scorerId)!;
      row.ownGoals += 1;
      row.raw += OWN_GOAL_POINTS;
    }
    if (e.type === "goal" && e.assistId && byId.has(e.assistId)) {
      const row = byId.get(e.assistId)!;
      row.assists += 1;
      row.raw += ASSIST_POINTS;
    }
  }

  const stoodInGoal = new Set<string>();
  for (const p of lineup) {
    if (p.isGoalkeeper) stoodInGoal.add(p.userId);
  }
  for (const e of active) {
    if (e.type === "keeper_change" && e.scorerId) stoodInGoal.add(e.scorerId);
  }

  for (const e of active) {
    if (e.type !== "goal" && e.type !== "own_goal") continue;
    if (e.team !== "A" && e.team !== "B") continue;
    const keeperId = keeperAt(lineup, events, opposite(e.team), e.elapsedSeconds);
    if (!keeperId || !byId.has(keeperId)) continue;
    byId.get(keeperId)!.conceded += 1;
  }

  for (const userId of stoodInGoal) {
    const row = byId.get(userId);
    if (!row) continue;
    row.raw += keeperConcededPoints(row.conceded);
  }

  let concededA = 0;
  let concededB = 0;
  for (const e of active) {
    if (e.type !== "goal" && e.type !== "own_goal") continue;
    if (e.team === "A") concededB += 1;
    else if (e.team === "B") concededA += 1;
  }

  const teamPenaltyA = teamConcededPoints(concededA);
  const teamPenaltyB = teamConcededPoints(concededB);
  if (teamPenaltyA !== 0 || teamPenaltyB !== 0) {
    for (const p of lineup) {
      const row = byId.get(p.userId);
      if (!row) continue;
      row.raw += p.team === "A" ? teamPenaltyA : teamPenaltyB;
    }
  }

  for (const row of byId.values()) {
    row.clamped = clamp(row.raw);
  }

  return byId;
}
