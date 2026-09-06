import { describe, it, expect } from "vitest";
import { aggregateStats } from "@/lib/domain/stats";
import type { MatchForStats } from "@/lib/domain/types";

const termin = (over: Partial<MatchForStats> = {}): MatchForStats => ({
  matchId: "m1",
  scoreA: 2,
  scoreB: 1,
  lineup: [
    { userId: "a1", team: "A" },
    { userId: "a2", team: "A" },
    { userId: "b1", team: "B" },
  ],
  events: [
    { type: "goal", scorerId: "a1", assistId: "a2", deletedAt: null },
    { type: "goal", scorerId: "a1", assistId: null, deletedAt: null },
    { type: "goal", scorerId: "b1", assistId: null, deletedAt: null },
  ],
  ...over,
});

const nadji = (s: ReturnType<typeof aggregateStats>, id: string) =>
  s.find((p) => p.userId === id)!;

describe("aggregateStats — brojanje", () => {
  it("broji golove i asistencije", () => {
    const s = aggregateStats([termin()]);
    expect(nadji(s, "a1").goals).toBe(2);
    expect(nadji(s, "a2").assists).toBe(1);
    expect(nadji(s, "b1").goals).toBe(1);
  });

  it("ne broji ponistene dogadjaje", () => {
    const s = aggregateStats([
      termin({
        events: [
          { type: "goal", scorerId: "a1", assistId: "a2", deletedAt: "2026-09-08T19:00:00.000Z" },
        ],
      }),
    ]);
    expect(nadji(s, "a1").goals).toBe(0);
    expect(nadji(s, "a2").assists).toBe(0);
  });

  it("autogol se broji odvojeno i NE ulazi u golove", () => {
    const s = aggregateStats([
      termin({ events: [{ type: "own_goal", scorerId: "a1", assistId: null, deletedAt: null }] }),
    ]);
    expect(nadji(s, "a1").ownGoals).toBe(1);
    expect(nadji(s, "a1").goals).toBe(0);
  });

  it("igrac koji nije u postavi se ne pojavljuje, ni ako je u dogadjajima", () => {
    const s = aggregateStats([
      termin({ events: [{ type: "goal", scorerId: "stranac", assistId: null, deletedAt: null }] }),
    ]);
    expect(s.find((p) => p.userId === "stranac")).toBeUndefined();
  });
});

describe("aggregateStats — ishodi", () => {
  it("racuna pobjede i poraze", () => {
    const s = aggregateStats([termin()]);
    expect(nadji(s, "a1").wins).toBe(1);
    expect(nadji(s, "a1").losses).toBe(0);
    expect(nadji(s, "b1").losses).toBe(1);
  });

  it("racuna nerijeseno", () => {
    const s = aggregateStats([termin({ scoreA: 2, scoreB: 2 })]);
    expect(nadji(s, "a1").draws).toBe(1);
    expect(nadji(s, "b1").draws).toBe(1);
  });

  it("postotak pobjeda racuna nerijeseno kao pola", () => {
    const s = aggregateStats([
      termin({ matchId: "m1", scoreA: 2, scoreB: 1 }),
      termin({ matchId: "m2", scoreA: 1, scoreB: 1 }),
    ]);
    expect(nadji(s, "a1").winRate).toBeCloseTo(0.75);
  });
});

describe("aggregateStats — prosjeci i rubni slucajevi", () => {
  it("golovi po terminu se zaokruzuju na dvije decimale", () => {
    const s = aggregateStats([
      termin({ matchId: "m1" }),
      termin({ matchId: "m2", events: [] }),
      termin({ matchId: "m3", events: [] }),
    ]);
    // a1: 2 gola u 3 termina = 0.67
    expect(nadji(s, "a1").goalsPerMatch).toBe(0.67);
  });

  it("broji odigrane termine iz postave, ne iz golova", () => {
    const s = aggregateStats([termin({ matchId: "m1" }), termin({ matchId: "m2", events: [] })]);
    expect(nadji(s, "a2").matches).toBe(2);
    expect(nadji(s, "a2").goals).toBe(0);
  });

  it("prazan popis termina daje prazan rezultat", () => {
    expect(aggregateStats([])).toEqual([]);
  });

  it("termin bez ijednog gola ne rusi izracun", () => {
    const s = aggregateStats([termin({ scoreA: 0, scoreB: 0, events: [] })]);
    expect(nadji(s, "a1").matches).toBe(1);
    expect(nadji(s, "a1").draws).toBe(1);
    expect(nadji(s, "a1").goalsPerMatch).toBe(0);
  });

  it("asistencija na autogol se ne broji", () => {
    const s = aggregateStats([
      termin({ events: [{ type: "own_goal", scorerId: "a1", assistId: "a2", deletedAt: null }] }),
    ]);
    expect(nadji(s, "a2").assists).toBe(0);
  });
});
