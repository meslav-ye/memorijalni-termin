import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSeason, matchYear } from "@/lib/seasons";
import {
  isWithinVisibilityWindow,
  nextWeeklyStartsAt,
} from "@/lib/domain/recurring";

/**
 * Lazily creates the next occurrence for each active series in the group
 * when it falls inside the 6-day visibility window.
 *
 * Uses the service role so any member opening Termini can materialise the
 * row (signups need the FK). Unique (series_id, starts_at) + ignore
 * duplicates makes concurrent opens safe.
 */
export async function ensureUpcomingSeriesOccurrences(groupId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date();

  const { data: seriesList } = await admin
    .from("match_series")
    .select(
      "id, weekday, time_local, location_id, location_text, capacity, min_players, notes, created_by, paused_at",
    )
    .eq("group_id", groupId)
    .is("paused_at", null);

  if (!seriesList?.length) return;

  for (const series of seriesList) {
    const { data: latest } = await admin
      .from("matches")
      .select("starts_at")
      .eq("series_id", series.id)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) continue;

    const nextStartsAt = nextWeeklyStartsAt(
      series.weekday,
      series.time_local,
      new Date(latest.starts_at),
    );

    if (!isWithinVisibilityWindow(nextStartsAt, now)) continue;

    const seasonId = await ensureSeason(groupId, matchYear(nextStartsAt));
    if (!seasonId) continue;

    const { error } = await admin.from("matches").insert({
      group_id: groupId,
      season_id: seasonId,
      series_id: series.id,
      location_id: series.location_id,
      location_text: series.location_id ? null : series.location_text,
      starts_at: nextStartsAt,
      capacity: series.capacity,
      min_players: series.min_players,
      notes: series.notes,
      created_by: series.created_by,
    });

    // Unique (series_id, starts_at) — concurrent opens are fine.
    if (error && error.code !== "23505") {
      console.error("ensureUpcomingSeriesOccurrences", error.message);
    }
  }
}
