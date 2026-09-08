import { describe, it, expect } from "vitest";
import { canStart, MINUTES_BEFORE_START } from "@/lib/domain/startability";

/** Termin: utorak 08.09.2026. u 20:00 po zagrebackom vremenu (18:00 UTC). */
const TERMIN = "2026-09-08T18:00:00.000Z";

const at = (iso: string) => canStart(TERMIN, new Date(iso));

describe("canStart", () => {
  it("dan ranije NE moze", () => {
    expect(at("2026-09-07T18:00:00.000Z")).toBe(false);
  });

  it("isti dan ujutro NE moze", () => {
    expect(at("2026-09-08T07:00:00.000Z")).toBe(false);
  });

  it("dva sata prije NE moze", () => {
    expect(at("2026-09-08T16:00:00.000Z")).toBe(false);
  });

  it("sat prije NE moze", () => {
    expect(at("2026-09-08T17:00:00.000Z")).toBe(false);
  });

  it("31 minutu prije NE moze", () => {
    expect(at("2026-09-08T17:29:00.000Z")).toBe(false);
  });

  it(`tocno ${MINUTES_BEFORE_START} minuta prije MOZE`, () => {
    expect(at("2026-09-08T17:30:00.000Z")).toBe(true);
  });

  it("deset minuta prije MOZE", () => {
    expect(at("2026-09-08T17:50:00.000Z")).toBe(true);
  });

  it("tocno u vrijeme termina MOZE", () => {
    expect(at("2026-09-08T18:00:00.000Z")).toBe(true);
  });

  it("sat nakon pocetka MOZE — zakasnili su, ali neka igraju", () => {
    expect(at("2026-09-08T19:00:00.000Z")).toBe(true);
  });

  it("i dan poslije MOZE — nitko ne pokrece stari termin slucajno", () => {
    expect(at("2026-09-09T18:00:00.000Z")).toBe(true);
  });
});
