import { describe, it, expect } from "vitest";
import { isExpiresAtFresh } from "@/lib/auth/session-fresh";

describe("isExpiresAtFresh", () => {
  const now = 1_000_000_000_000; // ms

  it("is fresh when exp is more than skew seconds ahead", () => {
    const expSec = Math.floor(now / 1000) + 120;
    expect(isExpiresAtFresh(expSec, now, 90)).toBe(true);
  });

  it("is not fresh when within skew window", () => {
    const expSec = Math.floor(now / 1000) + 60;
    expect(isExpiresAtFresh(expSec, now, 90)).toBe(false);
  });

  it("is not fresh when already expired", () => {
    const expSec = Math.floor(now / 1000) - 10;
    expect(isExpiresAtFresh(expSec, now, 90)).toBe(false);
  });

  it("is not fresh when expiresAt is nullish", () => {
    expect(isExpiresAtFresh(null, now, 90)).toBe(false);
    expect(isExpiresAtFresh(undefined, now, 90)).toBe(false);
  });
});
