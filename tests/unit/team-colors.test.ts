import { describe, expect, it } from "vitest";
import {
  teamHeadingClass,
  teamNameOnDarkClass,
  teamPanelClass,
} from "@/lib/domain/team-colors";

describe("teamPanelClass", () => {
  it("uses distinct light surfaces for A and B", () => {
    expect(teamPanelClass("A")).toContain("sky");
    expect(teamPanelClass("B")).toContain("amber");
    expect(teamPanelClass(null)).toContain("slate");
  });
});

describe("team name helpers", () => {
  it("keeps A/B distinguishable on dark and as headings", () => {
    expect(teamNameOnDarkClass("A")).toContain("sky");
    expect(teamNameOnDarkClass("B")).toContain("amber");
    expect(teamHeadingClass("A")).toContain("sky");
    expect(teamHeadingClass("B")).toContain("amber");
  });
});
