import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type GameRow = Database["public"]["Tables"]["games"]["Row"];

type GamesClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Get or create the seq=1 draft game used for lineup editing before the
 * session starts. Does not start the clock.
 */
export async function ensureDraftGame(
  matchId: string,
  client?: GamesClient,
): Promise<GameRow | null> {
  const supabase = client ?? (await createClient());

  const { data: existing } = await supabase
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .eq("seq", 1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("games")
    .insert({ match_id: matchId, seq: 1, status: "u_tijeku" })
    .select("*")
    .single();

  if (error || !created) return null;
  return created;
}

/**
 * Open `u_tijeku` game for the session, or the latest by seq if none is open.
 */
export async function getCurrentGame(
  matchId: string,
  client?: GamesClient,
): Promise<GameRow | null> {
  const supabase = client ?? (await createClient());

  const { data: open } = await supabase
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .eq("status", "u_tijeku")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) return open;

  const { data: latest } = await supabase
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest;
}

/**
 * Game whose lineup may be edited: open game, seq=1 draft before start, or a
 * new draft after the previous game finished (lineup copied from the last one).
 */
export async function ensureEditableGame(
  matchId: string,
  client?: GamesClient,
): Promise<GameRow | null> {
  const supabase = client ?? (await createClient());

  const { data: open } = await supabase
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .eq("status", "u_tijeku")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) return open;

  const { data: match } = await supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || match.status === "zavrsen" || match.status === "otkazan") {
    return null;
  }

  const { data: latest } = await supabase
    .from("games")
    .select("*")
    .eq("match_id", matchId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return ensureDraftGame(matchId, supabase);

  // Between games: draft the next seq with a copied lineup so remixing does
  // not rewrite the finished game's history.
  const { data: next, error } = await supabase
    .from("games")
    .insert({
      match_id: matchId,
      seq: latest.seq + 1,
      status: "u_tijeku",
      team_a_name: latest.team_a_name,
      team_b_name: latest.team_b_name,
    })
    .select("*")
    .single();

  if (error || !next) return null;

  await copyLineup(latest.id, next.id, supabase);
  return next;
}

/** Copy every lineup row from one game into another (same players/teams). */
export async function copyLineup(
  fromGameId: string,
  toGameId: string,
  client?: GamesClient,
): Promise<void> {
  const supabase = client ?? (await createClient());

  const { data: rows } = await supabase
    .from("match_lineup")
    .select("user_id, team, is_goalkeeper, match_id")
    .eq("game_id", fromGameId);

  if (!rows?.length) return;

  await supabase.from("match_lineup").insert(
    rows.map((r) => ({
      game_id: toGameId,
      match_id: r.match_id,
      user_id: r.user_id,
      team: r.team,
      is_goalkeeper: r.is_goalkeeper,
    })),
  );
}
