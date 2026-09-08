import { describe, it, expect } from "vitest";
import { fillStatus } from "@/lib/domain/fill";

describe("fillStatus", () => {
  it("kad nitko nije prijavljen, fali do minimuma cijeli minimum", () => {
    const p = fillStatus(0, 10, 12);
    expect(p.shortOfMin).toBe(10);
    expect(p.tone).toBe("low");
    expect(p.label).toBe("Fali još 10");
  });

  it("jednina kad fali tocno jedan", () => {
    expect(fillStatus(9, 10, 12).label).toBe("Fali još 1");
  });

  it("cim se dosegne minimum, termin se igra", () => {
    const p = fillStatus(10, 10, 12);
    expect(p.shortOfMin).toBe(0);
    expect(p.tone).toBe("enough");
    expect(p.label).toBe("Igra se — još 2 mjesta");
  });

  it("jednina i za zadnje slobodno mjesto", () => {
    expect(fillStatus(11, 10, 12).label).toBe("Igra se — još 1 mjesto");
  });

  it("kad je puno, nema vise mjesta", () => {
    const p = fillStatus(12, 10, 12);
    expect(p.freeSlots).toBe(0);
    expect(p.tone).toBe("full");
    expect(p.label).toBe("Popunjeno");
  });

  it("preko kvote ne daje negativan broj mjesta", () => {
    const p = fillStatus(15, 10, 12);
    expect(p.freeSlots).toBe(0);
    expect(p.tone).toBe("full");
  });

  it("radi i kad su minimum i kvota jednaki", () => {
    const p = fillStatus(10, 10, 10);
    expect(p.tone).toBe("full");
    expect(p.label).toBe("Popunjeno");
  });
});
