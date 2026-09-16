import { describe, expect, it } from "vitest";
import {
  latestSeasonIdFromList,
  leaderboardSeasonCacheKey,
  resolveLeaderboardSeasonId,
  seasonIdFromQuery,
} from "@/lib/domain/season-chips";

describe("seasonIdFromQuery", () => {
  it("treats a missing sezona as latest (resolved inside the leaderboard cache)", () => {
    expect(seasonIdFromQuery(null)).toBeUndefined();
  });

  it("treats sve as all-time", () => {
    expect(seasonIdFromQuery("sve")).toBeNull();
  });

  it("passes a season id through", () => {
    expect(seasonIdFromQuery("season-old")).toBe("season-old");
  });
});

describe("leaderboardSeasonCacheKey", () => {
  it("does not collapse latest and all-time into the same key", () => {
    expect(leaderboardSeasonCacheKey(undefined)).toBe("latest");
    expect(leaderboardSeasonCacheKey(null)).toBe("all");
    expect(leaderboardSeasonCacheKey(undefined)).not.toBe(
      leaderboardSeasonCacheKey(null),
    );
  });

  it("uses the season id as the key when one is requested", () => {
    expect(leaderboardSeasonCacheKey("season-old")).toBe("season-old");
  });
});

describe("resolveLeaderboardSeasonId", () => {
  const seasons = [{ id: "season-new" }, { id: "season-old" }];

  it("picks the newest season when the query asked for latest", () => {
    expect(resolveLeaderboardSeasonId(undefined, seasons)).toBe("season-new");
  });

  it("falls back to all-time when latest is requested but there are no seasons", () => {
    expect(resolveLeaderboardSeasonId(undefined, [])).toBeNull();
  });

  it("keeps an explicit season id or all-time", () => {
    expect(resolveLeaderboardSeasonId("season-old", seasons)).toBe("season-old");
    expect(resolveLeaderboardSeasonId(null, seasons)).toBeNull();
  });
});

describe("latestSeasonIdFromList", () => {
  it("returns the first id (newest-first list) or null", () => {
    expect(latestSeasonIdFromList([{ id: "a" }, { id: "b" }])).toBe("a");
    expect(latestSeasonIdFromList([])).toBeNull();
  });
});
