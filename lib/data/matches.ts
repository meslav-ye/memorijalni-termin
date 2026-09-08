import { createClient } from "@/lib/supabase/server";
import { splitSignups } from "@/lib/domain/waitlist";
import { fillStatus, type FillStatus } from "@/lib/domain/fill";

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
};

export type SplitMatches = {
  upcoming: MatchWithSignups[];
  past: MatchWithSignups[];
};

/**
 * Fetches group matches and computes fill status for each.
 *
 * Intentionally lives OUTSIDE the component: it reads the current time, and
 * reading the clock inside a render function can change between two renders.
 * Here it is called once per request and returns ready data.
 */
export async function getMatches(groupId: string, userId: string): Promise<SplitMatches> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, starts_at, capacity, min_players, status, notes, location_text, locations(name)",
    )
    .eq("group_id", groupId)
    .order("starts_at", { ascending: false });

  const allMatches = matches ?? [];
  if (allMatches.length === 0) return { upcoming: [], past: [] };

  const { data: signups } = await supabase
    .from("match_signups")
    .select("match_id, user_id, signed_up_at, manual_order, cancelled_at")
    .in(
      "match_id",
      allMatches.map((t) => t.id),
    );

  const now = Date.now();

  const enriched: MatchWithSignups[] = allMatches.map((t) => {
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
    };
  });

  return {
    upcoming: enriched
      .filter((t) => new Date(t.startsAt).getTime() >= now && t.status !== "otkazan")
      .reverse(),
    past: enriched.filter(
      (t) => new Date(t.startsAt).getTime() < now || t.status === "otkazan",
    ),
  };
}
