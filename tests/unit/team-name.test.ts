import { describe, it, expect } from "vitest";
import {
  MAX_TEAM_NAME_LENGTH,
  normalizeTeamName,
  teamDisplayName,
} from "@/lib/domain/team-name";

describe("teamDisplayName", () => {
  it("falls back to Ekipa A / Ekipa B", () => {
    expect(teamDisplayName("A", null)).toBe("Ekipa A");
    expect(teamDisplayName("B", "")).toBe("Ekipa B");
    expect(teamDisplayName("A", "   ")).toBe("Ekipa A");
  });

  it("uses a custom name", () => {
    expect(teamDisplayName("A", "Bijeli")).toBe("Bijeli");
    expect(teamDisplayName("B", " Šareni ")).toBe("Šareni");
  });

  it("caps length for display", () => {
    const long = "X".repeat(MAX_TEAM_NAME_LENGTH + 5);
    expect(teamDisplayName("A", long)).toHaveLength(MAX_TEAM_NAME_LENGTH);
  });
});

describe("normalizeTeamName", () => {
  it("stores null for empty input", () => {
    expect(normalizeTeamName("")).toBeNull();
    expect(normalizeTeamName("   ")).toBeNull();
  });

  it("trims and collapses spaces", () => {
    expect(normalizeTeamName("  Bijeli   tim  ")).toBe("Bijeli tim");
  });

  it("caps length on write", () => {
    expect(normalizeTeamName("A".repeat(20))).toHaveLength(MAX_TEAM_NAME_LENGTH);
  });
});
