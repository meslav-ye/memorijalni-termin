import { describe, it, expect } from "vitest";
import { bestKeeperByGoalsAgainst } from "@/lib/domain/keepers";

describe("bestKeeperByGoalsAgainst", () => {
  it("returns null when nobody kept", () => {
    expect(
      bestKeeperByGoalsAgainst([
        { nickname: "Ana", goalsAgainst: 0, matchesAsKeeper: 0 },
      ]),
    ).toBeNull();
  });

  it("picks the lowest goals-against average among keepers", () => {
    const best = bestKeeperByGoalsAgainst([
      { nickname: "Ana", goalsAgainst: 2, matchesAsKeeper: 2 }, // 1.0
      { nickname: "Bruno", goalsAgainst: 3, matchesAsKeeper: 4 }, // 0.75
      { nickname: "Ciro", goalsAgainst: 0, matchesAsKeeper: 0 },
    ]);
    expect(best?.nickname).toBe("Bruno");
    expect(best?.average).toBe(0.75);
  });

  it("breaks ties by nickname", () => {
    const best = bestKeeperByGoalsAgainst([
      { nickname: "Zoran", goalsAgainst: 1, matchesAsKeeper: 1 },
      { nickname: "Ana", goalsAgainst: 2, matchesAsKeeper: 2 },
    ]);
    expect(best?.nickname).toBe("Ana");
  });
});
