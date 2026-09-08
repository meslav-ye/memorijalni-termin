import { describe, expect, it } from "vitest";
import type { MatchForStats } from "@/lib/domain/types";
import {
  bestGoalsAssistsInSingleGame,
  bestGoalsInSingleGame,
  fewestGoalsAgainstInSingleGame,
} from "@/lib/domain/records";

const match = (over: Partial<MatchForStats> = {}): MatchForStats => ({
  matchId: "m1",
  gameId: "g1",
  scoreA: 0,
  scoreB: 0,
  startsAt: "2026-09-01T18:00:00Z",
  lineup: [],
  events: [],
  ...over,
});

describe("bestGoalsInSingleGame", () => {
  it("returns null when nobody scored", () => {
    expect(bestGoalsInSingleGame([match()])).toBeNull();
  });

  it("picks the highest single-game goal tally with startsAt", () => {
    const games = [
      match({
        startsAt: "2026-08-01T18:00:00Z",
        events: [
          { type: "goal", scorerId: "ana", assistId: null, team: "A", elapsedSeconds: 1, deletedAt: null },
          { type: "goal", scorerId: "ana", assistId: null, team: "A", elapsedSeconds: 2, deletedAt: null },
        ],
      }),
      match({
        matchId: "m2",
        gameId: "g2",
        startsAt: "2026-09-08T18:00:00Z",
        events: [
          { type: "goal", scorerId: "bruno", assistId: null, team: "B", elapsedSeconds: 1, deletedAt: null },
          { type: "goal", scorerId: "bruno", assistId: null, team: "B", elapsedSeconds: 2, deletedAt: null },
          { type: "goal", scorerId: "bruno", assistId: null, team: "B", elapsedSeconds: 3, deletedAt: null },
        ],
      }),
    ];
    expect(bestGoalsInSingleGame(games)).toEqual({
      value: 3,
      userId: "bruno",
      startsAt: "2026-09-08T18:00:00Z",
    });
  });
});

describe("bestGoalsAssistsInSingleGame", () => {
  it("sums goals and assists for the same player in one game", () => {
    const games = [
      match({
        startsAt: "2026-09-05T18:00:00Z",
        events: [
          { type: "goal", scorerId: "ana", assistId: "bruno", team: "A", elapsedSeconds: 1, deletedAt: null },
          { type: "goal", scorerId: "bruno", assistId: "ana", team: "A", elapsedSeconds: 2, deletedAt: null },
          { type: "goal", scorerId: "ana", assistId: null, team: "A", elapsedSeconds: 3, deletedAt: null },
        ],
      }),
    ];
    // ana: 2G + 1A = 3; bruno: 1G + 1A = 2
    expect(bestGoalsAssistsInSingleGame(games)).toEqual({
      value: 3,
      userId: "ana",
      startsAt: "2026-09-05T18:00:00Z",
    });
  });

  it("ignores own goals for the G part", () => {
    const games = [
      match({
        events: [
          { type: "own_goal", scorerId: "ana", assistId: null, team: "B", elapsedSeconds: 1, deletedAt: null },
          { type: "goal", scorerId: "bruno", assistId: null, team: "A", elapsedSeconds: 2, deletedAt: null },
        ],
      }),
    ];
    expect(bestGoalsAssistsInSingleGame(games)?.userId).toBe("bruno");
    expect(bestGoalsAssistsInSingleGame(games)?.value).toBe(1);
  });
});

describe("fewestGoalsAgainstInSingleGame", () => {
  it("returns null when nobody stood in goal", () => {
    expect(
      fewestGoalsAgainstInSingleGame([
        match({
          lineup: [{ userId: "ana", team: "A", isGoalkeeper: false }],
          events: [
            { type: "goal", scorerId: "x", assistId: null, team: "B", elapsedSeconds: 1, deletedAt: null },
          ],
        }),
      ]),
    ).toBeNull();
  });

  it("picks the lineup keeper with fewest conceded in one game", () => {
    const games = [
      match({
        startsAt: "2026-07-01T18:00:00Z",
        lineup: [
          { userId: "zdravko", team: "A", isGoalkeeper: true },
          { userId: "jozo", team: "B", isGoalkeeper: true },
        ],
        scoreA: 1,
        scoreB: 3,
        events: [
          { type: "goal", scorerId: "jozo", assistId: null, team: "B", elapsedSeconds: 10, deletedAt: null },
          { type: "goal", scorerId: "jozo", assistId: null, team: "B", elapsedSeconds: 20, deletedAt: null },
          { type: "goal", scorerId: "jozo", assistId: null, team: "B", elapsedSeconds: 30, deletedAt: null },
          { type: "goal", scorerId: "zdravko", assistId: null, team: "A", elapsedSeconds: 40, deletedAt: null },
        ],
      }),
      match({
        matchId: "m2",
        gameId: "g2",
        startsAt: "2026-09-08T18:00:00Z",
        lineup: [
          { userId: "zdravko", team: "A", isGoalkeeper: true },
          { userId: "fran", team: "B", isGoalkeeper: true },
        ],
        scoreA: 1,
        scoreB: 0,
        events: [
          { type: "goal", scorerId: "zdravko", assistId: null, team: "A", elapsedSeconds: 5, deletedAt: null },
        ],
      }),
    ];
    // Game 1: zdravko 3, jozo 1. Game 2: fran 1, zdravko 0 → best is zdravko's clean sheet.
    expect(fewestGoalsAgainstInSingleGame(games)).toEqual({
      value: 0,
      userId: "zdravko",
      startsAt: "2026-09-08T18:00:00Z",
    });
  });

  it("counts mid-match glove holders who are not profile keepers", () => {
    expect(
      fewestGoalsAgainstInSingleGame([
        match({
          startsAt: "2026-07-01T18:00:00Z",
          lineup: [{ userId: "zdravko", team: "A", isGoalkeeper: true }],
          events: [
            { type: "goal", scorerId: "x", assistId: null, team: "B", elapsedSeconds: 10, deletedAt: null },
            { type: "goal", scorerId: "x", assistId: null, team: "B", elapsedSeconds: 20, deletedAt: null },
          ],
        }),
        match({
          matchId: "m2",
          gameId: "g2",
          startsAt: "2026-09-08T18:00:00Z",
          lineup: [{ userId: "a1", team: "A", isGoalkeeper: false }],
          events: [
            {
              type: "keeper_change",
              scorerId: "jozo",
              assistId: null,
              team: "A",
              elapsedSeconds: 1,
              deletedAt: null,
            },
            { type: "goal", scorerId: "x", assistId: null, team: "B", elapsedSeconds: 10, deletedAt: null },
          ],
        }),
      ]),
    ).toEqual({
      value: 1,
      userId: "jozo",
      startsAt: "2026-09-08T18:00:00Z",
    });
  });
});
