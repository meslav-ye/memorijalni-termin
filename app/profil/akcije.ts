"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StanjeProfila = {
  greska?: string;
  poruka?: string;
};

export async function spremiProfil(
  _prethodno: StanjeProfila,
  formData: FormData,
): Promise<StanjeProfila> {
  const nickname = String(formData.get("nickname") ?? "").trim().toUpperCase();
  const isGoalkeeper = formData.get("golman") === "on";

  if (nickname.length < 2) return { greska: "Nadimak mora imati barem 2 znaka." };
  if (nickname.length > 12) return { greska: "Nadimak smije imati najviše 12 znakova." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { greska: "Nisi prijavljen." };

  const { error } = await supabase
    .from("profiles")
    .update({ nickname, is_goalkeeper: isGoalkeeper })
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
