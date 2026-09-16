import { describe, it, expect } from "vitest";
import {
  applyLiveEvent,
  applyLiveGame,
  applyLiveLineup,
  liveEventFromRow,
  mergeLiveLineup,
  type LiveEventRow,
  type LiveLineupRow,
  type LiveSyncLineupPlayer,
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

const lineupRow = (over: Partial<LiveLineupRow> = {}): LiveLineupRow => ({
  id: "l1",
  game_id: "g1",
  match_id: "m1",
  user_id: "u1",
  filler_id: null,
  team: "A",
  is_goalkeeper: false,
  display_name: null,
  is_guest: false,
  ...over,
});

const player = (
  over: Partial<LiveSyncLineupPlayer> = {},
): LiveSyncLineupPlayer => ({
  lineupId: "l1",
  userId: "u1",
  fillerId: null,
  nickname: "Miki",
  team: "A",
  isGoalkeeper: false,
  isGuest: false,
  ...over,
});

describe("applyLiveLineup", () => {
  it("moves a player to the other team without a refetch", () => {
    const result = applyLiveLineup([player()], "UPDATE", lineupRow({ team: "B" }), "g1");
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value[0]?.team).toBe("B");
    expect(result.value[0]?.nickname).toBe("Miki");
  });

  it("toggles goalkeeper on the same row", () => {
    const result = applyLiveLineup(
      [player()],
      "UPDATE",
      lineupRow({ is_goalkeeper: true }),
      "g1",
    );
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value[0]?.isGoalkeeper).toBe(true);
  });

  it("inserts a guest from the payload", () => {
    const result = applyLiveLineup(
      [],
      "INSERT",
      lineupRow({
        id: "l2",
        user_id: null,
        filler_id: "f1",
        is_guest: true,
        display_name: "Gost Pero",
      }),
      "g1",
    );
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value).toEqual([
      {
        lineupId: "l2",
        userId: "",
        fillerId: "f1",
        nickname: "Gost Pero",
        team: "A",
        isGoalkeeper: false,
        isGuest: true,
      },
    ]);
  });

  it("refetches a registered insert when the nickname is unknown", () => {
    expect(applyLiveLineup([], "INSERT", lineupRow(), "g1").kind).toBe("refresh");
  });

  it("inserts a registered player when display_name is on the row", () => {
    const result = applyLiveLineup(
      [],
      "INSERT",
      lineupRow({ id: "l2", user_id: "u2", display_name: "Iva" }),
      "g1",
    );
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value.some((p) => p.lineupId === "l2" && p.nickname === "Iva")).toBe(
      true,
    );
  });

  it("removes a deleted player", () => {
    const result = applyLiveLineup([player()], "DELETE", lineupRow(), "g1");
    expect(result.kind).toBe("apply");
    if (result.kind !== "apply") return;
    expect(result.value).toEqual([]);
  });

  it("ignores lineup rows from another game", () => {
    expect(applyLiveLineup([], "INSERT", lineupRow(), "g2").kind).toBe("unchanged");
  });

  it("asks for a refetch when the row is missing", () => {
    expect(applyLiveLineup([], "INSERT", null, "g1").kind).toBe("refresh");
  });
});

describe("mergeLiveLineup", () => {
  it("keeps nicknames when Nova utakmica copies the same players under new ids", () => {
    const prev = [
      player({ lineupId: "old-a", userId: "u1", nickname: "MISO", team: "A" }),
      player({ lineupId: "old-b", userId: "u2", nickname: "BRUNO", team: "B" }),
    ];
    const next = mergeLiveLineup(prev, [
      lineupRow({ id: "new-a", user_id: "u1", team: "A" }),
      lineupRow({ id: "new-b", user_id: "u2", team: "B", game_id: "g2" }),
    ]);
    expect(next).toEqual([
      {
        lineupId: "new-a",
        userId: "u1",
        fillerId: null,
        nickname: "MISO",
        team: "A",
        isGoalkeeper: false,
        isGuest: false,
      },
      {
        lineupId: "new-b",
        userId: "u2",
        fillerId: null,
        nickname: "BRUNO",
        team: "B",
        isGoalkeeper: false,
        isGuest: false,
      },
    ]);
  });

  it("uses extra nicknames when the previous list has no match", () => {
    const next = mergeLiveLineup(
      [],
      [lineupRow({ id: "l9", user_id: "u9" })],
      new Map([["u9", "CVIJA"]]),
    );
    expect(next[0]?.nickname).toBe("CVIJA");
  });

  it("keeps guest names by filler id across games", () => {
    const prev = [
      player({
        lineupId: "old-g",
        userId: "",
        fillerId: "f1",
        nickname: "Marko",
        isGuest: true,
      }),
    ];
    const next = mergeLiveLineup(prev, [
      lineupRow({
        id: "new-g",
        user_id: null,
        filler_id: "f1",
        is_guest: true,
        display_name: "Marko",
      }),
    ]);
    expect(next[0]).toMatchObject({
      lineupId: "new-g",
      fillerId: "f1",
      nickname: "Marko",
      isGuest: true,
    });
  });
});
