import { describe, it, expect } from "vitest";
import { elapsedSeconds, formatClock } from "@/lib/domain/timer";

const T0 = "2026-09-08T18:00:00.000Z";

describe("elapsedSeconds", () => {
  it("vraca nulu prije pokretanja", () => {
    expect(
      elapsedSeconds({ startedAt: null, pausedAt: null, totalPausedSeconds: 0 }, new Date(T0)),
    ).toBe(0);
  });

  it("racuna proteklo vrijeme dok termin traje", () => {
    expect(
      elapsedSeconds(
        { startedAt: T0, pausedAt: null, totalPausedSeconds: 0 },
        new Date("2026-09-08T18:23:14.000Z"),
      ),
    ).toBe(1394);
  });

  it("oduzima ukupno pauzirano vrijeme", () => {
    expect(
      elapsedSeconds(
        { startedAt: T0, pausedAt: null, totalPausedSeconds: 60 },
        new Date("2026-09-08T18:10:00.000Z"),
      ),
    ).toBe(540);
  });

  it("stoji dok je pauzirano, bez obzira koliko je stvarno proslo", () => {
    const stanje = {
      startedAt: T0,
      pausedAt: "2026-09-08T18:05:00.000Z",
      totalPausedSeconds: 0,
    };
    expect(elapsedSeconds(stanje, new Date("2026-09-08T18:05:30.000Z"))).toBe(300);
    expect(elapsedSeconds(stanje, new Date("2026-09-08T18:30:00.000Z"))).toBe(300);
  });

  it("nakon nastavka nastavlja od mjesta gdje je stalo", () => {
    // Pauza je trajala 10 minuta; nakon nastavka je proteklo 5+3 minute igre.
    expect(
      elapsedSeconds(
        { startedAt: T0, pausedAt: null, totalPausedSeconds: 600 },
        new Date("2026-09-08T18:18:00.000Z"),
      ),
    ).toBe(480);
  });

  it("nikad ne vraca negativan broj", () => {
    expect(
      elapsedSeconds(
        { startedAt: T0, pausedAt: null, totalPausedSeconds: 9999 },
        new Date("2026-09-08T18:00:10.000Z"),
      ),
    ).toBe(0);
  });

  it("stoji nakon zavrsetka utakmice", () => {
    const stanje = {
      startedAt: T0,
      pausedAt: null,
      endedAt: "2026-09-08T18:20:00.000Z",
      totalPausedSeconds: 0,
    };
    expect(elapsedSeconds(stanje, new Date("2026-09-08T18:20:30.000Z"))).toBe(1200);
    expect(elapsedSeconds(stanje, new Date("2026-09-08T19:00:00.000Z"))).toBe(1200);
  });

  it("zavrsena utakmica ima prednost nad pauzom za kraj brojanja", () => {
    // endedAt wins; finish-while-paused should set endedAt to the pause moment.
    expect(
      elapsedSeconds(
        {
          startedAt: T0,
          pausedAt: "2026-09-08T18:05:00.000Z",
          endedAt: "2026-09-08T18:05:00.000Z",
          totalPausedSeconds: 0,
        },
        new Date("2026-09-08T18:40:00.000Z"),
      ),
    ).toBe(300);
  });
});

describe("formatClock", () => {
  it("formatira minute i sekunde s vodecom nulom", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(1394)).toBe("23:14");
  });

  it("nastavlja brojati preko 99 minuta", () => {
    expect(formatClock(6000)).toBe("100:00");
  });
});
