import { describe, it, expect } from "vitest";
import {
  normalizirajNadimak,
  provjeriNadimak,
  istiNadimak,
  MIN_DULJINA,
  MAX_DULJINA,
} from "@/lib/domain/nadimak";

describe("normalizirajNadimak", () => {
  it("pretvara u velika slova", () => {
    expect(normalizirajNadimak("marko")).toBe("MARKO");
  });

  it("skida razmake s krajeva", () => {
    expect(normalizirajNadimak("  MARKO  ")).toBe("MARKO");
  });

  it("sazima visestruke razmake u jedan", () => {
    expect(normalizirajNadimak("MARKO   C")).toBe("MARKO C");
  });

  it("cuva hrvatske znakove", () => {
    expect(normalizirajNadimak("čupko")).toBe("ČUPKO");
    expect(normalizirajNadimak("Đuro")).toBe("ĐURO");
  });
});

describe("istiNadimak", () => {
  it("ne razlikuje velika i mala slova", () => {
    expect(istiNadimak("marko", "MARKO")).toBe(true);
  });

  it("ne razlikuje razmake na krajevima", () => {
    expect(istiNadimak(" MARKO", "MARKO ")).toBe(true);
  });

  it("razlicite nadimke ne izjednacava", () => {
    expect(istiNadimak("MARKO", "MARKO C")).toBe(false);
    expect(istiNadimak("MAKI", "MARKO")).toBe(false);
  });

  it("Č i C su RAZLICITI znakovi", () => {
    // Namjerno: to su razliceni nadimci, a ne isti napisan drukcije.
    expect(istiNadimak("ČUPKO", "CUPKO")).toBe(false);
  });
});

describe("provjeriNadimak", () => {
  it("prihvaca uobicajen nadimak", () => {
    expect(provjeriNadimak("MARKO")).toEqual({ ok: true, nadimak: "MARKO" });
  });

  it("normalizira dok provjerava", () => {
    expect(provjeriNadimak("  marko c ")).toEqual({ ok: true, nadimak: "MARKO C" });
  });

  it("odbija prekratak", () => {
    const r = provjeriNadimak("M");
    expect("greska" in r).toBe(true);
    if ("greska" in r) expect(r.greska).toContain(String(MIN_DULJINA));
  });

  it("odbija predugacak", () => {
    const r = provjeriNadimak("A".repeat(MAX_DULJINA + 1));
    expect("greska" in r).toBe(true);
    if ("greska" in r) expect(r.greska).toContain(String(MAX_DULJINA));
  });

  it("odbija prazan i samo razmake", () => {
    expect("greska" in provjeriNadimak("")).toBe(true);
    expect("greska" in provjeriNadimak("     ")).toBe(true);
  });

  it("duljina se mjeri NAKON normalizacije", () => {
    // 12 znakova plus razmaci s krajeva — mora proci.
    expect(provjeriNadimak("  ABCDEFGHIJKL  ")).toEqual({ ok: true, nadimak: "ABCDEFGHIJKL" });
  });
});
