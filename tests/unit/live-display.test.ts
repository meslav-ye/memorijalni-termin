import { describe, it, expect } from "vitest";
import { livePhase, livePlayerGoals, liveScore } from "@/lib/domain/live-display";
import type { Team } from "@/lib/domain/types";

const event = (over: {
  type?: string;
  team?: Team | null;
  scorerId?: string | null;
  scorerFillerId?: string | null;
  deletedAt?: string | null;
}) => ({
  type: "goal",
  team: "A" as Team | null,
  scorerId: "u1",
  scorerFillerId: null,
  deletedAt: null,
  ...over,
});

describe("liveScore", () => {
  it("counts a goal and an own-goal toward the credited team's score", () => {
    const score = liveScore([
      event({ team: "A", scorerId: "u1" }),
      event({ type: "own_goal", team: "B", scorerId: "u1" }),
      event({ type: "keeper_change", team: "A", scorerId: "u2" }),
    ]);
    expect(score).toEqual({ a: 1, b: 1 });
  });

  it("drops undone goals from the scoreboard and the scorer's tally", () => {
    const events = [
      event({ scorerId: "u1" }),
      event({
        scorerId: "u1",
        deletedAt: "2026-09-17T12:00:00.000Z",
      }),
    ];
    expect(liveScore(events)).toEqual({ a: 1, b: 0 });
    expect(
      livePlayerGoals(events, { userId: "u1", fillerId: null, isGuest: false }),
    ).toBe(1);
  });
});

describe("livePhase", () => {
  it("treats a finished game as ready for the next one, not the whole session", () => {
    expect(
      livePhase({
        matchStatus: "u_tijeku",
        gameStatus: "u_tijeku",
        startedAt: "2026-09-17T12:00:00.000Z",
      }),
    ).toBe("live");
    expect(
      livePhase({
        matchStatus: "u_tijeku",
        gameStatus: "zavrsena",
        startedAt: "2026-09-17T12:00:00.000Z",
      }),
    ).toBe("awaiting_next");
    expect(
      livePhase({
        matchStatus: "zavrsen",
        gameStatus: "zavrsena",
        startedAt: "2026-09-17T12:00:00.000Z",
      }),
    ).toBe("termin_done");
  });
});
