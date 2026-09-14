import { describe, it, expect } from "vitest";
import { mergePastMatchRows } from "@/lib/domain/past-matches";

describe("mergePastMatchRows", () => {
  it("puts a cancelled future match before older finished ones", () => {
    const merged = mergePastMatchRows(
      [
        { id: "old", starts_at: "2026-09-07T18:00:00.000Z" },
        { id: "older", starts_at: "2026-08-31T18:00:00.000Z" },
      ],
      [{ id: "cancelled", starts_at: "2026-09-21T18:00:00.000Z" }],
      20,
    );
    expect(merged.map((r) => r.id)).toEqual(["cancelled", "old", "older"]);
  });

  it("keeps the newest `limit` rows", () => {
    const merged = mergePastMatchRows(
      [
        { id: "a", starts_at: "2026-09-01T00:00:00.000Z" },
        { id: "b", starts_at: "2026-09-02T00:00:00.000Z" },
      ],
      [{ id: "c", starts_at: "2026-09-03T00:00:00.000Z" }],
      2,
    );
    expect(merged.map((r) => r.id)).toEqual(["c", "b"]);
  });
});
