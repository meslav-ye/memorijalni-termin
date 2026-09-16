import { describe, expect, it } from "vitest";
import { groupTag } from "@/lib/data/groups";
import { leaderboardTag } from "@/lib/data/leaderboard";

describe("groupTag", () => {
  it("is per-group and distinct from the leaderboard tag", () => {
    expect(groupTag("g1")).toBe("group-g1");
    expect(groupTag("g1")).not.toBe(groupTag("g2"));
    expect(groupTag("g1")).not.toBe(leaderboardTag("g1"));
  });
});
