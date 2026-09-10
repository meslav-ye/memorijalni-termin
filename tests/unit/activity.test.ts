import { describe, expect, it } from "vitest";
import {
  type ActivityEntry,
  bestAvgSpeedInSingleTermin,
  bestDistanceInSingleTermin,
  bestMaxSpeedInSingleTermin,
  parseActivityFields,
  sumDistanceByUser,
  validateActivityFields,
} from "@/lib/domain/activity";

const entries: ActivityEntry[] = [
  {
    matchId: "m1",
    userId: "ana",
    distanceKm: 6,
    maxSpeedKmh: 28,
    avgSpeedKmh: 8,
    startsAt: "2026-03-01T18:00:00Z",
  },
  {
    matchId: "m2",
    userId: "ana",
    distanceKm: 7,
    maxSpeedKmh: 25,
    avgSpeedKmh: 9.5,
    startsAt: "2026-03-08T18:00:00Z",
  },
  {
    matchId: "m2",
    userId: "bruno",
    distanceKm: 8.4,
    maxSpeedKmh: 31.2,
    avgSpeedKmh: 7,
    startsAt: "2026-03-08T18:00:00Z",
  },
];

describe("parseActivityFields", () => {
  it("parses comma decimals and empty as null", () => {
    expect(
      parseActivityFields({ distance: "6,2", maxSpeed: "", avgSpeed: "8.1" }),
    ).toEqual({ distanceKm: 6.2, maxSpeedKmh: null, avgSpeedKmh: 8.1 });
  });

  it("returns error token for non-numeric", () => {
    expect(parseActivityFields({ distance: "abc", maxSpeed: "", avgSpeed: "" })).toEqual({
      error: "Neispravan broj.",
    });
  });
});

describe("validateActivityFields", () => {
  it("allows partial fields", () => {
    expect(
      validateActivityFields({ distanceKm: 5, maxSpeedKmh: null, avgSpeedKmh: null }),
    ).toBeNull();
  });

  it("rejects avg > max when both set", () => {
    expect(
      validateActivityFields({ distanceKm: null, maxSpeedKmh: 10, avgSpeedKmh: 12 }),
    ).toMatch(/prosječna/i);
  });

  it("rejects over limit distance", () => {
    expect(
      validateActivityFields({ distanceKm: 51, maxSpeedKmh: null, avgSpeedKmh: null }),
    ).toMatch(/distanca/i);
  });

  it("treats all-null as clear (valid)", () => {
    expect(
      validateActivityFields({ distanceKm: null, maxSpeedKmh: null, avgSpeedKmh: null }),
    ).toBeNull();
  });
});

describe("sumDistanceByUser", () => {
  it("sums distance and skips nulls", () => {
    expect(sumDistanceByUser(entries)).toEqual(
      expect.arrayContaining([
        { userId: "ana", distanceKm: 13 },
        { userId: "bruno", distanceKm: 8.4 },
      ]),
    );
  });
});

describe("single-termin records", () => {
  it("best distance is bruno 8.4 on m2", () => {
    expect(bestDistanceInSingleTermin(entries)).toEqual({
      value: 8.4,
      userId: "bruno",
      startsAt: "2026-03-08T18:00:00Z",
    });
  });

  it("best max speed is bruno 31.2", () => {
    expect(bestMaxSpeedInSingleTermin(entries)?.value).toBe(31.2);
  });

  it("best avg speed is ana 9.5", () => {
    expect(bestAvgSpeedInSingleTermin(entries)?.value).toBe(9.5);
  });
});
