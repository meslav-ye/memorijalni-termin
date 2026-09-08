import { describe, it, expect } from "vitest";
import { disambiguateNicknames, type PlayerForLabel } from "@/lib/domain/nickname";

const p = (
  userId: string,
  nickname: string,
  fullName: string | null = null,
  email: string | null = null,
): PlayerForLabel => ({ userId, nickname, fullName, email });

describe("disambiguateNicknames — bez kolizije", () => {
  it("ostavlja nadimke kakvi su", () => {
    const o = disambiguateNicknames([p("1", "MARKO"), p("2", "LUKA")]);
    expect(o.get("1")).toBe("MARKO");
    expect(o.get("2")).toBe("LUKA");
  });

  it("prazan popis ne rusi", () => {
    expect(disambiguateNicknames([]).size).toBe(0);
  });

  it("ne dira nadimke koji se razlikuju samo po tome sto jedan ima dodatak", () => {
    const o = disambiguateNicknames([p("1", "MARKO"), p("2", "MARKO C")]);
    expect(o.get("1")).toBe("MARKO");
    expect(o.get("2")).toBe("MARKO C");
  });
});

describe("disambiguateNicknames — kolizija", () => {
  it("dodaje prezime iz imena", () => {
    const o = disambiguateNicknames([
      p("1", "MARKO", "Marko Čupić"),
      p("2", "MARKO", "Marko Perić"),
    ]);
    expect(o.get("1")).toBe("MARKO (Čupić)");
    expect(o.get("2")).toBe("MARKO (Perić)");
  });

  it("kolizija se prepoznaje i kad se pise razlicitom velicinom slova", () => {
    const o = disambiguateNicknames([
      p("1", "marko", "Marko Čupić"),
      p("2", "MARKO", "Marko Perić"),
    ]);
    expect(o.get("1")).toContain("Čupić");
    expect(o.get("2")).toContain("Perić");
  });

  it("pada na dio maila kad imena nema", () => {
    const o = disambiguateNicknames([
      p("1", "MARKO", null, "marko.cupic@gmail.com"),
      p("2", "MARKO", null, "mperic@gmail.com"),
    ]);
    expect(o.get("1")).toBe("MARKO (marko.cupic)");
    expect(o.get("2")).toBe("MARKO (mperic)");
  });

  it("pada na mail i kad su PREZIMENA ista", () => {
    const o = disambiguateNicknames([
      p("1", "MARKO", "Marko Horvat", "marko1@x.hr"),
      p("2", "MARKO", "Marko Horvat", "marko2@x.hr"),
    ]);
    expect(o.get("1")).toBe("MARKO (marko1)");
    expect(o.get("2")).toBe("MARKO (marko2)");
  });

  it("kad nema ni imena ni maila, dodaje brojeve", () => {
    const o = disambiguateNicknames([p("1", "MARKO"), p("2", "MARKO")]);
    expect(o.get("1")).toBe("MARKO (1)");
    expect(o.get("2")).toBe("MARKO (2)");
  });

  it("radi i s tri ista nadimka", () => {
    const o = disambiguateNicknames([
      p("1", "MARKO", "Marko A"),
      p("2", "MARKO", "Marko B"),
      p("3", "MARKO", "Marko C"),
    ]);
    expect(new Set([o.get("1"), o.get("2"), o.get("3")]).size).toBe(3);
  });

  it("kolizija jedne skupine ne dira ostale igrace", () => {
    const o = disambiguateNicknames([
      p("1", "MARKO", "Marko A"),
      p("2", "MARKO", "Marko B"),
      p("3", "LUKA", "Luka C"),
    ]);
    expect(o.get("3")).toBe("LUKA");
  });

  it("ime od jedne rijeci se koristi cijelo", () => {
    const o = disambiguateNicknames([p("1", "MARKO", "Čupko"), p("2", "MARKO", "Perko")]);
    expect(o.get("1")).toBe("MARKO (Čupko)");
    expect(o.get("2")).toBe("MARKO (Perko)");
  });
});
