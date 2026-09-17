import { describe, it, expect } from "vitest";
import {
  finishedGamesHeading,
  matchShareText,
} from "@/lib/domain/match-summary-text";

describe("više utakmica u jednom terminu — prikaz", () => {
  it("lists both games in the summary heading and share text", () => {
    expect(finishedGamesHeading(2)).toBe("2 utakmice");
    expect(
      matchShareText("2026-09-17T18:00:00.000Z", "Bundek", [
        {
          seq: 1,
          labelA: "Bijeli",
          labelB: "Crni",
          scoreA: 4,
          scoreB: 2,
          scorers: "MISO 2, BRUNO 2",
        },
        {
          seq: 2,
          labelA: "Bijeli",
          labelB: "Crni",
          scoreA: 1,
          scoreB: 1,
          scorers: "IVA 1",
        },
      ]),
    ).toBe(
      [
        "Termin 17.09.2026., Bundek",
        "Utakmica 1: Bijeli 4 : 2 Crni\n⚽ MISO 2, BRUNO 2",
        "Utakmica 2: Bijeli 1 : 1 Crni\n⚽ IVA 1",
      ].join("\n\n"),
    );
  });
});
