import { describe, it, expect } from "vitest";
import { razlikujNadimke, type IgracZaOznaku } from "@/lib/domain/nadimak";

const i = (
  userId: string,
  nadimak: string,
  fullName: string | null = null,
  email: string | null = null,
): IgracZaOznaku => ({ userId, nadimak, fullName, email });

describe("razlikujNadimke — bez kolizije", () => {
  it("ostavlja nadimke kakvi su", () => {
    const o = razlikujNadimke([i("1", "MARKO"), i("2", "LUKA")]);
    expect(o.get("1")).toBe("MARKO");
    expect(o.get("2")).toBe("LUKA");
  });

  it("prazan popis ne rusi", () => {
    expect(razlikujNadimke([]).size).toBe(0);
  });

  it("ne dira nadimke koji se razlikuju samo po tome sto jedan ima dodatak", () => {
    const o = razlikujNadimke([i("1", "MARKO"), i("2", "MARKO C")]);
    expect(o.get("1")).toBe("MARKO");
    expect(o.get("2")).toBe("MARKO C");
  });
});

describe("razlikujNadimke — kolizija", () => {
  it("dodaje prezime iz imena", () => {
    const o = razlikujNadimke([
      i("1", "MARKO", "Marko Čupić"),
      i("2", "MARKO", "Marko Perić"),
    ]);
    expect(o.get("1")).toBe("MARKO (Čupić)");
    expect(o.get("2")).toBe("MARKO (Perić)");
  });

  it("kolizija se prepoznaje i kad se pise razlicitom velicinom slova", () => {
    const o = razlikujNadimke([i("1", "marko", "Marko Čupić"), i("2", "MARKO", "Marko Perić")]);
    expect(o.get("1")).toContain("Čupić");
    expect(o.get("2")).toContain("Perić");
  });

  it("pada na dio maila kad imena nema", () => {
    const o = razlikujNadimke([
      i("1", "MARKO", null, "marko.cupic@gmail.com"),
      i("2", "MARKO", null, "mperic@gmail.com"),
    ]);
    expect(o.get("1")).toBe("MARKO (marko.cupic)");
    expect(o.get("2")).toBe("MARKO (mperic)");
  });

  it("pada na mail i kad su PREZIMENA ista", () => {
    const o = razlikujNadimke([
      i("1", "MARKO", "Marko Horvat", "marko1@x.hr"),
      i("2", "MARKO", "Marko Horvat", "marko2@x.hr"),
    ]);
    expect(o.get("1")).toBe("MARKO (marko1)");
    expect(o.get("2")).toBe("MARKO (marko2)");
  });

  it("kad nema ni imena ni maila, dodaje brojeve", () => {
    const o = razlikujNadimke([i("1", "MARKO"), i("2", "MARKO")]);
    expect(o.get("1")).toBe("MARKO (1)");
    expect(o.get("2")).toBe("MARKO (2)");
  });

  it("radi i s tri ista nadimka", () => {
    const o = razlikujNadimke([
      i("1", "MARKO", "Marko A"),
      i("2", "MARKO", "Marko B"),
      i("3", "MARKO", "Marko C"),
    ]);
    expect(new Set([o.get("1"), o.get("2"), o.get("3")]).size).toBe(3);
  });

  it("kolizija jedne skupine ne dira ostale igrace", () => {
    const o = razlikujNadimke([
      i("1", "MARKO", "Marko A"),
      i("2", "MARKO", "Marko B"),
      i("3", "LUKA", "Luka C"),
    ]);
    expect(o.get("3")).toBe("LUKA");
  });

  it("ime od jedne rijeci se koristi cijelo", () => {
    const o = razlikujNadimke([i("1", "MARKO", "Čupko"), i("2", "MARKO", "Perko")]);
    expect(o.get("1")).toBe("MARKO (Čupko)");
    expect(o.get("2")).toBe("MARKO (Perko)");
  });
});
