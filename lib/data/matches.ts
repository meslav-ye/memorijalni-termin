import { createClient } from "@/lib/supabase/server";
import { splitSignups } from "@/lib/domain/waitlist";
import { fillStatus, type FillStatus } from "@/lib/domain/fill";
import { ensureUpcomingSeriesOccurrences } from "@/lib/data/series";

export type MatchWithSignups = {
  id: string;
  startsAt: string;
  capacity: number;
  minPlayers: number;
  status: string;
  notes: string | null;
  location: string;
  signedUpCount: number;
  fill: FillStatus;
  iAmIn: boolean;
  iAmWaiting: boolean;
  seriesId: string | null;
};

export type SplitMatches = {
  upcoming: MatchWithSignups[];
  past: MatchWithSignups[];
};

const PAST_LIMIT = 20;

/**
 * Fetches group matches and computes fill status for each.
 *
 * Materialises the next series occurrence when it enters the 6-day window,
 * then loads a bounded set of matches (not the whole history) and signups
 * only for those rows.
 */
export async function getMatches(groupId: string, userId: string): Promise<SplitMatches> {
  await ensureUpcomingSeriesOccurrences(groupId);

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [{ data: upcomingRows }, { data: pastRows }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, starts_at, capacity, min_players, status, notes, location_text, series_id, locations(name)",
      )
      .eq("group_id", groupId)
      .gte("starts_at", nowIso)
      .neq("status", "otkazan")
      .order("starts_at", { ascending: true })
      .limit(10),
    supabase
      .from("matches")
      .select(
        "id, starts_at, capacity, min_players, status, notes, location_text, series_id, locations(name)",
      )
      .eq("group_id", groupId)
      .or(`starts_at.lt.${nowIso},status.eq.otkazan`)
      .order("starts_at", { ascending: false })
      .limit(PAST_LIMIT),
  ]);

  const allMatches = [...(upcomingRows ?? []), ...(pastRows ?? [])];
  if (allMatches.length === 0) return { upcoming: [], past: [] };

  const matchIds = allMatches.map((t) => t.id);
  const { data: signups } = await supabase
    .from("match_signups")
    .select("match_id, user_id, signed_up_at, manual_order, cancelled_at")
    .in("match_id", matchIds);

  const enrich = (t: (typeof allMatches)[number]): MatchWithSignups => {
    const forMatch = (signups ?? [])
      .filter((p) => p.match_id === t.id)
      .map((p) => ({
        userId: p.user_id,
        signedUpAt: p.signed_up_at,
        manualOrder: p.manual_order,
        cancelledAt: p.cancelled_at,
      }));

    const { confirmed, waitlist } = splitSignups(forMatch, t.capacity);

    return {
      id: t.id,
      startsAt: t.starts_at,
      capacity: t.capacity,
      minPlayers: t.min_players,
      status: t.status,
      notes: t.notes,
      location: t.locations?.name ?? t.location_text ?? "Lokacija nije upisana",
      signedUpCount: confirmed.length,
      fill: fillStatus(confirmed.length, t.min_players, t.capacity),
      iAmIn: confirmed.includes(userId),
      iAmWaiting: waitlist.includes(userId),
      seriesId: t.series_id,
    };
  };

  return {
    upcoming: (upcomingRows ?? []).map(enrich),
    past: (pastRows ?? []).map(enrich),
  };
}
