import { describe, it, expect } from "vitest";
import {
  normalizeNickname,
  validateNickname,
  nicknamesEqual,
  MIN_LENGTH,
  MAX_LENGTH,
} from "@/lib/domain/nickname";

describe("normalizeNickname", () => {
  it("pretvara u velika slova", () => {
    expect(normalizeNickname("marko")).toBe("MARKO");
  });

  it("skida razmake s krajeva", () => {
    expect(normalizeNickname("  MARKO  ")).toBe("MARKO");
  });

  it("sazima visestruke razmake u jedan", () => {
    expect(normalizeNickname("MARKO   C")).toBe("MARKO C");
  });

  it("cuva hrvatske znakove", () => {
    expect(normalizeNickname("čupko")).toBe("ČUPKO");
    expect(normalizeNickname("Đuro")).toBe("ĐURO");
  });
});

describe("nicknamesEqual", () => {
  it("ne razlikuje velika i mala slova", () => {
    expect(nicknamesEqual("marko", "MARKO")).toBe(true);
  });

  it("ne razlikuje razmake na krajevima", () => {
    expect(nicknamesEqual(" MARKO", "MARKO ")).toBe(true);
  });

  it("razlicite nadimke ne izjednacava", () => {
    expect(nicknamesEqual("MARKO", "MARKO C")).toBe(false);
    expect(nicknamesEqual("MAKI", "MARKO")).toBe(false);
  });

  it("Č i C su RAZLICITI znakovi", () => {
    // Namjerno: to su razliceni nadimci, a ne isti napisan drukcije.
    expect(nicknamesEqual("ČUPKO", "CUPKO")).toBe(false);
  });
});

describe("validateNickname", () => {
  it("prihvaca uobicajen nadimak", () => {
    expect(validateNickname("MARKO")).toEqual({ ok: true, nickname: "MARKO" });
  });

  it("normalizira dok provjerava", () => {
    expect(validateNickname("  marko c ")).toEqual({ ok: true, nickname: "MARKO C" });
  });

  it("odbija prekratak", () => {
    const r = validateNickname("M");
    expect("error" in r).toBe(true);
    if ("error" in r) expect(r.error).toContain(String(MIN_LENGTH));
  });

  it("odbija predugacak", () => {
    const r = validateNickname("A".repeat(MAX_LENGTH + 1));
    expect("error" in r).toBe(true);
    if ("error" in r) expect(r.error).toContain(String(MAX_LENGTH));
  });

  it("odbija prazan i samo razmake", () => {
    expect("error" in validateNickname("")).toBe(true);
    expect("error" in validateNickname("     ")).toBe(true);
  });

  it("duljina se mjeri NAKON normalizacije", () => {
    // 12 znakova plus razmaci s krajeva — mora proci.
    expect(validateNickname("  ABCDEFGHIJKL  ")).toEqual({
      ok: true,
      nickname: "ABCDEFGHIJKL",
    });
  });
});
