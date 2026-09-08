import { describe, it, expect } from "vitest";
import { bestKeeperByGoalsAgainst } from "@/lib/domain/keepers";

describe("bestKeeperByGoalsAgainst", () => {
  it("returns null when nobody kept", () => {
    expect(
      bestKeeperByGoalsAgainst([
        { nickname: "Ana", goalsAgainst: 0, matchesAsKeeper: 0, isGoalkeeper: true },
      ]),
    ).toBeNull();
  });

  it("ignores outfield players even if they have keeper match stats", () => {
    expect(
      bestKeeperByGoalsAgainst([
        { nickname: "Jozo", goalsAgainst: 3, matchesAsKeeper: 1, isGoalkeeper: false },
        { nickname: "Ana", goalsAgainst: 4, matchesAsKeeper: 2, isGoalkeeper: true },
      ]),
    ).toEqual({ nickname: "Ana", average: 2 });
  });

  it("picks the lowest goals-against average among profile keepers", () => {
    const best = bestKeeperByGoalsAgainst([
      { nickname: "Ana", goalsAgainst: 2, matchesAsKeeper: 2, isGoalkeeper: true },
      { nickname: "Bruno", goalsAgainst: 3, matchesAsKeeper: 4, isGoalkeeper: true },
      { nickname: "Ciro", goalsAgainst: 0, matchesAsKeeper: 0, isGoalkeeper: true },
    ]);
    expect(best?.nickname).toBe("Bruno");
    expect(best?.average).toBe(0.75);
  });

  it("breaks ties by nickname", () => {
    const best = bestKeeperByGoalsAgainst([
      { nickname: "Zoran", goalsAgainst: 1, matchesAsKeeper: 1, isGoalkeeper: true },
      { nickname: "Ana", goalsAgainst: 2, matchesAsKeeper: 2, isGoalkeeper: true },
    ]);
    expect(best?.nickname).toBe("Ana");
  });
});
