import { describe, it, expect } from "vitest";
import { computeDualElo } from "@/lib/domain/settle-ratings";
import { INITIAL_RATING, K_FACTOR } from "@/lib/domain/elo";

describe("computeDualElo", () => {
  it("updates group and global from their own before-ratings", () => {
    const r = computeDualElo({
      teamA: [
        { userId: "a", groupRating: INITIAL_RATING, globalRating: 1200 },
      ],
      teamB: [
        { userId: "b", groupRating: INITIAL_RATING, globalRating: 800 },
      ],
      scoreA: 1,
      scoreB: 0,
    });

    // Equal group ratings → classic half K for a win.
    expect(r.group.deltaA).toBe(K_FACTOR / 2);
    expect(r.group.updates.find((u) => u.userId === "a")?.ratingBefore).toBe(
      INITIAL_RATING,
    );

    // A is stronger globally, so winning yields fewer than half K points.
    expect(r.global.deltaA).toBeLessThan(K_FACTOR / 2);
    expect(r.global.updates.find((u) => u.userId === "a")?.ratingBefore).toBe(1200);
    expect(r.global.updates.find((u) => u.userId === "b")?.ratingBefore).toBe(800);
  });

  it("returns empty when a team is missing", () => {
    const r = computeDualElo({
      teamA: [],
      teamB: [{ userId: "b", groupRating: 1000, globalRating: 1000 }],
      scoreA: 1,
      scoreB: 0,
    });
    expect(r.group.updates).toEqual([]);
    expect(r.global.updates).toEqual([]);
  });
});
