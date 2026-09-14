import { describe, it, expect } from "vitest";
import {
  defaultGuestTeam,
  matchHeadcount,
  normalizeFillerName,
  registeredLineupOnly,
  signupCapacity,
} from "@/lib/domain/fillers";

describe("normalizeFillerName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeFillerName("  Marko   K.  ")).toBe("Marko K.");
  });

  it("rejects empty and too long", () => {
    expect(normalizeFillerName("   ")).toBeNull();
    expect(normalizeFillerName("a".repeat(41))).toBeNull();
  });
});

describe("signupCapacity", () => {
  it("reserves filler slots from capacity", () => {
    expect(signupCapacity(10, 2)).toBe(8);
    expect(signupCapacity(10, 12)).toBe(0);
  });
});

describe("matchHeadcount", () => {
  it("sums signups and fillers", () => {
    expect(matchHeadcount(8, 2)).toBe(10);
  });
});

describe("registeredLineupOnly", () => {
  it("drops guest rows", () => {
    const rows = registeredLineupOnly([
      { userId: "a1", team: "A", isGoalkeeper: false },
      { userId: null, team: "B", isGoalkeeper: true, isGuest: true },
    ]);
    expect(rows).toEqual([{ userId: "a1", team: "A", isGoalkeeper: false }]);
  });
});

describe("defaultGuestTeam", () => {
  it("assigns to smaller team", () => {
    expect(defaultGuestTeam(3, 5)).toBe("A");
    expect(defaultGuestTeam(5, 3)).toBe("B");
    expect(defaultGuestTeam(4, 4)).toBe("A");
  });
});
