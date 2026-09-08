"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const groupId = String(formData.get("grupaId") ?? "");
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

  revalidatePath(`/grupe/${groupId}`, "layout");
}

/**
 * Issue a new invite code. The old link stops working immediately — that is
 * the point: use this when a code has leaked outside the group.
 */
export async function refreshInviteCode(formData: FormData) {
  const groupId = String(formData.get("grupaId") ?? "");

  const supabase = await requireAdmin(groupId);
  if (!supabase) return;

  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await supabase.from("groups").update({ invite_code: newCode }).eq("id", groupId);

  revalidatePath(`/grupe/${groupId}/postavke`);
}
