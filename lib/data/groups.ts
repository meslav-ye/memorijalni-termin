import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Group = {
  id: string;
  name: string;
  default_capacity: number;
  default_min_players: number;
  invite_code: string;
};

/**
 * Group row, fetched at most once per request.
 *
 * The group layout needs the name for the header; Termini, Postavke and
 * Novi termin ask for the same row (or a subset). Without `cache()` that
 * is a second round-trip on every nested page.
 *
 * Uses the user client so RLS still hides groups you are not in.
 */
export const getGroup = cache(async (groupId: string): Promise<Group | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, default_capacity, default_min_players, invite_code")
    .eq("id", groupId)
    .maybeSingle();
  return data;
});
