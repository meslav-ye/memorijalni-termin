import { describe, it, expect } from "vitest";
import { aggregateKeeperStats } from "@/lib/domain/keepers";
import type { MatchForStats } from "@/lib/domain/types";

const PROFILE_KEEPERS = new Set(["ka", "kb"]);

const match = (over: Partial<MatchForStats> = {}): MatchForStats => ({
  matchId: "m1",
  scoreA: 1,
  scoreB: 0,
  lineup: [
    { userId: "ka", team: "A", isGoalkeeper: true },
    { userId: "a1", team: "A", isGoalkeeper: false },
    { userId: "kb", team: "B", isGoalkeeper: true },
    { userId: "b1", team: "B", isGoalkeeper: false },
  ],
  events: [],
  ...over,
});

const find = (s: ReturnType<typeof aggregateKeeperStats>, id: string) =>
  s.find((p) => p.userId === id);

describe("aggregateKeeperStats", () => {
  it("attributes a goal against the opposing keeper", () => {
    const s = aggregateKeeperStats(
      [
        match({
          events: [
            {
              type: "goal",
              team: "A",
              scorerId: "a1",
              assistId: null,
              elapsedSeconds: 120,
              deletedAt: null,
            },
          ],
        }),
      ],
      PROFILE_KEEPERS,
    );

    expect(find(s, "kb")?.goalsAgainst).toBe(1);
    expect(find(s, "ka")?.goalsAgainst).toBe(0);
  });

  it("own-goal polarity: credited team is opposite of the conceding keeper", () => {
    const s = aggregateKeeperStats(
      [
        match({
          scoreA: 0,
          scoreB: 1,
          events: [
            {
              type: "own_goal",
              team: "B",
              scorerId: "a1",
              assistId: null,
              elapsedSeconds: 200,
              deletedAt: null,
            },
          ],
        }),
      ],
      PROFILE_KEEPERS,
    );

    expect(find(s, "ka")?.goalsAgainst).toBe(1);
    expect(find(s, "kb")?.goalsAgainst).toBe(0);
  });

  it("does not attribute mid-match outfield stand-ins who are not profile keepers", () => {
    const s = aggregateKeeperStats(
      [
        match({
          scoreA: 0,
          scoreB: 2,
          events: [
            {
              type: "keeper_change",
              team: "A",
              scorerId: "a1",
              assistId: null,
              elapsedSeconds: 300,
              deletedAt: null,
            },
            {
              type: "goal",
              team: "B",
              scorerId: "b1",
              assistId: null,
              elapsedSeconds: 200,
              deletedAt: null,
            },
            {
              type: "goal",
              team: "B",
              scorerId: "b1",
              assistId: null,
              elapsedSeconds: 400,
              deletedAt: null,
            },
          ],
        }),
      ],
      PROFILE_KEEPERS,
    );

    expect(find(s, "ka")?.goalsAgainst).toBe(1);
    expect(find(s, "a1")).toBeUndefined();
    expect(find(s, "ka")?.matchesAsKeeper).toBe(1);
  });

  it("ignores rotations when only outfield players stand in goal", () => {
    const s = aggregateKeeperStats(
      [
        match({
          lineup: [
            { userId: "a1", team: "A", isGoalkeeper: true },
            { userId: "a2", team: "A", isGoalkeeper: false },
            { userId: "kb", team: "B", isGoalkeeper: true },
            { userId: "b1", team: "B", isGoalkeeper: false },
          ],
          scoreA: 0,
          scoreB: 2,
          events: [
            {
              type: "goal",
              team: "B",
              scorerId: "b1",
              assistId: null,
              elapsedSeconds: 120,
              deletedAt: null,
            },
            {
              type: "keeper_change",
              team: "A",
              scorerId: "a2",
              assistId: null,
              elapsedSeconds: 200,
              deletedAt: null,
            },
            {
              type: "goal",
              team: "B",
              scorerId: "b1",
              assistId: null,
              elapsedSeconds: 300,
              deletedAt: null,
            },
          ],
        }),
      ],
      PROFILE_KEEPERS,
    );

    expect(find(s, "a1")).toBeUndefined();
    expect(find(s, "a2")).toBeUndefined();
    expect(find(s, "kb")?.matchesAsKeeper).toBe(1);
  });

  it("clean sheet only when the keeper was in goal the entire match", () => {
    const clean = aggregateKeeperStats(
      [
        match({
          scoreA: 1,
          scoreB: 0,
          events: [
            {
              type: "goal",
              team: "A",
              scorerId: "a1",
              assistId: null,
              elapsedSeconds: 100,
              deletedAt: null,
            },
          ],
        }),
      ],
      PROFILE_KEEPERS,
    );
    expect(find(clean, "ka")?.cleanSheets).toBe(1);
    expect(find(clean, "kb")?.cleanSheets).toBe(0);

    const swapped = aggregateKeeperStats(
      [
        match({
          scoreA: 0,
          scoreB: 0,
          events: [
            {
              type: "keeper_change",
              team: "A",
              scorerId: "a1",
              assistId: null,
              elapsedSeconds: 500,
              deletedAt: null,
            },
          ],
        }),
      ],
      PROFILE_KEEPERS,
    );
    expect(find(swapped, "ka")?.cleanSheets).toBe(0);
    expect(find(swapped, "a1")).toBeUndefined();
    expect(find(swapped, "kb")?.cleanSheets).toBe(1);
  });

  it("skips soft-deleted goals and keeper changes", () => {
    const s = aggregateKeeperStats(
      [
        match({
          events: [
            {
              type: "goal",
              team: "A",
              scorerId: "a1",
              assistId: null,
              elapsedSeconds: 100,
              deletedAt: "2026-09-08T19:00:00.000Z",
            },
            {
              type: "keeper_change",
              team: "B",
              scorerId: "b1",
              assistId: null,
              elapsedSeconds: 50,
              deletedAt: "2026-09-08T19:00:00.000Z",
            },
          ],
        }),
      ],
      PROFILE_KEEPERS,
    );

    expect(find(s, "kb")?.goalsAgainst).toBe(0);
    expect(find(s, "kb")?.cleanSheets).toBe(1);
    expect(find(s, "b1")).toBeUndefined();
  });
});
