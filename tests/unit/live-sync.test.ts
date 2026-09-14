import { describe, it, expect } from "vitest";
import {
  applyLiveEvent,
  applyLiveGame,
  liveEventFromRow,
  type LiveEventRow,
} from "@/lib/domain/live-sync";

const row = (over: Partial<LiveEventRow> = {}): LiveEventRow => ({
  id: "e1",
  game_id: "g1",
  type: "goal",
  team: "A",
  scorer_id: "u1",
  scorer_filler_id: null,
  assist_id: null,
  assist_filler_id: null,
  elapsed_seconds: 12,
  created_at: "2026-09-14T13:00:00.000Z",
  deleted_at: null,
  ...over,
});

describe("applyLiveEvent", () => {
  it("inserts a goal for this game", () => {
    const result = applyLiveEvent([], "INSERT", row(), "g1");
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value).toEqual([liveEventFromRow(row())]);
  });

  it("ignores a duplicate insert", () => {
    const existing = [liveEventFromRow(row())];
    expect(applyLiveEvent(existing, "INSERT", row(), "g1").kind).toBe("unchanged");
  });

  it("ignores events from another game", () => {
    expect(applyLiveEvent([], "INSERT", row(), "g2").kind).toBe("unchanged");
  });

  it("updates an assist without a refetch", () => {
    const existing = [liveEventFromRow(row())];
    const result = applyLiveEvent(
      existing,
      "UPDATE",
      row({ assist_id: "u2" }),
      "g1",
    );
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value[0]?.assistId).toBe("u2");
  });

  it("applies a missed insert on update", () => {
    const result = applyLiveEvent([], "UPDATE", row(), "g1");
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value).toHaveLength(1);
  });

  it("asks for a refetch when the row is missing", () => {
    expect(applyLiveEvent([], "INSERT", null, "g1").kind).toBe("refresh");
  });
});

describe("applyLiveGame", () => {
  const game = {
    id: "g1",
    seq: 1,
    status: "u_tijeku",
    started_at: "2026-09-14T13:00:00.000Z",
    paused_at: null,
    ended_at: null,
    total_paused_seconds: 0,
    team_a_name: null,
    team_b_name: "Gosti",
  };

  it("patches pause on the current game", () => {
    const result = applyLiveGame("g1", "UPDATE", {
      ...game,
      paused_at: "2026-09-14T13:05:00.000Z",
    });
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value.pausedAt).toBe("2026-09-14T13:05:00.000Z");
    expect(result.value.teamBName).toBe("Gosti");
  });

  it("refetches when a new game starts", () => {
    expect(applyLiveGame("g1", "INSERT", { ...game, id: "g2", seq: 2 }).kind).toBe(
      "refresh",
    );
  });

  it("ignores updates for a previous game", () => {
    expect(applyLiveGame("g2", "UPDATE", game).kind).toBe("unchanged");
  });
});
