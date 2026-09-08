import { describe, it, expect } from "vitest";
import { membersNotSignedUp } from "@/lib/domain/admin-signup";

describe("membersNotSignedUp", () => {
  it("returns empty when everyone is already signed up", () => {
    expect(
      membersNotSignedUp(
        [
          { userId: "a", nickname: "Ana" },
          { userId: "b", nickname: "Bruno" },
        ],
        ["a", "b"],
      ),
    ).toEqual([]);
  });

  it("excludes active signups and sorts by nickname", () => {
    expect(
      membersNotSignedUp(
        [
          { userId: "c", nickname: "Zoran" },
          { userId: "a", nickname: "Ana" },
          { userId: "b", nickname: "Bruno" },
        ],
        ["b"],
      ),
    ).toEqual([
      { userId: "a", nickname: "Ana" },
      { userId: "c", nickname: "Zoran" },
    ]);
  });

  it("keeps someone who only has a cancelled signup (not in active list)", () => {
    expect(
      membersNotSignedUp([{ userId: "a", nickname: "Ana" }], []),
    ).toEqual([{ userId: "a", nickname: "Ana" }]);
  });
});
