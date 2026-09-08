import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATCH_DURATION_MINUTES,
  REMINDER_MINUTES_BEFORE,
  buildGoogleCalendarUrl,
  buildIcs,
  escapeIcsText,
  formatIcsUtc,
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
