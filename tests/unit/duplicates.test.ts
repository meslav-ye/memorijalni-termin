import { describe, it, expect } from "vitest";
import {
  findRecentDuplicate,
  secondsAgo,
  DUPLICATE_WINDOW_SECONDS,
} from "@/lib/domain/duplicates";
import type { GoalEventLite } from "@/lib/domain/types";

const SADA = new Date("2026-09-08T18:23:14.000Z");

const gol = (
  id: string,
  scorerId: string,
  prijeSekundi: number,
  deletedAt: string | null = null,
): GoalEventLite => ({
  id,
  type: "goal",
  scorerId,
  createdAt: new Date(SADA.getTime() - prijeSekundi * 1000).toISOString(),
  deletedAt,
});

describe("findRecentDuplicate", () => {
  it("nema duplikata kad nema dogadjaja", () => {
    expect(findRecentDuplicate([], "marko", SADA)).toBeNull();
  });

  it("prepoznaje gol istog igraca unutar prozora", () => {
    expect(findRecentDuplicate([gol("e1", "marko", 4)], "marko", SADA)?.id).toBe("e1");
  });

  it("gol tocno na granici prozora se jos broji kao duplikat", () => {
    expect(
      findRecentDuplicate([gol("e1", "marko", DUPLICATE_WINDOW_SECONDS)], "marko", SADA),
    ).not.toBeNull();
  });

  it("ignorira gol stariji od prozora", () => {
    expect(
      findRecentDuplicate([gol("e1", "marko", DUPLICATE_WINDOW_SECONDS + 1)], "marko", SADA),
    ).toBeNull();
  });

  it("ignorira gol drugog igraca", () => {
    expect(findRecentDuplicate([gol("e1", "luka", 2)], "marko", SADA)).toBeNull();
  });

  it("ignorira vec ponisteni gol", () => {
    expect(
      findRecentDuplicate([gol("e1", "marko", 2, SADA.toISOString())], "marko", SADA),
    ).toBeNull();
  });

  it("ignorira autogol", () => {
    const autogol: GoalEventLite = { ...gol("e1", "marko", 2), type: "own_goal" };
    expect(findRecentDuplicate([autogol], "marko", SADA)).toBeNull();
  });

  it("kad ih je vise, vraca neki od nedavnih", () => {
    const nadjen = findRecentDuplicate(
      [gol("stari", "marko", 60), gol("novi", "marko", 3)],
      "marko",
      SADA,
    );
    expect(nadjen?.id).toBe("novi");
  });
});

describe("secondsAgo", () => {
  it("racuna koliko je sekundi proslo", () => {
    expect(secondsAgo(gol("e1", "marko", 4), SADA)).toBe(4);
  });

  it("nikad ne vraca negativan broj", () => {
    expect(secondsAgo(gol("e1", "marko", -5), SADA)).toBe(0);
  });
});
