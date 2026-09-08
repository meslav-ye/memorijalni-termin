"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nicknamesEqual, validateNickname } from "@/lib/domain/nickname";

export type ProfileState = {
  error?: string;
  message?: string;
};

/**
 * Whether someone in one of my groups already uses this nickname.
 *
 * Uniqueness is intentionally per group, not global: once there are many
 * groups, someone in another crowd should not "take" your nickname.
 *
 * Returns the group name where the conflict is, or null.
 */
async function findNicknameConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  myId: string,
  nickname: string,
): Promise<string | null> {
  const { data: myGroups } = await supabase
    .from("group_members")
    .select("group_id, groups(name)")
    .eq("user_id", myId)
    .eq("status", "active");

  if (!myGroups?.length) return null;

  const groupIds = myGroups.map((g) => g.group_id);

  const { data: teammates } = await supabase
    .from("group_members")
    .select("user_id, group_id")
    .in("group_id", groupIds)
    .eq("status", "active")
    .neq("user_id", myId);

  if (!teammates?.length) return null;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", [...new Set(teammates.map((s) => s.user_id))]);

  const conflicting = new Set(
    (profiles ?? [])
      .filter((p) => p.nickname && nicknamesEqual(p.nickname, nickname))
      .map((p) => p.id),
  );

  if (conflicting.size === 0) return null;

  const conflictGroupId = teammates.find((s) => conflicting.has(s.user_id))?.group_id;
  return myGroups.find((g) => g.group_id === conflictGroupId)?.groups?.name ?? "tvojoj grupi";
}

export async function saveProfile(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const check = validateNickname(String(formData.get("nickname") ?? ""));
  if ("error" in check) return { error: check.error };

  const nickname = check.nickname;
  const isGoalkeeper = formData.get("goalkeeper") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nisi prijavljen." };

  const conflict = await findNicknameConflict(supabase, user.id, nickname);
  if (conflict) {
    return {
      error: `Nadimak ${nickname} već koristi netko u grupi ${conflict}. Odaberi drugi — npr. ${nickname.slice(0, 4)}I.`,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nickname, is_goalkeeper: isGoalkeeper })
    .eq("id", user.id);

  if (error) return { error: "Spremanje nije uspjelo. Pokušaj ponovno." };

  revalidatePath("/profil");
  return { message: "Spremljeno." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prijava");
}
