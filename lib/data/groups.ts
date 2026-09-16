import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMember } from "@/lib/data/user";

export type Group = {
  id: string;
  name: string;
  default_capacity: number;
  default_min_players: number;
  invite_code: string;
};

/** Cache tag per group — invalidated when settings or the invite code change. */
export const groupTag = (groupId: string) => `group-${groupId}`;

/**
 * Group row, fetched at most once per request (React `cache`) and shared
 * across members between requests (`unstable_cache`).
 *
 * Access control stays outside the cache: only an active member may read.
 * The cached load uses the service-role key so the entry does not depend
 * on cookies and can be reused for everyone in the group.
 */
export const getGroup = cache(async (groupId: string): Promise<Group | null> => {
  if (!(await isMember(groupId))) return null;
  return cachedGroup(groupId);
});

function cachedGroup(groupId: string) {
  return unstable_cache(
    () => loadGroup(groupId),
    ["group", "v1", groupId],
    { tags: [groupTag(groupId)], revalidate: 3600 },
  )();
}

async function loadGroup(groupId: string): Promise<Group | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, default_capacity, default_min_players, invite_code")
    .eq("id", groupId)
    .maybeSingle();
  return data;
}
