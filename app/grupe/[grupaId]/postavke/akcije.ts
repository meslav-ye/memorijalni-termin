"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function zahtijevajAdmina(grupaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", grupaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.role !== "admin" || data.status !== "active") return null;
  return supabase;
}

export async function spremiPostavke(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const name = String(formData.get("naziv") ?? "").trim();
  const kvota = Number(formData.get("kvota") ?? 10);

  if (name.length < 2 || name.length > 60) return;
  if (!Number.isInteger(kvota) || kvota < 2 || kvota > 30) return;

  const supabase = await zahtijevajAdmina(grupaId);
  if (!supabase) return;

  await supabase
    .from("groups")
    .update({ name, default_capacity: kvota })
    .eq("id", grupaId);

  revalidatePath(`/grupe/${grupaId}`, "layout");
}

/**
 * Novi kod pozivnice. Stari link odmah prestaje raditi — to je i svrha:
 * koristi se kad kod procuri izvan drustva.
 */
export async function obnoviKodPozivnice(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");

  const supabase = await zahtijevajAdmina(grupaId);
  if (!supabase) return;

  const noviKod = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await supabase.from("groups").update({ invite_code: noviKod }).eq("id", grupaId);

  revalidatePath(`/grupe/${grupaId}/postavke`);
}
