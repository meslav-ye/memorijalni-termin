import { describe, it, expect } from "vitest";
import { computeElo, POCETNI_RATING, K_FAKTOR } from "@/lib/domain/elo";

const ekipa = (ids: string[], rating = POCETNI_RATING) =>
  ids.map((userId) => ({ userId, rating }));

describe("computeElo — jednake ekipe", () => {
  it("pobjednik dobiva pola K faktora", () => {
    const r = computeElo({
      teamA: ekipa(["a1", "a2"]),
      teamB: ekipa(["b1", "b2"]),
      scoreA: 6,
      scoreB: 4,
    });
    expect(r.deltaA).toBe(K_FAKTOR / 2); // 12
    expect(r.deltaB).toBe(-K_FAKTOR / 2);
  });

  it("nerijeseno ne mijenja nista", () => {
    const r = computeElo({
      teamA: ekipa(["a1"]),
      teamB: ekipa(["b1"]),
      scoreA: 3,
      scoreB: 3,
    });
    expect(r.deltaA).toBe(0);
    expect(r.deltaB).toBe(0);
  });
});

describe("computeElo — nejednake ekipe", () => {
  it("jaca ekipa dobiva manje za ocekivanu pobjedu", () => {
    const r = computeElo({
      teamA: ekipa(["a1"], 1300),
      teamB: ekipa(["b1"], 900),
      scoreA: 5,
      scoreB: 2,
    });
    expect(r.deltaA).toBeGreaterThan(0);
    expect(r.deltaA).toBeLessThan(K_FAKTOR / 2);
  });

  it("slabija ekipa dobiva vise za iznenadjenje", () => {
    const r = computeElo({
      teamA: ekipa(["a1"], 900),
      teamB: ekipa(["b1"], 1300),
      scoreA: 5,
      scoreB: 2,
    });
    expect(r.deltaA).toBeGreaterThan(K_FAKTOR / 2);
  });

  it("jaca ekipa gubi vise kad izgubi nego sto dobije kad pobijedi", () => {
    const pobjeda = computeElo({
      teamA: ekipa(["a1"], 1300), teamB: ekipa(["b1"], 900), scoreA: 5, scoreB: 2,
    });
    const poraz = computeElo({
      teamA: ekipa(["a1"], 1300), teamB: ekipa(["b1"], 900), scoreA: 2, scoreB: 5,
    });
    expect(Math.abs(poraz.deltaA)).toBeGreaterThan(Math.abs(pobjeda.deltaA));
  });

  it("racuna se PROSJEK ekipe, ne zbroj — pa velicina ekipe ne mijenja ishod", () => {
    const mala = computeElo({
      teamA: ekipa(["a1"], 1200), teamB: ekipa(["b1"], 1000), scoreA: 3, scoreB: 1,
    });
    const velika = computeElo({
      teamA: ekipa(["a1", "a2", "a3"], 1200),
      teamB: ekipa(["b1", "b2", "b3"], 1000),
      scoreA: 3,
      scoreB: 1,
    });
    expect(mala.deltaA).toBe(velika.deltaA);
  });
});

describe("computeElo — cjelovitost", () => {
  it("promjena je nula-suma", () => {
    const r = computeElo({
      teamA: ekipa(["a1", "a2"], 1100),
      teamB: ekipa(["b1", "b2"], 950),
      scoreA: 1,
      scoreB: 4,
    });
    expect(r.deltaA + r.deltaB).toBe(0);
  });

  it("vraca zapis prije i poslije za svakog igraca", () => {
    const r = computeElo({
      teamA: ekipa(["a1"]),
      teamB: ekipa(["b1"]),
      scoreA: 2,
      scoreB: 1,
    });
    expect(r.updates).toHaveLength(2);

    const a = r.updates.find((u) => u.userId === "a1")!;
    expect(a.ratingBefore).toBe(POCETNI_RATING);
    expect(a.ratingAfter).toBe(POCETNI_RATING + r.deltaA);
  });

  it("svi igraci iste ekipe dobivaju isti pomak", () => {
    const r = computeElo({
      teamA: ekipa(["a1", "a2", "a3"]),
      teamB: ekipa(["b1", "b2", "b3"]),
      scoreA: 4,
      scoreB: 2,
    });
    const pomaciA = r.updates
      .filter((u) => u.userId.startsWith("a"))
      .map((u) => u.ratingAfter - u.ratingBefore);
    expect(new Set(pomaciA).size).toBe(1);
  });

  it("prazna ekipa ne rusi izracun", () => {
    expect(computeElo({ teamA: [], teamB: ekipa(["b1"]), scoreA: 0, scoreB: 0 })).toEqual({
      deltaA: 0,
      deltaB: 0,
      updates: [],
    });
  });
});
