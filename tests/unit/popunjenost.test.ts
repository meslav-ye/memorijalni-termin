import { describe, it, expect } from "vitest";
import { popunjenost } from "@/lib/domain/popunjenost";

describe("popunjenost", () => {
  it("kad nitko nije prijavljen, fali do minimuma cijeli minimum", () => {
    const p = popunjenost(0, 10, 12);
    expect(p.faliDoMin).toBe(10);
    expect(p.ton).toBe("malo");
    expect(p.oznaka).toBe("Fali još 10");
  });

  it("jednina kad fali tocno jedan", () => {
    expect(popunjenost(9, 10, 12).oznaka).toBe("Fali još 1");
  });

  it("cim se dosegne minimum, termin se igra", () => {
    const p = popunjenost(10, 10, 12);
    expect(p.faliDoMin).toBe(0);
    expect(p.ton).toBe("dovoljno");
    expect(p.oznaka).toBe("Igra se — još 2 mjesta");
  });

  it("jednina i za zadnje slobodno mjesto", () => {
    expect(popunjenost(11, 10, 12).oznaka).toBe("Igra se — još 1 mjesto");
  });

  it("kad je puno, nema vise mjesta", () => {
    const p = popunjenost(12, 10, 12);
    expect(p.slobodnoMjesta).toBe(0);
    expect(p.ton).toBe("puno");
    expect(p.oznaka).toBe("Popunjeno");
  });

  it("preko kvote ne daje negativan broj mjesta", () => {
    const p = popunjenost(15, 10, 12);
    expect(p.slobodnoMjesta).toBe(0);
    expect(p.ton).toBe("puno");
  });

  it("radi i kad su minimum i kvota jednaki", () => {
    const p = popunjenost(10, 10, 10);
    expect(p.ton).toBe("puno");
    expect(p.oznaka).toBe("Popunjeno");
  });
});
