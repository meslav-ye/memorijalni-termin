import { describe, it, expect } from "vitest";
import { bestKeeperByGoalsAgainst } from "@/lib/domain/keepers";

describe("bestKeeperByGoalsAgainst", () => {
  it("returns null when nobody kept", () => {
    expect(
      bestKeeperByGoalsAgainst([
        {
          userId: "a",
          nickname: "Ana",
          goalsAgainst: 0,
          matchesAsKeeper: 0,
          isGoalkeeper: true,
        },
      ]),
    ).toBeNull();
  });

  it("ignores outfield players even if they have keeper match stats", () => {
    expect(
      bestKeeperByGoalsAgainst([
        {
          userId: "j",
          nickname: "Jozo",
          goalsAgainst: 3,
          matchesAsKeeper: 1,
          isGoalkeeper: false,
        },
        {
          userId: "a",
          nickname: "Ana",
          goalsAgainst: 4,
          matchesAsKeeper: 2,
          isGoalkeeper: true,
        },
      ]),
    ).toEqual({ userId: "a", nickname: "Ana", average: 2 });
  });

  it("picks the lowest goals-against average among profile keepers", () => {
    const best = bestKeeperByGoalsAgainst([
      {
        userId: "a",
        nickname: "Ana",
        goalsAgainst: 2,
        matchesAsKeeper: 2,
        isGoalkeeper: true,
      },
      {
        userId: "b",
        nickname: "Bruno",
        goalsAgainst: 3,
        matchesAsKeeper: 4,
        isGoalkeeper: true,
      },
      {
        userId: "c",
        nickname: "Ciro",
        goalsAgainst: 0,
        matchesAsKeeper: 0,
        isGoalkeeper: true,
      },
    ]);
    expect(best?.userId).toBe("b");
    expect(best?.nickname).toBe("Bruno");
    expect(best?.average).toBe(0.75);
  });

  it("breaks ties by nickname", () => {
    const best = bestKeeperByGoalsAgainst([
      {
        userId: "z",
        nickname: "Zoran",
        goalsAgainst: 1,
        matchesAsKeeper: 1,
        isGoalkeeper: true,
      },
      {
        userId: "a",
        nickname: "Ana",
        goalsAgainst: 2,
        matchesAsKeeper: 2,
        isGoalkeeper: true,
      },
    ]);
    expect(best?.userId).toBe("a");
    expect(best?.nickname).toBe("Ana");
  });
});
