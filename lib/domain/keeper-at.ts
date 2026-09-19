import type { Team } from "./types";

export function opposite(team: Team): Team {
  return team === "A" ? "B" : "A";
}

/**
 * Who was in goal for `team` at `elapsedSeconds`, from the starting lineup
 * and the keeper_change sequence.
 *
 * A change at exactly the same second as a goal counts as already applied —
 * the new keeper is the one who concedes.
 */
export function keeperAt({
  lineup,
  events,
  team,
  elapsedSeconds,
}: {
  lineup: readonly { userId: string; team: Team; isGoalkeeper: boolean }[];
  events: readonly {
    type: "goal" | "own_goal" | "keeper_change";
    team: Team | null;
    scorerId: string | null;
    elapsedSeconds: number;
    deletedAt: string | null;
  }[];
  team: Team;
  elapsedSeconds: number;
}): string | null {
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
