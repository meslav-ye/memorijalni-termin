"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nicknamesEqual, validateNickname } from "@/lib/domain/nickname";

export type StanjeProfila = {
  greska?: string;
  poruka?: string;
};

/**
 * Koristi li nadimak vec netko u nekoj od mojih grupa.
 *
 * Jedinstvenost se namjerno trazi PO GRUPI, ne globalno: kad jednom bude vise
 * grupa, nema smisla da ti netko iz tudjeg drustva "zauzme" nadimak.
 *
 * Vraca naziv grupe u kojoj je sudar, ili null.
 */
async function nadjiSudarNadimka(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mojId: string,
  nadimak: string,
): Promise<string | null> {
  const { data: mojeGrupe } = await supabase
    .from("group_members")
    .select("group_id, groups(name)")
    .eq("user_id", mojId)
    .eq("status", "active");

  if (!mojeGrupe?.length) return null;

  const grupaIdevi = mojeGrupe.map((g) => g.group_id);

  const { data: suigraci } = await supabase
    .from("group_members")
    .select("user_id, group_id")
    .in("group_id", grupaIdevi)
    .eq("status", "active")
    .neq("user_id", mojId);

  if (!suigraci?.length) return null;

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", [...new Set(suigraci.map((s) => s.user_id))]);

  const sudareni = new Set(
    (profili ?? [])
      .filter((p) => p.nickname && nicknamesEqual(p.nickname, nadimak))
      .map((p) => p.id),
  );

  if (sudareni.size === 0) return null;

  const grupaSaSudarom = suigraci.find((s) => sudareni.has(s.user_id))?.group_id;
  return mojeGrupe.find((g) => g.group_id === grupaSaSudarom)?.groups?.name ?? "tvojoj grupi";
}

export async function spremiProfil(
  _prethodno: StanjeProfila,
  formData: FormData,
): Promise<StanjeProfila> {
  const provjera = validateNickname(String(formData.get("nickname") ?? ""));
  if ("error" in provjera) return { greska: provjera.error };

  const nadimak = provjera.nickname;
  const isGoalkeeper = formData.get("golman") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { greska: "Nisi prijavljen." };

  const sudar = await nadjiSudarNadimka(supabase, user.id, nadimak);
  if (sudar) {
    return {
      greska: `Nadimak ${nadimak} već koristi netko u grupi ${sudar}. Odaberi drugi — npr. ${nadimak.slice(0, 4)}I.`,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nickname: nadimak, is_goalkeeper: isGoalkeeper })
    .eq("id", user.id);

  if (error) return { greska: "Spremanje nije uspjelo. Pokušaj ponovno." };

  revalidatePath("/profil");
  return { poruka: "Spremljeno." };
}

export async function odjava() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prijava");
}
