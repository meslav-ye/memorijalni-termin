import { updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { leaderboardTag } from "@/lib/data/leaderboard";

/**
 * Returns the season id for the given year, creating it if missing.
 *
 * A season is a calendar year and is created lazily — when the first match
 * in that year is opened. Goes through the secret key because RLS only
 * allows admins to write seasons, while a non-admin may open a match.
 */
export async function ensureSeason(groupId: string, year: number): Promise<string | null> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("seasons")
    .select("id")
    .eq("group_id", groupId)
    .eq("name", String(year))
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await admin
    .from("seasons")
    .insert({
      group_id: groupId,
      name: String(year),
      starts_on: `${year}-01-01`,
      ends_on: `${year}-12-31`,
    })
    .select("id")
    .single();

  if (created) {
    try {
      updateTag(leaderboardTag(groupId));
    } catch {
      // updateTag is a Server Action API. Series materialisation runs in
      // after() during RSC — TTL (5 min) covers that rare new-year case.
    }
  }

  return created?.id ?? null;
}

/** Calendar year the match belongs to, in Zagreb time. */
export function matchYear(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zagreb",
      year: "numeric",
    }).format(new Date(iso)),
  );
}
