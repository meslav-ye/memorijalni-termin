import { describe, it, expect } from "vitest";
import {
  planRatingReverts,
  usersWithLaterRatingHistory,
} from "@/lib/domain/revert-ratings";

describe("planRatingReverts", () => {
  it("reverts to earliest rating_before and counts games per user/scope", () => {
    const plan = planRatingReverts(
      [
        { userId: "u1", scope: "group", ratingBefore: 1000, gameSeq: 1 },
        { userId: "u1", scope: "group", ratingBefore: 1012, gameSeq: 2 },
        { userId: "u1", scope: "global", ratingBefore: 1000, gameSeq: 1 },
        { userId: "u1", scope: "global", ratingBefore: 1012, gameSeq: 2 },
        { userId: "u2", scope: "group", ratingBefore: 1000, gameSeq: 1 },
      ],
      new Set(),
    );

    expect(plan).toEqual(
      expect.arrayContaining([
        { userId: "u1", scope: "group", rating: 1000, gamesToRemove: 2 },
        { userId: "u1", scope: "global", rating: 1000, gamesToRemove: 2 },
        { userId: "u2", scope: "group", rating: 1000, gamesToRemove: 1 },
      ]),
    );
    expect(plan).toHaveLength(3);
  });

  it("skips users who already have later rating history", () => {
    const plan = planRatingReverts(
      [
        { userId: "u1", scope: "group", ratingBefore: 1000, gameSeq: 1 },
        { userId: "u2", scope: "group", ratingBefore: 1100, gameSeq: 1 },
      ],
      new Set(["group:u1"]),
    );

    expect(plan).toEqual([
      { userId: "u2", scope: "group", rating: 1100, gamesToRemove: 1 },
    ]);
  });

  it("returns empty when there is no history", () => {
    expect(planRatingReverts([], new Set())).toEqual([]);
  });
});

describe("usersWithLaterRatingHistory", () => {
  it("flags players with games after the deleted termin", () => {
    const later = usersWithLaterRatingHistory(
      "2026-09-01T18:00:00Z",
      [1, 2],
      [
        {
          userId: "u1",
          scope: "group",
          startsAt: "2026-09-08T18:00:00Z",
          gameSeq: 1,
        },
        {
          userId: "u2",
          scope: "global",
          startsAt: "2026-08-01T18:00:00Z",
          gameSeq: 1,
        },
      ],
    );
    expect(later.has("group:u1")).toBe(true);
    expect(later.has("global:u2")).toBe(false);
  });
});
