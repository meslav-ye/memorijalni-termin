import { createAdminClient } from "@/lib/supabase/admin";
import { INITIAL_RATING } from "@/lib/domain/elo";
import { computeDualElo } from "@/lib/domain/settle-ratings";
import { computeContributions } from "@/lib/domain/contribution";
import type { Team } from "@/lib/domain/types";

type MatchEmbed = {
  id: string;
  group_id: string;
  status: string;
  starts_at: string;
};

/**
 * Rebuild all group + global ratings from finished games in chronological
 * order, applying team Elo and individual contribution. Overwrites
 * rating_history and current rating tables.
 *
 * Use after introducing contribution (or any rating formula change) so past
 * games are not stuck on the old pure-Elo settlement.
 */
export async function replayAllRatings(): Promise<{ games: number }> {
  const admin = createAdminClient();

  const { data: games, error } = await admin
    .from("games")
    .select(
      "id, match_id, seq, score_a, score_b, matches!inner(id, group_id, status, starts_at)",
    )
    .eq("status", "zavrsena")
    .eq("matches.status", "zavrsen");

  if (error) throw new Error(error.message);

  const ordered = [...(games ?? [])].sort((a, b) => {
    const aMatch = a.matches as unknown as MatchEmbed;
    const bMatch = b.matches as unknown as MatchEmbed;
    const aStart = aMatch?.starts_at ?? "";
    const bStart = bMatch?.starts_at ?? "";
    if (aStart !== bStart) return aStart.localeCompare(bStart);
    return a.seq - b.seq;
  });

  // Wipe current ratings and history — we rewrite from scratch.
  const { error: histDelErr } = await admin
    .from("rating_history")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (histDelErr) throw new Error(histDelErr.message);

  const { error: prDelErr } = await admin
    .from("player_ratings")
    .delete()
    .neq("user_id", "00000000-0000-0000-0000-000000000000");
  if (prDelErr) throw new Error(prDelErr.message);

  const { error: profileResetErr } = await admin
    .from("profiles")
    .update({ global_rating: INITIAL_RATING, global_matches_played: 0 })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (profileResetErr) throw new Error(profileResetErr.message);

  const groupRating = new Map<string, number>(); // `${groupId}:${userId}`
  const groupPlayed = new Map<string, number>();
  const globalRating = new Map<string, number>();
  const globalPlayed = new Map<string, number>();

  const key = (groupId: string, userId: string) => `${groupId}:${userId}`;

  for (const game of ordered) {
    const match = game.matches as unknown as MatchEmbed;
    if (!match) continue;
    const groupId = match.group_id;
    const matchId = match.id;

    const [{ data: lineup }, { data: events }] = await Promise.all([
      admin
        .from("match_lineup")
        .select("user_id, team, is_goalkeeper")
        .eq("game_id", game.id),
      admin
        .from("match_events")
        .select("type, team, scorer_id, assist_id, elapsed_seconds, deleted_at")
        .eq("game_id", game.id)
        .in("type", ["goal", "own_goal", "keeper_change"]),
    ]);

    if (!lineup?.length) continue;

    const teamPlayers = (side: Team) =>
      lineup
        .filter((p) => p.team === side)
        .map((p) => ({
          userId: p.user_id,
          groupRating: groupRating.get(key(groupId, p.user_id)) ?? INITIAL_RATING,
          globalRating: globalRating.get(p.user_id) ?? INITIAL_RATING,
        }));

    const { group, global } = computeDualElo({
      teamA: teamPlayers("A"),
      teamB: teamPlayers("B"),
      scoreA: game.score_a,
      scoreB: game.score_b,
    });

    const contrib = computeContributions({
      lineup: lineup.map((p) => ({
        userId: p.user_id,
        team: p.team as Team,
        isGoalkeeper: p.is_goalkeeper,
      })),
      events: (events ?? []).map((e) => ({
        type: e.type as "goal" | "own_goal" | "keeper_change",
        team: e.team as Team | null,
        scorerId: e.scorer_id,
        assistId: e.assist_id,
        elapsedSeconds: e.elapsed_seconds,
        deletedAt: e.deleted_at,
      })),
    });

    const historyRows: {
      match_id: string;
      game_id: string;
      user_id: string;
      scope: "group" | "global";
      rating_before: number;
      rating_after: number;
    }[] = [];

    for (const u of group.updates) {
      const c = contrib.get(u.userId)?.clamped ?? 0;
      const after = u.ratingAfter + c;
      historyRows.push({
        match_id: matchId,
        game_id: game.id,
        user_id: u.userId,
        scope: "group",
        rating_before: u.ratingBefore,
        rating_after: after,
      });
      const k = key(groupId, u.userId);
      groupRating.set(k, after);
      groupPlayed.set(k, (groupPlayed.get(k) ?? 0) + 1);
    }

    for (const u of global.updates) {
      const c = contrib.get(u.userId)?.clamped ?? 0;
      const after = u.ratingAfter + c;
      historyRows.push({
        match_id: matchId,
        game_id: game.id,
        user_id: u.userId,
        scope: "global",
        rating_before: u.ratingBefore,
        rating_after: after,
      });
      globalRating.set(u.userId, after);
      globalPlayed.set(u.userId, (globalPlayed.get(u.userId) ?? 0) + 1);
    }

    if (historyRows.length > 0) {
      const { error: histErr } = await admin.from("rating_history").insert(historyRows);
      if (histErr) throw new Error(histErr.message);
    }
  }

  const groupRows = [...groupRating.entries()].map(([k, rating]) => {
    const [groupId, userId] = k.split(":");
    return {
      group_id: groupId!,
      user_id: userId!,
      rating,
      matches_played: groupPlayed.get(k) ?? 0,
      updated_at: new Date().toISOString(),
    };
  });
  if (groupRows.length > 0) {
    const { error: prErr } = await admin.from("player_ratings").upsert(groupRows, {
      onConflict: "group_id,user_id",
    });
    if (prErr) throw new Error(prErr.message);
  }

  for (const [userId, rating] of globalRating) {
    const { error: pErr } = await admin
      .from("profiles")
      .update({
        global_rating: rating,
        global_matches_played: globalPlayed.get(userId) ?? 0,
      })
      .eq("id", userId);
    if (pErr) throw new Error(pErr.message);
  }

  return { games: ordered.length };
}
