import { describe, it, expect } from "vitest";
import { splitSignups } from "@/lib/domain/waitlist";
import type { SignupRow } from "@/lib/domain/types";

const prijava = (
  userId: string,
  minuta: number,
  manualOrder: number | null = null,
  cancelledAt: string | null = null,
): SignupRow => ({
  userId,
  signedUpAt: `2026-09-01T10:${String(minuta).padStart(2, "0")}:00.000Z`,
  manualOrder,
  cancelledAt,
});

describe("splitSignups", () => {
  it("vraca prazno kad nema prijava", () => {
    expect(splitSignups([], 10)).toEqual({ confirmed: [], waitlist: [] });
  });

  it("svi su unutra kad ih je manje od kvote", () => {
    const r = splitSignups([prijava("a", 1), prijava("b", 2)], 10);
    expect(r.confirmed).toEqual(["a", "b"]);
    expect(r.waitlist).toEqual([]);
  });

  it("visak ide na listu cekanja, redom po vremenu prijave", () => {
    const r = splitSignups([prijava("c", 3), prijava("a", 1), prijava("b", 2)], 2);
    expect(r.confirmed).toEqual(["a", "b"]);
    expect(r.waitlist).toEqual(["c"]);
  });

  it("otkazane prijave se ne broje", () => {
    const r = splitSignups(
      [prijava("a", 1), prijava("b", 2, null, "2026-09-01T11:00:00.000Z"), prijava("c", 3)],
      2,
    );
    expect(r.confirmed).toEqual(["a", "c"]);
    expect(r.waitlist).toEqual([]);
  });

  it("kad se prvi odjavi, prvi s liste cekanja automatski ulazi", () => {
    const prije = splitSignups([prijava("a", 1), prijava("b", 2), prijava("c", 3)], 2);
    expect(prije.confirmed).toEqual(["a", "b"]);
    expect(prije.waitlist).toEqual(["c"]);

    const poslije = splitSignups(
      [prijava("a", 1, null, "2026-09-01T12:00:00.000Z"), prijava("b", 2), prijava("c", 3)],
      2,
    );
    expect(poslije.confirmed).toEqual(["b", "c"]);
    expect(poslije.waitlist).toEqual([]);
  });

  it("rucni redoslijed ima prednost pred vremenom prijave", () => {
    const r = splitSignups([prijava("a", 1), prijava("b", 2), prijava("c", 3, 1)], 1);
    expect(r.confirmed).toEqual(["c"]);
    expect(r.waitlist).toEqual(["a", "b"]);
  });

  it("13. covjek na termin od 12 mjesta ide na cekanje, a ne odbija se", () => {
    // Stvarni slucaj iz drustva: igra se 5v5 s po jednom zamjenom, dakle 12
    // mjesta. Tko se javi 13. mora moci ostati prijavljen — na cekanju.
    const svi = Array.from({ length: 13 }, (_, i) => prijava(`p${i + 1}`, i));
    const r = splitSignups(svi, 12);

    expect(r.confirmed).toHaveLength(12);
    expect(r.waitlist).toEqual(["p13"]);
    expect(r.confirmed).not.toContain("p13");
  });

  it("lista cekanja nema gornju granicu", () => {
    const svi = Array.from({ length: 25 }, (_, i) => prijava(`p${i + 1}`, i));
    const r = splitSignups(svi, 12);

    expect(r.confirmed).toHaveLength(12);
    expect(r.waitlist).toHaveLength(13);
  });

  it("kad jedan od 12 otkaze, 13. automatski ulazi u postavu", () => {
    const svi = Array.from({ length: 13 }, (_, i) => prijava(`p${i + 1}`, i));

    // p5 se odjavljuje
    const nakonOdjave = svi.map((p) =>
      p.userId === "p5" ? { ...p, cancelledAt: "2026-09-01T15:00:00.000Z" } : p,
    );

    const r = splitSignups(nakonOdjave, 12);
    expect(r.confirmed).toHaveLength(12);
    expect(r.confirmed).toContain("p13");
    expect(r.confirmed).not.toContain("p5");
    expect(r.waitlist).toEqual([]);
  });

  it("kvota nula stavlja sve na listu cekanja", () => {
    const r = splitSignups([prijava("a", 1)], 0);
    expect(r.confirmed).toEqual([]);
    expect(r.waitlist).toEqual(["a"]);
  });
});
