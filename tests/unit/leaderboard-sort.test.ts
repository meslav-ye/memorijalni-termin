import { describe, expect, it } from "vitest";
import {
  defaultLeaderboardOrder,
  nextSortState,
  sortLeaderboardRows,
  type SortableLeaderboardRow,
} from "@/lib/domain/leaderboard-sort";

const row = (
  partial: Partial<SortableLeaderboardRow> & Pick<SortableLeaderboardRow, "userId" | "nickname">,
): SortableLeaderboardRow => ({
  goals: 0,
  assists: 0,
  ownGoals: 0,
  matches: 0,
  goalsPerMatch: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  winRate: 0,
  rating: 1000,
  ...partial,
});

describe("sortLeaderboardRows", () => {
  it("sorts goals descending then nickname", () => {
    const rows = [
      row({ userId: "1", nickname: "Bruno", goals: 2 }),
      row({ userId: "2", nickname: "Ana", goals: 5 }),
      row({ userId: "3", nickname: "Ciro", goals: 5 }),
    ];
    expect(sortLeaderboardRows(rows, "goals", "desc").map((r) => r.nickname)).toEqual([
      "Ana",
      "Ciro",
      "Bruno",
    ]);
  });

  it("sorts rating ascending", () => {
    const rows = [
      row({ userId: "1", nickname: "A", rating: 1012 }),
      row({ userId: "2", nickname: "B", rating: 988 }),
    ];
    expect(sortLeaderboardRows(rows, "rating", "asc").map((r) => r.rating)).toEqual([
      988, 1012,
    ]);
  });

  it("sorts P-N-P by wins then draws then losses", () => {
    const rows = [
      row({ userId: "1", nickname: "A", wins: 1, draws: 0, losses: 0 }),
      row({ userId: "2", nickname: "B", wins: 1, draws: 1, losses: 0 }),
      row({ userId: "3", nickname: "C", wins: 0, draws: 0, losses: 1 }),
    ];
    expect(sortLeaderboardRows(rows, "record", "desc").map((r) => r.nickname)).toEqual([
      "B",
      "A",
      "C",
    ]);
  });
});

describe("nextSortState", () => {
  it("starts at desc for a new column", () => {
    expect(nextSortState(null, "desc", "goals")).toEqual({ key: "goals", dir: "desc" });
  });

  it("toggles direction on the same column", () => {
    expect(nextSortState("goals", "desc", "goals")).toEqual({ key: "goals", dir: "asc" });
    expect(nextSortState("goals", "asc", "goals")).toEqual({ key: "goals", dir: "desc" });
  });
});

describe("defaultLeaderboardOrder", () => {
  it("orders by rating, then goals, assists", () => {
    const rows = [
      row({ userId: "1", nickname: "A", goals: 5, assists: 2, rating: 1000 }),
      row({ userId: "2", nickname: "B", goals: 1, assists: 0, rating: 1050 }),
      row({ userId: "3", nickname: "C", goals: 3, assists: 3, rating: 1000 }),
    ];
    expect(defaultLeaderboardOrder(rows).map((r) => r.nickname)).toEqual(["B", "A", "C"]);
  });
});
