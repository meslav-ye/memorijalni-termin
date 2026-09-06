"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type StanjeGrupe = {
  greska?: string;
  poruka?: string;
};

/** Sezona je kalendarska godina. Stvara se lijeno, kad prvi put zatreba. */
async function osiguraiSezonu(grupaId: string, godina: number) {
  const admin = createAdminClient();

  const { data: postojeca } = await admin
    .from("seasons")
    .select("id")
    .eq("group_id", grupaId)
    .eq("name", String(godina))
    .maybeSingle();

  if (postojeca) return postojeca.id;

  const { data: nova } = await admin
    .from("seasons")
    .insert({
      group_id: grupaId,
      name: String(godina),
      starts_on: `${godina}-01-01`,
      ends_on: `${godina}-12-31`,
    })
    .select("id")
    .single();

  return nova?.id ?? null;
}

export async function kreirajGrupu(
  _prethodno: StanjeGrupe,
  formData: FormData,
): Promise<StanjeGrupe> {
  const name = String(formData.get("naziv") ?? "").trim();
  const kvota = Number(formData.get("kvota") ?? 10);

  if (name.length < 2) return { greska: "Naziv grupe mora imati barem 2 znaka." };
  if (name.length > 60) return { greska: "Naziv grupe je predugačak." };
  if (!Number.isInteger(kvota) || kvota < 2 || kvota > 30) {
    return { greska: "Broj igrača po terminu mora biti između 2 i 30." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { greska: "Nisi prijavljen." };

  const { data: grupa, error } = await supabase
    .from("groups")
    .insert({ name, default_capacity: kvota, created_by: user.id })
    .select("id")
    .single();

  if (error || !grupa) {
    return { greska: "Grupa nije kreirana. Pokušaj ponovno." };
  }

  // Osnivac odmah postaje aktivni admin — inace nema tko odobriti prvi zahtjev.
  // Prolazi kroz pravilo "clanstvo: osnivac se upisuje kao admin".
  const { error: greskaClanstva } = await supabase.from("group_members").insert({
    group_id: grupa.id,
    user_id: user.id,
    role: "admin",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (greskaClanstva) {
    // Grupa bez ijednog admina je neupotrebljiva — bolje je pocistiti.
    await createAdminClient().from("groups").delete().eq("id", grupa.id);
    return { greska: "Grupa nije kreirana. Pokušaj ponovno." };
  }

  const admin = createAdminClient();
  await admin
    .from("player_ratings")
    .insert({ group_id: grupa.id, user_id: user.id });

  await osiguraiSezonu(grupa.id, new Date().getFullYear());

  redirect(`/grupe/${grupa.id}`);
}

/**
 * Prvi argument se veze preko `.bind(null, kod)` u komponenti, pa preostala
 * dva odgovaraju potpisu koji useActionState ocekuje: (stanje, formData).
 */
export async function posaljiZahtjev(
  invite_code: string,
  _prethodno: StanjeGrupe,
  _formData: FormData,
): Promise<StanjeGrupe> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/prijava?povratak=/grupe/pridruzi/${invite_code}`);

  // Kod trazimo preko tajnog kljuca: RLS ne dopusta citanje grupe onome
  // tko jos nije clan, a bez toga se ne bi mogao ni prijaviti.
  const admin = createAdminClient();
  const { data: grupa } = await admin
    .from("groups")
    .select("id")
    .eq("invite_code", invite_code)
    .maybeSingle();

  if (!grupa) return { greska: "Pozivnica nije važeća." };

  const { data: postojece } = await admin
    .from("group_members")
    .select("status")
    .eq("group_id", grupa.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (postojece?.status === "active") redirect(`/grupe/${grupa.id}`);
  if (postojece?.status === "pending") {
    return { poruka: "Zahtjev je već poslan. Čeka se odobrenje admina." };
  }

  const { error } = await supabase.from("group_members").insert({
    group_id: grupa.id,
    user_id: user.id,
    role: "member",
    status: "pending",
  });

  if (error) return { greska: "Slanje zahtjeva nije uspjelo. Pokušaj ponovno." };

  revalidatePath("/grupe");
  return { poruka: "Zahtjev je poslan. Javit ćemo se kad te admin odobri." };
}
