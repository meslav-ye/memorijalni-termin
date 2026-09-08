import { describe, it, expect } from "vitest";
import {
  computeContributions,
  keeperConcededPoints,
  CONTRIBUTION_CAP,
} from "@/lib/domain/contribution";
import type { Team } from "@/lib/domain/types";

const lineup = (
  rows: { id: string; team: Team; gk?: boolean }[],
) =>
  rows.map((r) => ({
    userId: r.id,
    team: r.team,
    isGoalkeeper: r.gk ?? false,
  }));

const goal = (
  team: Team,
  scorerId: string,
  elapsed: number,
  assistId: string | null = null,
) => ({
  type: "goal" as const,
  team,
  scorerId,
  assistId,
  elapsedSeconds: elapsed,
  deletedAt: null,
});

const ownGoal = (creditedTeam: Team, scorerId: string, elapsed: number) => ({
  type: "own_goal" as const,
  team: creditedTeam,
  scorerId,
  assistId: null,
  elapsedSeconds: elapsed,
  deletedAt: null,
});

const keeperChange = (team: Team, newKeeperId: string, elapsed: number) => ({
  type: "keeper_change" as const,
  team,
  scorerId: newKeeperId,
  assistId: null,
  elapsedSeconds: elapsed,
  deletedAt: null,
});

describe("keeperConcededPoints", () => {
  it("rewards few conceded, zero mid band, then penalties", () => {
    expect(keeperConcededPoints(0)).toBe(2);
    expect(keeperConcededPoints(2)).toBe(2);
    expect(keeperConcededPoints(3)).toBe(1);
    expect(keeperConcededPoints(4)).toBe(1);
    expect(keeperConcededPoints(5)).toBe(0);
    expect(keeperConcededPoints(6)).toBe(0);
    expect(keeperConcededPoints(7)).toBe(-1);
    expect(keeperConcededPoints(9)).toBe(-1);
    expect(keeperConcededPoints(10)).toBe(-2);
    expect(keeperConcededPoints(12)).toBe(-2);
    expect(keeperConcededPoints(13)).toBe(-3);
    expect(keeperConcededPoints(20)).toBe(-3);
  });
});

describe("computeContributions", () => {
  it("awards goal and assist points", () => {
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
        { id: "b2", team: "B" },
      ]),
      events: [goal("A", "a2", 10, "a1")],
    });
    expect(byId.get("a2")?.raw).toBe(2);
    expect(byId.get("a1")?.raw).toBe(1 + 2); // assist + keeper 0 conceded → +2
    expect(byId.get("a2")?.clamped).toBe(2);
  });

  it("penalises own-goal scorer", () => {
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "b1", team: "B", gk: true },
      ]),
      events: [ownGoal("B", "a1", 5)], // A put it in own net → B credited
    });
    // a1: OG -1 + keeper conceded 1 → band +2 → raw +1
    expect(byId.get("a1")?.raw).toBe(-1 + 2);
    expect(byId.get("b1")?.raw).toBe(2); // 0 conceded
  });

  it("ignores deleted events", () => {
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "b1", team: "B", gk: true },
      ]),
      events: [
        {
          ...goal("A", "a1", 1),
          deletedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(byId.get("a1")?.raw).toBe(2); // keeper only
  });

  it("splits conceded across keeper changes", () => {
    // B scores 4 against A: first 2 while a1 in goal, next 2 after change to a2
    const events = [
      goal("B", "b1", 10),
      goal("B", "b1", 20),
      keeperChange("A", "a2", 25),
      goal("B", "b1", 30),
      goal("B", "b1", 40),
    ];
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
      ]),
      events,
    });
    expect(byId.get("a1")?.conceded).toBe(2);
    expect(byId.get("a2")?.conceded).toBe(2);
    // keeper band +2 each, team conceded 4 → −1 each
    expect(byId.get("a1")?.raw).toBe(2 - 1);
    expect(byId.get("a2")?.raw).toBe(2 - 1);
  });

  it("awards +2 per goal for the first four, then +1", () => {
    const goals = [1, 2, 3, 4, 5, 6].map((t) => goal("A", "a2", t));
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
      ]),
      events: goals,
    });
    // 4×2 + 2×1 = 10; assists unchanged elsewhere
    expect(byId.get("a2")?.goals).toBe(6);
    expect(byId.get("a2")?.raw).toBe(10);
  });

  it("clamps total contribution to ±cap", () => {
    // 9 goals = 4×2 + 5×1 = 13 → clamp to CONTRIBUTION_CAP
    const goals = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => goal("A", "a2", t));
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
      ]),
      events: goals,
    });
    expect(byId.get("a2")?.raw).toBe(13);
    expect(byId.get("a2")?.clamped).toBe(CONTRIBUTION_CAP);
  });

  it("gives outfield players zero keeper component", () => {
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
      ]),
      events: [goal("B", "b1", 10)],
    });
    expect(byId.get("a2")?.conceded).toBe(0);
    expect(byId.get("a2")?.raw).toBe(0);
    expect(byId.get("a1")?.conceded).toBe(1);
  });

  it("applies stepped team conceded penalty to every teammate", () => {
    // 4 conceded → −1 each; 8 → −2; outfield has no other components
    const four = Array.from({ length: 4 }, (_, i) => goal("B", "b1", i + 1));
    const at4 = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
      ]),
      events: four,
    });
    expect(at4.get("a2")?.raw).toBe(-1);
    expect(at4.get("a1")?.raw).toBe(1 - 1); // keeper band +1 (3–4) + team −1

    const eight = Array.from({ length: 8 }, (_, i) => goal("B", "b1", i + 1));
    const at8 = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
      ]),
      events: eight,
    });
    expect(at8.get("a2")?.raw).toBe(-2);
    expect(at8.get("a1")?.raw).toBe(-1 - 2); // keeper −1 (7–9) + team −2
  });

  it("caps team conceded penalty at −3", () => {
    const events = Array.from({ length: 16 }, (_, i) => goal("B", "b1", i + 1));
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
      ]),
      events,
    });
    expect(byId.get("a2")?.raw).toBe(-3);
    // keeper −3 (13+) + team −3
    expect(byId.get("a1")?.raw).toBe(-3 - 3);
  });

  it("gives no team penalty below 4 conceded", () => {
    const events = Array.from({ length: 3 }, (_, i) => goal("B", "b1", i + 1));
    const byId = computeContributions({
      lineup: lineup([
        { id: "a1", team: "A", gk: true },
        { id: "a2", team: "A" },
        { id: "b1", team: "B", gk: true },
      ]),
      events,
    });
    expect(byId.get("a2")?.raw).toBe(0);
    expect(byId.get("a1")?.raw).toBe(1); // keeper 3–4 band
  });
});
