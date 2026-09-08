import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Signed-in user, fetched AT MOST ONCE per request.
 *
 * Layout and page run in the same request and both need the user, so without
 * this the same /auth/v1/user call happened twice on every group page open.
 *
 * React `cache()` remembers the result only within one request — no sharing
 * across users or across requests.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type Membership = { role: "admin" | "member"; status: string } | null;

/**
 * Membership of the signed-in user in a group, also at most once per request.
 *
 * Same reason: layout checks whether the user is admin (for the Settings tab),
 * and the page asks the same thing for its own needs.
 */
export const getMembership = cache(async (groupId: string): Promise<Membership> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as Membership) ?? null;
});

/** Whether the user is an active member of the group. */
export async function isMember(groupId: string): Promise<boolean> {
  return (await getMembership(groupId))?.status === "active";
}

/** Whether the user is an active admin of the group. */
export async function isAdmin(groupId: string): Promise<boolean> {
  const m = await getMembership(groupId);
  return m?.status === "active" && m.role === "admin";
}
