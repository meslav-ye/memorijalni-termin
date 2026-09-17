"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { groupTag } from "@/lib/data/groups";
import { leaderboardTag } from "@/lib/data/leaderboard";
import {
  MT_HOME_COOKIE,
  mtHomeCookieOptions,
  parseMtHomeGroupId,
} from "@/lib/auth/home-cookie";

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
  return supabase;
}

export async function saveSettings(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("naziv") ?? "").trim();
  const capacity = Number(formData.get("kvota") ?? 10);

  if (name.length < 2 || name.length > 60) return;
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 30) return;

  const supabase = await requireAdmin(groupId);
  if (!supabase) return;

  await supabase
    .from("groups")
    .update({ name, default_capacity: capacity })
    .eq("id", groupId);

  updateTag(groupTag(groupId));
  revalidatePath(`/grupe/${groupId}`, "layout");
}

/**
 * Issue a new invite code. The old link stops working immediately — that is
 * the point: use this when a code has leaked outside the group.
 */
export async function refreshInviteCode(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");

  const supabase = await requireAdmin(groupId);
  if (!supabase) return;

  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await supabase.from("groups").update({ invite_code: newCode }).eq("id", groupId);

  updateTag(groupTag(groupId));
  revalidatePath(`/grupe/${groupId}/postavke`);
}

/**
 * Permanently delete the group and everything under it (matches, members,
 * ratings). The SQL function deletes matches first because seasons are
 * ON DELETE RESTRICT from matches.
 */
export async function deleteGroup(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");

  const supabase = await requireAdmin(groupId);
  if (!supabase) return;

  const { error } = await supabase.rpc("delete_group", { p_group: groupId });
  if (error) {
    // RETURNS VOID can surface as an empty PostgREST body. If the row is
    // gone, the delete committed and we continue to redirect.
    const { data: leftover } = await supabase
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .maybeSingle();
    if (leftover) {
      console.error("delete_group", error.code, error.message);
      return;
    }
  }

  const cookieStore = await cookies();
  if (parseMtHomeGroupId(cookieStore.get(MT_HOME_COOKIE)?.value) === groupId) {
    cookieStore.set(MT_HOME_COOKIE, "", { ...mtHomeCookieOptions(), maxAge: 0 });
  }

  updateTag(groupTag(groupId));
  updateTag(leaderboardTag(groupId));
  revalidatePath("/grupe");
  redirect("/grupe", RedirectType.replace);
}
