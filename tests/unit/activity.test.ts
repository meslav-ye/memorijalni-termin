import { describe, expect, it } from "vitest";
import {
  parseActivityFields,
  validateActivityFields,
} from "@/lib/domain/activity";

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
