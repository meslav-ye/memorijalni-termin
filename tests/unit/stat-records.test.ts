import { describe, expect, it } from "vitest";
import type { ActivityEntry } from "@/lib/domain/activity";
import { playerProfileHref } from "@/lib/domain/player-profile";
import {
  appendActivityRecords,
  buildStatRecords,
  type StatRecord,
} from "@/lib/domain/stat-records";
import type { MatchForStats } from "@/lib/domain/types";
import { formatShortDate } from "@/lib/format";

const match = (over: Partial<MatchForStats> = {}): MatchForStats => ({
  matchId: "m1",
  gameId: "g1",
  scoreA: 0,
  scoreB: 0,
  startsAt: "2026-09-01T18:00:00Z",
  lineup: [
    { userId: "ana", team: "A", isGoalkeeper: true },
    { userId: "bruno", team: "B", isGoalkeeper: true },
  ],
  events: [],
  ...over,
});

const nick = (id: string) => (id === "ana" ? "Ana" : id === "bruno" ? "Bruno" : id);

describe("playerProfileHref", () => {
  it("builds ljestvica and statistika profile paths", () => {
    expect(playerProfileHref("g1", "u1", "ljestvica")).toBe(
      "/grupe/g1/igrac/u1?from=ljestvica",
    );
    expect(playerProfileHref("g1", "u1", "statistika")).toBe(
      "/grupe/g1/igrac/u1?from=statistika",
    );
  });
});

describe("buildStatRecords profile links", () => {
  const games = [
    match({
      scoreA: 5,
      scoreB: 1,
      startsAt: "2026-09-01T18:00:00Z",
      events: [
        {
          type: "goal",
          scorerId: "ana",
          assistId: "bruno",
          team: "A",
          elapsedSeconds: 1,
          deletedAt: null,
        },
        {
          type: "goal",
          scorerId: "ana",
          assistId: null,
          team: "A",
          elapsedSeconds: 2,
          deletedAt: null,
        },
        {
          type: "goal",
          scorerId: "ana",
          assistId: null,
          team: "A",
          elapsedSeconds: 3,
          deletedAt: null,
        },
      ],
    }),
  ];

  const attendance = [
    { userId: "ana", nickname: "Ana", sessionsAttended: 4 },
    { userId: "bruno", nickname: "Bruno", sessionsAttended: 2 },
  ];

  const activity: ActivityEntry[] = [
    {
      matchId: "m1",
      userId: "bruno",
      distanceKm: 8.4,
      maxSpeedKmh: 31.2,
      avgSpeedKmh: 8.1,
      startsAt: "2026-09-01T18:00:00Z",
    },
  ];

  it("sets userId on player-backed records so Statistika can link to profile", () => {
    const records = buildStatRecords(games, attendance, activity, nick);
    const byTitle = Object.fromEntries(records.map((r) => [r.title, r]));

    expect(byTitle["Najviše golova na utakmici"]?.userId).toBe("ana");
    expect(byTitle["Najviše G+A"]?.userId).toBe("ana");
    expect(byTitle["Najmanje primljenih na utakmici"]?.userId).toBe("ana");
    expect(byTitle["Najviše termina ukupno"]).toEqual({
      title: "Najviše termina ukupno",
      value: "4",
      who: "Ana",
      userId: "ana",
    });
    expect(byTitle["Najviše kilometara na terminu"]?.userId).toBe("bruno");
  });

  it("leaves Najveća pobjeda without userId (game record, not player)", () => {
    const records = buildStatRecords(games, attendance, [], nick);
    const win = records.find((r) => r.title === "Najveća pobjeda");
    expect(win).toEqual({
      title: "Najveća pobjeda",
      value: "5:1",
      who: formatShortDate("2026-09-01T18:00:00Z"),
      userId: null,
    });
  });

  it("only player records are linkable via userId", () => {
    const records = buildStatRecords(games, attendance, activity, nick);
    const linkable = records.filter((r) => r.userId !== null);
    const notLinkable = records.filter((r) => r.userId === null);

    expect(linkable.length).toBeGreaterThan(0);
    expect(notLinkable.map((r) => r.title)).toEqual(["Najveća pobjeda"]);

    for (const r of linkable) {
      expect(playerProfileHref("grupa", r.userId!, "statistika")).toContain(
        `/igrac/${r.userId}?from=statistika`,
      );
    }
  });
});

describe("appendActivityRecords", () => {
  it("attaches userId for dolaznost/statistika profile links on activity records", () => {
    const records: StatRecord[] = [];
    appendActivityRecords(
      records,
      [
        {
          matchId: "m2",
          userId: "ana",
          distanceKm: 7,
          maxSpeedKmh: 28,
          avgSpeedKmh: 9.5,
          startsAt: "2026-03-01T18:00:00Z",
        },
      ],
      nick,
    );

    expect(records.every((r) => r.userId === "ana")).toBe(true);
    expect(records.map((r) => r.title)).toEqual([
      "Najviše kilometara na terminu",
      "Najveća max brzina",
      "Najveća prosj. brzina",
    ]);
  });
});
