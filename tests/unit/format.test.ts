import { describe, it, expect } from "vitest";
import {
  formatirajTermin,
  formatirajKratko,
  formatirajSatnicu,
  zagrebUIso,
} from "@/lib/format";

describe("formatirajTermin", () => {
  it("ispisuje dan, datum i vrijeme u zagrebackoj zoni (ljetno vrijeme)", () => {
    // 2026-09-08 je utorak. 18:00 UTC = 20:00 po zagrebackom ljetnom vremenu.
    expect(formatirajTermin("2026-09-08T18:00:00.000Z")).toBe("uto 08.09.2026. u 20:00");
  });

  it("ispravno racuna i zimsko vrijeme", () => {
    // 2026-12-08 je utorak. 19:00 UTC = 20:00 po zagrebackom zimskom vremenu.
    // Da se zona ignorirala, ovdje bi ispalo 19:00 — zato je ovaj test tu.
    expect(formatirajTermin("2026-12-08T19:00:00.000Z")).toBe("uto 08.12.2026. u 20:00");
  });

  it("koristi hrvatske kratice dana", () => {
    // 2026-09-06 je nedjelja.
    expect(formatirajTermin("2026-09-06T10:00:00.000Z")).toMatch(/^ned /);
  });
});

describe("formatirajKratko", () => {
  it("daje samo datum", () => {
    expect(formatirajKratko("2026-09-08T18:00:00.000Z")).toBe("08.09.2026.");
  });
});

describe("formatirajSatnicu", () => {
  it("daje samo sate i minute", () => {
    expect(formatirajSatnicu("2026-09-08T18:00:00.000Z")).toBe("20:00");
  });
});

describe("zagrebUIso", () => {
  it("ljetno vrijeme: 20:00 u Zagrebu je 18:00 UTC", () => {
    expect(zagrebUIso("2026-09-08", "20:00")).toBe("2026-09-08T18:00:00.000Z");
  });

  it("zimsko vrijeme: 20:00 u Zagrebu je 19:00 UTC", () => {
    expect(zagrebUIso("2026-12-08", "20:00")).toBe("2026-12-08T19:00:00.000Z");
  });

  it("ono sto korisnik upise, to i vidi natrag", () => {
    // Ovo je zapravo jedina stvar koja korisnika zanima: da termin upisan
    // za 20:00 pise 20:00, bez obzira u kojoj zoni server radi.
    for (const datum of ["2026-01-15", "2026-06-15", "2026-09-08", "2026-12-08"]) {
      expect(formatirajTermin(zagrebUIso(datum, "20:00"))).toContain("u 20:00");
    }
  });

  it("prijelaz na ljetno vrijeme ne pomice vecernji termin", () => {
    // Zadnja nedjelja u ozujku 2026. je 29.03. — tada sat ide naprijed.
    expect(formatirajTermin(zagrebUIso("2026-03-29", "20:00"))).toContain("u 20:00");
    expect(formatirajTermin(zagrebUIso("2026-03-28", "20:00"))).toContain("u 20:00");
  });
});
