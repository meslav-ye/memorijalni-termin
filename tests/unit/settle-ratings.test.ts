import { describe, it, expect } from "vitest";
import { computeContributions } from "@/lib/domain/contribution";
import {
  computeDualElo,
  computeSettledRatings,
  toSettleSources,
} from "@/lib/domain/settle-ratings";
import { INITIAL_RATING, K_FACTOR } from "@/lib/domain/elo";
import type { Team } from "@/lib/domain/types";

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

describe("computeSettledRatings", () => {
  const lineup = [
    { userId: "a", team: "A" as Team, isGoalkeeper: false },
    { userId: "b", team: "B" as Team, isGoalkeeper: true },
  ];
  const events = [
    {
      type: "goal" as const,
      team: "A" as Team,
      scorerId: "a",
      assistId: null,
      elapsedSeconds: 12,
      deletedAt: null,
    },
  ];
  const ratings = [
    { userId: "a", groupRating: INITIAL_RATING, globalRating: 1200 },
    { userId: "b", groupRating: INITIAL_RATING, globalRating: 800 },
  ];

  it("merges clamped contribution onto dual Elo after-ratings", () => {
    const elo = computeDualElo({
      teamA: [ratings[0]!],
      teamB: [ratings[1]!],
      scoreA: 1,
      scoreB: 0,
    });
    const contrib = computeContributions({ lineup, events });
    const settled = computeSettledRatings({
      lineup,
      events,
      ratings,
      scoreA: 1,
      scoreB: 0,
      matchId: "m1",
      gameId: "g1",
    });

    for (const userId of ["a", "b"] as const) {
      const c = contrib.get(userId)?.clamped ?? 0;
      expect(settled.groupUpdates.find((u) => u.userId === userId)?.ratingAfter).toBe(
        elo.group.updates.find((u) => u.userId === userId)!.ratingAfter + c,
      );
      expect(settled.globalUpdates.find((u) => u.userId === userId)?.ratingAfter).toBe(
        elo.global.updates.find((u) => u.userId === userId)!.ratingAfter + c,
      );
    }
  });

  it("writes group and global history from the merged after-ratings", () => {
    const settled = computeSettledRatings({
      lineup,
      events,
      ratings,
      scoreA: 1,
      scoreB: 0,
      matchId: "m1",
      gameId: "g1",
    });
    const aGroup = settled.groupUpdates.find((u) => u.userId === "a")!;

    expect(settled.historyRows).toContainEqual({
      match_id: "m1",
      game_id: "g1",
      user_id: "a",
      scope: "group",
      rating_before: aGroup.ratingBefore,
      rating_after: aGroup.ratingAfter,
    });
    expect(settled.historyRows.filter((r) => r.scope === "global")).toHaveLength(2);
  });

  it("maps db lineup/event rows into the same settle sources", () => {
    const sources = toSettleSources(
      [
        { user_id: "a", team: "A", is_goalkeeper: false },
        { user_id: "b", team: "B", is_goalkeeper: true },
      ],
      [
        {
          type: "goal",
          team: "A",
          scorer_id: "a",
          assist_id: null,
          elapsed_seconds: 12,
          deleted_at: null,
        },
      ],
    );
    expect(sources).toEqual({ lineup, events });
  });
});
