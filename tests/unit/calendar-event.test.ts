import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATCH_DURATION_MINUTES,
  REMINDER_MINUTES_BEFORE,
  buildGoogleCalendarUrl,
  buildIcs,
  escapeIcsText,
  formatIcsUtc,
  shouldOfferCalendar,
} from "@/lib/domain/calendar-event";

describe("escapeIcsText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("formatIcsUtc", () => {
  it("formats as YYYYMMDDTHHMMSSZ", () => {
    expect(formatIcsUtc(new Date("2026-09-08T18:00:00.000Z"))).toBe(
      "20260908T180000Z",
    );
  });
});

describe("buildIcs", () => {
  it("includes title, location, times, uid and 2h alarm", () => {
    const start = new Date("2026-09-08T18:00:00.000Z");
    const ics = buildIcs({
      uid: "match-abc@memorijalni-termin",
      title: "Memorijalni; termin",
      location: "Dvorana, Zagreb",
      description: "Line1\nLine2",
      startsAt: start,
      durationMinutes: DEFAULT_MATCH_DURATION_MINUTES,
      reminderMinutesBefore: REMINDER_MINUTES_BEFORE,
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:match-abc@memorijalni-termin");
    expect(ics).toContain("SUMMARY:Memorijalni\\; termin");
    expect(ics).toContain("LOCATION:Dvorana\\, Zagreb");
    expect(ics).toContain("DESCRIPTION:Line1\\nLine2");
    expect(ics).toContain("DTSTART:20260908T180000Z");
    // 90 minutes later
    expect(ics).toContain("DTEND:20260908T193000Z");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT120M");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("builds a template URL with UTC dates", () => {
    const url = buildGoogleCalendarUrl({
      title: "Termin",
      location: "Dvorana",
      description: "detalji",
      startsAt: new Date("2026-09-08T18:00:00.000Z"),
      durationMinutes: 90,
    });
    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(
      true,
    );
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=Termin");
    expect(url).toContain("dates=20260908T180000Z%2F20260908T193000Z");
    expect(url).toContain("location=Dvorana");
    expect(url).toContain("details=detalji");
  });
});

describe("shouldOfferCalendar", () => {
  const now = new Date("2026-09-16T13:45:00.000Z");
  const later = new Date("2026-09-16T18:00:00.000Z");

  it("offers calendar for a future announced match with enough players", () => {
    expect(
      shouldOfferCalendar({
        status: "najavljen",
        enoughForPlay: true,
        startsAt: later,
        now,
      }),
    ).toBe(true);
  });

  it("hides calendar for a play-now match whose kickoff is now", () => {
    expect(
      shouldOfferCalendar({
        status: "najavljen",
        enoughForPlay: true,
        startsAt: now,
        now,
      }),
    ).toBe(false);
  });

  it("hides calendar once kickoff has passed, even if still announced", () => {
    expect(
      shouldOfferCalendar({
        status: "najavljen",
        enoughForPlay: true,
        startsAt: new Date("2026-09-16T13:44:00.000Z"),
        now,
      }),
    ).toBe(false);
  });

  it("hides calendar when the match is live or cancelled, or still short of players", () => {
    expect(
      shouldOfferCalendar({
        status: "u_tijeku",
        enoughForPlay: true,
        startsAt: later,
        now,
      }),
    ).toBe(false);
    expect(
      shouldOfferCalendar({
        status: "otkazan",
        enoughForPlay: true,
        startsAt: later,
        now,
      }),
    ).toBe(false);
    expect(
      shouldOfferCalendar({
        status: "najavljen",
        enoughForPlay: false,
        startsAt: later,
        now,
      }),
    ).toBe(false);
  });
});
