"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Provjerava da je pozivatelj stvarno admin te grupe.
 *
 * RLS to ionako provodi za group_members, ali ove akcije dodiruju i tablice
 * kroz tajni kljuc — a on zaobilazi sva pravila. Zato se pravo mora provjeriti
 * i ovdje, prije nego se tajni kljuc uopce upotrijebi.
 */
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
  return { supabase, user };
}

export async function odobriClana(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const korisnikId = String(formData.get("korisnikId") ?? "");

  const kontekst = await zahtijevajAdmina(grupaId);
  if (!kontekst) return;

  const { error } = await kontekst.supabase
    .from("group_members")
    .update({ status: "active", joined_at: new Date().toISOString() })
    .eq("group_id", grupaId)
    .eq("user_id", korisnikId)
    .eq("status", "pending");

  if (error) return;

  // Rating se upisuje tajnim kljucem — player_ratings nema insert pravilo.
  await createAdminClient()
    .from("player_ratings")
    .upsert(
      { group_id: grupaId, user_id: korisnikId },
      { onConflict: "group_id,user_id", ignoreDuplicates: true },
    );

  revalidatePath(`/grupe/${grupaId}/clanovi`);
}

export async function odbijClana(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const korisnikId = String(formData.get("korisnikId") ?? "");

  const kontekst = await zahtijevajAdmina(grupaId);
  if (!kontekst) return;

  await kontekst.supabase
    .from("group_members")
    .delete()
    .eq("group_id", grupaId)
    .eq("user_id", korisnikId)
    .eq("status", "pending");

  revalidatePath(`/grupe/${grupaId}/clanovi`);
}

export async function izbaciClana(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const korisnikId = String(formData.get("korisnikId") ?? "");

  const kontekst = await zahtijevajAdmina(grupaId);
  if (!kontekst) return;

  // Admin ne smije izbaciti sam sebe — grupa bi mogla ostati bez ijednog admina.
  if (korisnikId === kontekst.user.id) return;

  await kontekst.supabase
    .from("group_members")
    .update({ status: "removed" })
    .eq("group_id", grupaId)
    .eq("user_id", korisnikId);

  revalidatePath(`/grupe/${grupaId}/clanovi`);
}

export async function promijeniUlogu(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const korisnikId = String(formData.get("korisnikId") ?? "");
  const novaUloga = String(formData.get("uloga") ?? "");

  if (novaUloga !== "admin" && novaUloga !== "member") return;

  const kontekst = await zahtijevajAdmina(grupaId);
  if (!kontekst) return;

  // Skidanje zadnjeg admina ostavlja grupu bez ikoga tko moze odobriti clana.
  if (novaUloga === "member") {
    const { count } = await kontekst.supabase
      .from("group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", grupaId)
      .eq("role", "admin")
      .eq("status", "active");

    if ((count ?? 0) <= 1) return;
  }

  await kontekst.supabase
    .from("group_members")
    .update({ role: novaUloga })
    .eq("group_id", grupaId)
    .eq("user_id", korisnikId);

  revalidatePath(`/grupe/${grupaId}/clanovi`);
}
