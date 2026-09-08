import { describe, expect, it } from "vitest";
import {
  assignLineupGoalkeeperFlags,
  canAssignLineupGoalkeeper,
  canChangeLineupGoalkeeper,
} from "@/lib/domain/lineup-goalkeeper";

describe("canAssignLineupGoalkeeper", () => {
  it("allows profile keepers only", () => {
    expect(canAssignLineupGoalkeeper(true)).toBe(true);
    expect(canAssignLineupGoalkeeper(false)).toBe(false);
  });
});

describe("canChangeLineupGoalkeeper", () => {
  it("allows changes only before the clock starts", () => {
    expect(canChangeLineupGoalkeeper(null)).toBe(true);
    expect(canChangeLineupGoalkeeper("2026-09-08T18:00:00Z")).toBe(false);
  });
});

describe("assignLineupGoalkeeperFlags", () => {
  it("marks the designated profile keeper, not an outfield player at index 0", () => {
    // Regression: Jozo (outfield) must never get the glove just by order.
    const flags = assignLineupGoalkeeperFlags([
      { userId: "jozo", isGoalkeeper: false },
      { userId: "zdravko", isGoalkeeper: true },
      { userId: "fran", isGoalkeeper: false },
    ]);
    expect(flags).toEqual([
      { userId: "jozo", lineupIsGoalkeeper: false },
      { userId: "zdravko", lineupIsGoalkeeper: true },
      { userId: "fran", lineupIsGoalkeeper: false },
    ]);
  });

  it("marks only the first profile keeper when extras play outfield", () => {
    const flags = assignLineupGoalkeeperFlags([
      { userId: "gk1", isGoalkeeper: true },
      { userId: "out", isGoalkeeper: false },
      { userId: "gk2", isGoalkeeper: true },
    ]);
    expect(flags.filter((f) => f.lineupIsGoalkeeper).map((f) => f.userId)).toEqual([
      "gk1",
    ]);
  });

  it("marks nobody when the team has no profile keeper", () => {
    const flags = assignLineupGoalkeeperFlags([
      { userId: "a", isGoalkeeper: false },
      { userId: "b", isGoalkeeper: false },
    ]);
    expect(flags.every((f) => !f.lineupIsGoalkeeper)).toBe(true);
  });
});
