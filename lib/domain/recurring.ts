import { zagrebUIso } from "@/lib/format";

/** Days before kickoff when the next series occurrence becomes visible. */
export const SERIES_VISIBILITY_DAYS = 6;

const ZONA = "Europe/Zagreb";
const EN_DANI = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function zagrebParts(iso: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(
    f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return {
    weekday: EN_DANI.indexOf(p.weekday as (typeof EN_DANI)[number]),
    ymd: `${p.year}-${p.month}-${p.day}`,
    hour: p.hour === "24" ? "00" : p.hour,
    minute: p.minute,
  };
}

/** Weekday in Zagreb for a calendar date `YYYY-MM-DD` (0=Sun … 6=Sat). */
export function zagrebWeekdayFromYmd(ymd: string): number {
  return zagrebParts(zagrebUIso(ymd, "12:00")).weekday;
}

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Next weekly kickoff strictly after `after`, at Zagreb wall-clock `timeLocal`.
 * Adds calendar weeks — never raw 7×24h UTC (DST-safe).
 */
export function nextWeeklyStartsAt(
  weekday: number,
  timeLocal: string,
  after: Date,
): string {
  const afterParts = zagrebParts(after.toISOString());
  // Start scanning from the Zagreb calendar day of `after`.
  let ymd = afterParts.ymd;

  for (let i = 0; i < 8; i++) {
    if (zagrebWeekdayFromYmd(ymd) === weekday) {
      const iso = zagrebUIso(ymd, timeLocal);
      if (new Date(iso).getTime() > after.getTime()) return iso;
    }
    ymd = addDaysToYmd(ymd, 1);
  }

  // Unreachable for a valid weekday 0–6; keep a deterministic fallback.
  return zagrebUIso(ymd, timeLocal);
}

/** Same weekday/time one calendar week later (DST-safe). */
export function addOneWeekZagreb(startsAtIso: string): string {
  const { weekday, ymd, hour, minute } = zagrebParts(startsAtIso);
  const nextYmd = addDaysToYmd(ymd, 7);
  // Sanity: same weekday after +7 calendar days.
  void weekday;
  return zagrebUIso(nextYmd, `${hour}:${minute}`);
}

/**
 * True when kickoff is in the future and at most SERIES_VISIBILITY_DAYS ahead.
 * Uses calendar-day distance in Zagreb so DST does not widen/narrow the window.
 */
export function isWithinVisibilityWindow(startsAtIso: string, now: Date): boolean {
  const kickoff = new Date(startsAtIso).getTime();
  if (kickoff <= now.getTime()) return false;

  const nowYmd = zagrebParts(now.toISOString()).ymd;
  const kickYmd = zagrebParts(startsAtIso).ymd;

  // Difference in calendar days via UTC noon anchors.
  const [ny, nm, nd] = nowYmd.split("-").map(Number);
  const [ky, km, kd] = kickYmd.split("-").map(Number);
  const nowNoon = Date.UTC(ny, nm - 1, nd);
  const kickNoon = Date.UTC(ky, km - 1, kd);
  const dayDiff = Math.round((kickNoon - nowNoon) / 86_400_000);

  return dayDiff >= 0 && dayDiff <= SERIES_VISIBILITY_DAYS;
}
