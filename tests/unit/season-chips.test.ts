import { describe, expect, it } from "vitest";
import { isSeasonChipActive } from "@/lib/domain/season-chips";

describe("isSeasonChipActive", () => {
  const latest = "season-new";

  it("marks only the latest season when query has no sezona", () => {
    expect(
      isSeasonChipActive({ chipId: "season-new", requestedSeason: null, latestSeasonId: latest }),
    ).toBe(true);
    expect(
      isSeasonChipActive({ chipId: "season-old", requestedSeason: null, latestSeasonId: latest }),
    ).toBe(false);
    expect(
      isSeasonChipActive({ chipId: "sve", requestedSeason: null, latestSeasonId: latest }),
    ).toBe(false);
  });

  it("marks the requested season id", () => {
    expect(
      isSeasonChipActive({
        chipId: "season-old",
        requestedSeason: "season-old",
        latestSeasonId: latest,
      }),
    ).toBe(true);
    expect(
      isSeasonChipActive({
        chipId: "season-new",
        requestedSeason: "season-old",
        latestSeasonId: latest,
      }),
    ).toBe(false);
  });

  it("marks sve when requestedSeason is sve", () => {
    expect(
      isSeasonChipActive({ chipId: "sve", requestedSeason: "sve", latestSeasonId: latest }),
    ).toBe(true);
    expect(
      isSeasonChipActive({ chipId: "season-new", requestedSeason: "sve", latestSeasonId: latest }),
    ).toBe(false);
  });

  it("marks nothing for a season chip when there is no latest and no request", () => {
    expect(
      isSeasonChipActive({ chipId: "season-x", requestedSeason: null, latestSeasonId: null }),
    ).toBe(false);
  });

  it("marks sve when group has no seasons (all-time is default)", () => {
    expect(
      isSeasonChipActive({ chipId: "sve", requestedSeason: null, latestSeasonId: null }),
    ).toBe(true);
  });
});
