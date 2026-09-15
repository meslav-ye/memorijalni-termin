import { describe, expect, it } from "vitest";
import {
  formatRatingBreakdown,
  ratingBreakdownLines,
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
  goalPoints: 0,
  assistPoints: 0,
  ownGoalPoints: 0,
  keeperPoints: 0,
  teamConcededPoints: 0,
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

describe("ratingBreakdownLines", () => {
  it("always includes Elo and Ukupno and hides zero components", () => {
    expect(
      ratingBreakdownLines({
        eloDelta: 8,
        delta: 12,
        contrib: row({
          goals: 2,
          goalPoints: 4,
          assists: 1,
          assistPoints: 1,
          teamConcededPoints: -1,
          raw: 4,
          clamped: 4,
        }),
      }),
    ).toEqual([
      { label: "Timski Elo", points: 8 },
      { label: "Golovi (2)", points: 4 },
      { label: "Asistencije (1)", points: 1 },
      { label: "Obrana ekipe", points: -1 },
      { label: "Ukupno", points: 12 },
    ]);
  });

  it("shows clamp when raw differs from clamped", () => {
    expect(
      ratingBreakdownLines({
        eloDelta: 0,
        delta: 12,
        contrib: row({
          goals: 9,
          goalPoints: 13,
          raw: 13,
          clamped: 12,
        }),
      }),
    ).toEqual([
      { label: "Timski Elo", points: 0 },
      { label: "Golovi (9)", points: 13 },
      { label: "Ograničenje ±12", points: -1 },
      { label: "Ukupno", points: 12 },
    ]);
  });

  it("shows keeper band with conceded count", () => {
    expect(
      ratingBreakdownLines({
        eloDelta: -4,
        delta: -2,
        contrib: row({
          conceded: 1,
          keeperPoints: 2,
          raw: 2,
          clamped: 2,
        }),
      }),
    ).toEqual([
      { label: "Timski Elo", points: -4 },
      { label: "Golman (primljeno 1)", points: 2 },
      { label: "Ukupno", points: -2 },
    ]);
  });
});
