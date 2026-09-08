"use server";

import { revalidatePath, updateTag } from "next/cache";
import { leaderboardTag } from "@/lib/data/leaderboard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ensures the caller is actually an admin of this group.
 *
 * RLS already enforces this for group_members, but these actions also touch
 * tables through the service role — which bypasses every rule. So the
 * permission check must happen here before the service role is used at all.
 */
async function requireAdmin(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.role !== "admin" || data.status !== "active") return null;
  return { supabase, user };
}

export async function approveMember(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const ctx = await requireAdmin(groupId);
  if (!ctx) return;

  const { error } = await ctx.supabase
    .from("group_members")
    .update({ status: "active", joined_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) return;

  // Rating is written with the service role — player_ratings has no insert policy.
  await createAdminClient()
    .from("player_ratings")
    .upsert(
      { group_id: groupId, user_id: userId },
      { onConflict: "group_id,user_id", ignoreDuplicates: true },
    );

  revalidatePath(`/grupe/${groupId}/clanovi`);
  updateTag(leaderboardTag(groupId));
}

export async function rejectMember(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const ctx = await requireAdmin(groupId);
  if (!ctx) return;

  await ctx.supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .eq("status", "pending");

  revalidatePath(`/grupe/${groupId}/clanovi`);
  updateTag(leaderboardTag(groupId));
}

export async function removeMember(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const ctx = await requireAdmin(groupId);
  if (!ctx) return;

  // An admin must not remove themselves — the group could be left with no admin.
  if (userId === ctx.user.id) return;

  await ctx.supabase
    .from("group_members")
    .update({ status: "removed" })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  revalidatePath(`/grupe/${groupId}/clanovi`);
  updateTag(leaderboardTag(groupId));
}

export async function changeRole(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("role") ?? "");

  if (newRole !== "admin" && newRole !== "member") return;

  const ctx = await requireAdmin(groupId);
  if (!ctx) return;

  // Demoting the last admin leaves nobody who can approve members.
  if (newRole === "member") {
    const { count } = await ctx.supabase
      .from("group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("role", "admin")
      .eq("status", "active");

    if ((count ?? 0) <= 1) return;
  }

  await ctx.supabase
    .from("group_members")
    .update({ role: newRole })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  revalidatePath(`/grupe/${groupId}/clanovi`);
  updateTag(leaderboardTag(groupId));
}
