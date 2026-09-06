import { describe, it, expect } from "vitest";
import { suggestTeams, MIN_TERMINA_ZA_RATING } from "@/lib/domain/teams";
import type { PlayerForBalancing } from "@/lib/domain/types";

const igrac = (
  userId: string,
  rating = 1000,
  isGoalkeeper = false,
): PlayerForBalancing => ({ userId, rating, isGoalkeeper });

/** Deterministicni "random" za testove — uvijek vraca 0. */
const nulaRandom = () => 0;

const zbroj = (t: PlayerForBalancing[]) => t.reduce((s, p) => s + p.rating, 0);
const idevi = (t: PlayerForBalancing[]) => t.map((p) => p.userId).sort();

describe("suggestTeams — golmani", () => {
  it("razdvaja dva golmana u razlicite ekipe", () => {
    const r = suggestTeams(
      [igrac("g1", 1000, true), igrac("g2", 1000, true), igrac("a"), igrac("b")],
      10,
      nulaRandom,
    );

    expect(r.teamA.some((p) => p.isGoalkeeper)).toBe(true);
    expect(r.teamB.some((p) => p.isGoalkeeper)).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it("bira par golmana s najmanjom razlikom u ratingu", () => {
    // 1500 i 1480 su najblizi par; 900 ostaje kao obican igrac.
    const r = suggestTeams(
      [
        igrac("jak", 1500, true),
        igrac("slab", 900, true),
        igrac("srednji", 1480, true),
        igrac("a"),
        igrac("b"),
        igrac("c"),
      ],
      10,
      nulaRandom,
    );

    const golmaniUPostavi = [...r.teamA, ...r.teamB]
      .filter((p) => p.isGoalkeeper)
      .map((p) => p.userId);

    // Sva tri su u postavi, ali kao GOLMANI su razdvojeni jak i srednji.
    expect(golmaniUPostavi).toHaveLength(3);
    const aGolman = r.teamA.find((p) => p.isGoalkeeper);
    const bGolman = r.teamB.find((p) => p.isGoalkeeper);
    expect([aGolman?.userId, bGolman?.userId].sort()).toEqual(["jak", "srednji"]);
  });

  it("upozorava kad je samo jedan golman", () => {
    const r = suggestTeams([igrac("g1", 1000, true), igrac("a")], 10, nulaRandom);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/nema golmana/);
  });

  it("upozorava kad nema nijednog golmana", () => {
    const r = suggestTeams([igrac("a"), igrac("b")], 10, nulaRandom);
    expect(r.warnings).toEqual(["Nijedna ekipa nema golmana."]);
  });

  it("visak golmana se tretira kao obican igrac, bez upozorenja", () => {
    const r = suggestTeams(
      [igrac("g1", 1000, true), igrac("g2", 1000, true), igrac("g3", 1000, true), igrac("a")],
      10,
      nulaRandom,
    );
    expect(r.teamA.length + r.teamB.length).toBe(4);
    expect(r.warnings).toEqual([]);
  });
});

describe("suggestTeams — balansiranje", () => {
  it("balansira po ratingu kad grupa ima dovoljno odigranih termina", () => {
    const r = suggestTeams(
      [igrac("a", 1200), igrac("b", 1100), igrac("c", 900), igrac("d", 800)],
      MIN_TERMINA_ZA_RATING,
      nulaRandom,
    );
    expect(Math.abs(zbroj(r.teamA) - zbroj(r.teamB))).toBeLessThanOrEqual(100);
  });

  it("na 12 igraca razlicitih ratinga ekipe su blizu izjednacene", () => {
    const igraci = Array.from({ length: 12 }, (_, i) => igrac(`p${i}`, 800 + i * 50));
    const r = suggestTeams(igraci, MIN_TERMINA_ZA_RATING, nulaRandom);

    expect(r.teamA).toHaveLength(6);
    expect(r.teamB).toHaveLength(6);
    // Zmijski raspored na ovom nizu daje razliku od najvise jednog "koraka".
    expect(Math.abs(zbroj(r.teamA) - zbroj(r.teamB))).toBeLessThanOrEqual(100);
  });

  it("dok grupa nema dovoljno termina, ne gleda rating", () => {
    // Da gleda rating, jaki bi bili razdvojeni. Ovdje samo provjeravamo da
    // funkcija ne pukne i da su svi rasporedjeni.
    const igraci = [igrac("jak1", 2000), igrac("jak2", 1900), igrac("slab1", 500), igrac("slab2", 400)];
    const r = suggestTeams(igraci, MIN_TERMINA_ZA_RATING - 1, nulaRandom);
    expect(r.teamA.length + r.teamB.length).toBe(4);
  });
});

describe("suggestTeams — cjelovitost", () => {
  it("ne gubi i ne duplira nijednog igraca", () => {
    const igraci = Array.from({ length: 11 }, (_, i) => igrac(`p${i}`, 1000 + i * 10));
    const r = suggestTeams(igraci, 10, nulaRandom);

    expect(r.teamA.length + r.teamB.length).toBe(11);
    expect(idevi([...r.teamA, ...r.teamB])).toEqual(idevi(igraci));
  });

  it("kod neparnog broja razlika u velicini ekipa je tocno jedan", () => {
    const igraci = Array.from({ length: 9 }, (_, i) => igrac(`p${i}`));
    const r = suggestTeams(igraci, 10, nulaRandom);
    expect(Math.abs(r.teamA.length - r.teamB.length)).toBe(1);
  });

  it("kod parnog broja ekipe su jednake velicine", () => {
    const igraci = Array.from({ length: 12 }, (_, i) => igrac(`p${i}`));
    const r = suggestTeams(igraci, 10, nulaRandom);
    expect(r.teamA).toHaveLength(6);
    expect(r.teamB).toHaveLength(6);
  });

  it("prazan popis vraca prazne ekipe i upozorenje", () => {
    const r = suggestTeams([], 10, nulaRandom);
    expect(r.teamA).toEqual([]);
    expect(r.teamB).toEqual([]);
    expect(r.warnings).toEqual(["Nijedna ekipa nema golmana."]);
  });
});
