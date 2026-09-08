import { describe, expect, it } from "vitest";
import {
  formatContributionDetail,
  formatRatingBreakdown,
} from "@/lib/domain/rating-breakdown";
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

describe("formatContributionDetail", () => {
  it("formats goals and assists", () => {
    expect(
      formatContributionDetail(row({ clamped: 5, goals: 2, assists: 1 })),
    ).toBe("+5 (2G, 1A)");
  });

  it("formats zero contribution without bits", () => {
    expect(formatContributionDetail(row({ clamped: 0 }))).toBe("0");
  });

  it("formats negative with own goals", () => {
    expect(
      formatContributionDetail(row({ clamped: -1, ownGoals: 1 })),
    ).toBe("-1 (1AG)");
  });
});

describe("formatRatingBreakdown", () => {
  it("joins elo and contribution", () => {
    expect(
      formatRatingBreakdown(12, row({ clamped: 4, goals: 2 })),
    ).toBe("Elo +12 · doprinos +4 (2G)");
  });
});
