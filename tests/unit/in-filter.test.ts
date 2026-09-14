import { describe, it, expect } from "vitest";
import { inUuids, UNMATCHABLE_UUID } from "@/lib/supabase/in-filter";

describe("inUuids", () => {
  it("keeps real ids", () => {
    expect(inUuids(["a", "b"])).toEqual(["a", "b"]);
  });

  it("uses a valid uuid when the list is empty", () => {
    expect(inUuids([])).toEqual([UNMATCHABLE_UUID]);
    expect(UNMATCHABLE_UUID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
