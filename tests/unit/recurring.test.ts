import { describe, it, expect } from "vitest";
import {
  SERIES_VISIBILITY_DAYS,
  isWithinVisibilityWindow,
  nextWeeklyStartsAt,
  zagrebWeekdayFromYmd,
  addOneWeekZagreb,
} from "@/lib/domain/recurring";
import { formatMatchDateTime, zagrebUIso } from "@/lib/format";

describe("zagrebWeekdayFromYmd", () => {
  it("maps Monday 2026-10-19 to 1", () => {
    expect(zagrebWeekdayFromYmd("2026-10-19")).toBe(1);
  });
});

describe("addOneWeekZagreb", () => {
  it("keeps wall-clock time across the autumn DST change", () => {
    // Mon 19.10.2026 18:00 → Mon 26.10.2026 18:00 (not 17:00)
    const first = zagrebUIso("2026-10-19", "18:00");
    const second = addOneWeekZagreb(first);
    expect(formatMatchDateTime(second)).toBe("pon 26.10.2026. u 18:00");
  });
});

describe("nextWeeklyStartsAt", () => {
  it("returns the next matching weekday after a given instant", () => {
    const after = new Date(zagrebUIso("2026-10-19", "18:00"));
    const next = nextWeeklyStartsAt(1, "18:00", after);
    expect(formatMatchDateTime(next)).toBe("pon 26.10.2026. u 18:00");
  });

  it("skips an occurrence that is not strictly after `after`", () => {
    const after = new Date(zagrebUIso("2026-10-26", "18:00"));
    const next = nextWeeklyStartsAt(1, "18:00", after);
    expect(formatMatchDateTime(next)).toBe("pon 02.11.2026. u 18:00");
  });
});

describe("isWithinVisibilityWindow", () => {
  it(`is true when kickoff is at most ${SERIES_VISIBILITY_DAYS} days ahead`, () => {
    const now = new Date(zagrebUIso("2026-10-20", "12:00")); // Tue
    const kickoff = zagrebUIso("2026-10-26", "18:00"); // next Mon (~6 days)
    expect(isWithinVisibilityWindow(kickoff, now)).toBe(true);
  });

  it("is false when kickoff is more than 6 days ahead", () => {
    const now = new Date(zagrebUIso("2026-10-19", "12:00")); // Mon of match week
    const kickoff = zagrebUIso("2026-10-26", "18:00"); // +7 days
    expect(isWithinVisibilityWindow(kickoff, now)).toBe(false);
  });

  it("is false when kickoff is already past", () => {
    const now = new Date(zagrebUIso("2026-10-26", "19:00"));
    const kickoff = zagrebUIso("2026-10-26", "18:00");
    expect(isWithinVisibilityWindow(kickoff, now)).toBe(false);
  });
});
