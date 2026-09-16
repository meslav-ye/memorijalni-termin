import { describe, expect, it } from "vitest";
import { matchSummaryTag } from "@/lib/data/match-summary";
import { groupTag } from "@/lib/data/groups";
import { leaderboardTag } from "@/lib/data/leaderboard";

describe("matchSummaryTag", () => {
  it("is per-match and distinct from group and leaderboard tags", () => {
    expect(matchSummaryTag("m1")).toBe("match-summary-m1");
    expect(matchSummaryTag("m1")).not.toBe(matchSummaryTag("m2"));
    expect(matchSummaryTag("g1")).not.toBe(groupTag("g1"));
    expect(matchSummaryTag("g1")).not.toBe(leaderboardTag("g1"));
  });
});
