/** Default length of a recreational session for calendar end time. */
export const DEFAULT_MATCH_DURATION_MINUTES = 90;

/** Calendar reminder before kickoff (spec §13.1). */
export const REMINDER_MINUTES_BEFORE = 120;

export type CalendarEventInput = {
  uid: string;
  title: string;
  location: string;
  description: string;
  startsAt: Date;
  durationMinutes: number;
  reminderMinutesBefore: number;
};

/** Escape TEXT values per RFC 5545. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\n");
}

/** UTC stamp for DTSTART / DTEND / Google dates. */
export function formatIcsUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

function endsAt(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

/**
 * Minimal VCALENDAR / VEVENT with a display alarm.
 * Lines end with CRLF as required by ICS consumers.
 */
export function buildIcs(input: CalendarEventInput): string {
  const end = endsAt(input.startsAt, input.durationMinutes);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Memorijalni termin//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(input.startsAt)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `LOCATION:${escapeIcsText(input.location)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(input.title)}`,
    `TRIGGER:-PT${input.reminderMinutesBefore}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function buildGoogleCalendarUrl(input: {
  title: string;
  location: string;
  description: string;
  startsAt: Date;
  durationMinutes: number;
}): string {
  const end = endsAt(input.startsAt, input.durationMinutes);
  const dates = `${formatIcsUtc(input.startsAt)}/${formatIcsUtc(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates,
    details: input.description,
    location: input.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
