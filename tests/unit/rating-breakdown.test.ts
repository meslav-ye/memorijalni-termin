import { describe, expect, it } from "vitest";
import { formatRatingBreakdown } from "@/lib/domain/rating-breakdown";
import type { ContributionRow } from "@/lib/domain/contribution";

const row = (partial: Partial<ContributionRow>): ContributionRow => ({
  userId: "u1",
  raw: 0,
  clamped: 0,
  goals: 0,
  assists: 0,
  ownGoals: 0,
  conceded: 0,
  ...partial,
});

describe("formatRatingBreakdown", () => {
  it("joins elo and contribution with goals and assists", () => {
    expect(
      formatRatingBreakdown(0, row({ clamped: 5, goals: 2, assists: 1 })),
    ).toBe("Elo 0 · doprinos +5 (2G, 1A)");
  });

  it("formats zero contribution without bits", () => {
    expect(formatRatingBreakdown(3, row({ clamped: 0 }))).toBe(
      "Elo +3 · doprinos 0",
    );
  });

  it("formats negative contribution with own goals", () => {
    expect(
      formatRatingBreakdown(-2, row({ clamped: -1, ownGoals: 1 })),
    ).toBe("Elo -2 · doprinos -1 (1AG)");
  });

  it("joins elo and contribution", () => {
    expect(
      formatRatingBreakdown(12, row({ clamped: 4, goals: 2 })),
    ).toBe("Elo +12 · doprinos +4 (2G)");
  });
});
