export type ActivityFields = {
  distanceKm: number | null;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
};

const DISTANCE_MAX = 50;
const MAX_SPEED_MAX = 50;
const AVG_SPEED_MAX = 40;

function parseOne(raw: string): number | null | "bad" {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return "bad";
  return n;
}

export function parseActivityFields(input: {
  distance: string;
  maxSpeed: string;
  avgSpeed: string;
}): ActivityFields | { error: string } {
  const distanceKm = parseOne(input.distance);
  const maxSpeedKmh = parseOne(input.maxSpeed);
  const avgSpeedKmh = parseOne(input.avgSpeed);
  if (distanceKm === "bad" || maxSpeedKmh === "bad" || avgSpeedKmh === "bad") {
    return { error: "Neispravan broj." };
  }
  return { distanceKm, maxSpeedKmh, avgSpeedKmh };
}

export function validateActivityFields(f: ActivityFields): string | null {
  const check = (n: number | null, max: number, label: string) => {
    if (n === null) return null;
    if (n < 0) return `${label} ne smije biti negativna.`;
    if (n > max) return `${label} je nerealna (max ${max}).`;
    return null;
  };
  return (
    check(f.distanceKm, DISTANCE_MAX, "Distanca") ||
    check(f.maxSpeedKmh, MAX_SPEED_MAX, "Max brzina") ||
    check(f.avgSpeedKmh, AVG_SPEED_MAX, "Prosječna brzina") ||
    (f.maxSpeedKmh !== null &&
    f.avgSpeedKmh !== null &&
    f.avgSpeedKmh > f.maxSpeedKmh
      ? "Prosječna brzina ne smije biti veća od max brzine."
      : null)
  );
}

export function isEmptyActivity(f: ActivityFields): boolean {
  return f.distanceKm === null && f.maxSpeedKmh === null && f.avgSpeedKmh === null;
}
