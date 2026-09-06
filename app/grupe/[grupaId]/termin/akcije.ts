"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { godinaTermina, osiguraSezonu } from "@/lib/sezone";
import { zagrebUIso } from "@/lib/format";

export type StanjeTermina = {
  greska?: string;
  poruka?: string;
};

async function clanstvo(grupaId: string) {
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

  if (data?.status !== "active") return null;
  return { supabase, user, admin: data.role === "admin" };
}

export async function kreirajTermin(
  grupaId: string,
  _prethodno: StanjeTermina,
  formData: FormData,
): Promise<StanjeTermina> {
  const datum = String(formData.get("datum") ?? "");
  const satnica = String(formData.get("vrijeme") ?? "");
  const kvota = Number(formData.get("kvota") ?? 12);
  const minIgraca = Number(formData.get("minIgraca") ?? 10);
  const lokacijaId = String(formData.get("lokacija") ?? "").trim();
  const lokacijaTekst = String(formData.get("lokacijaTekst") ?? "").trim();
  const napomena = String(formData.get("napomena") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { greska: "Odaberi datum." };
  if (!/^\d{2}:\d{2}$/.test(satnica)) return { greska: "Odaberi vrijeme." };
  if (!Number.isInteger(kvota) || kvota < 2 || kvota > 30) {
    return { greska: "Najviše mjesta mora biti između 2 i 30." };
  }
  if (!Number.isInteger(minIgraca) || minIgraca < 2 || minIgraca > 30) {
    return { greska: "Najmanje igrača mora biti između 2 i 30." };
  }
  if (minIgraca > kvota) {
    return { greska: "Najmanje igrača ne može biti više od broja mjesta." };
  }
  if (!lokacijaId && !lokacijaTekst) {
    return { greska: "Odaberi lokaciju ili je upiši." };
  }

  const kontekst = await clanstvo(grupaId);
  if (!kontekst) return { greska: "Nemaš pravo otvoriti termin u ovoj grupi." };
  if (!kontekst.admin) return { greska: "Termine otvara admin grupe." };

  // Korisnik upisuje zagrebacko vrijeme; server moze raditi u bilo kojoj zoni.
  const startsAt = zagrebUIso(datum, satnica);

  const sezonaId = await osiguraSezonu(grupaId, godinaTermina(startsAt));
  if (!sezonaId) return { greska: "Sezona nije pripremljena. Pokušaj ponovno." };

  const { data: termin, error } = await kontekst.supabase
    .from("matches")
    .insert({
      group_id: grupaId,
      season_id: sezonaId,
      location_id: lokacijaId || null,
      location_text: lokacijaId ? null : lokacijaTekst,
      starts_at: startsAt,
      capacity: kvota,
      min_players: minIgraca,
      notes: napomena || null,
      created_by: kontekst.user.id,
    })
    .select("id")
    .single();

  if (error || !termin) return { greska: "Termin nije kreiran. Pokušaj ponovno." };

  redirect(`/grupe/${grupaId}/termin/${termin.id}`);
}

export async function prijaviSe(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const terminId = String(formData.get("terminId") ?? "");

  const kontekst = await clanstvo(grupaId);
  if (!kontekst) return;

  const { data: termin } = await kontekst.supabase
    .from("matches")
    .select("status")
    .eq("id", terminId)
    .maybeSingle();

  if (termin?.status !== "najavljen") return;

  // Ponovna prijava nakon odjave ponistava otkazivanje, ali se ide na kraj
  // reda — inace bi odjava i ponovna prijava bila nacin da se preskoci red.
  await kontekst.supabase.from("match_signups").upsert(
    {
      match_id: terminId,
      user_id: kontekst.user.id,
      cancelled_at: null,
      signed_up_at: new Date().toISOString(),
    },
    { onConflict: "match_id,user_id" },
  );

  revalidatePath(`/grupe/${grupaId}/termin/${terminId}`);
  revalidatePath(`/grupe/${grupaId}`);
}

export async function odjaviSe(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const terminId = String(formData.get("terminId") ?? "");

  const kontekst = await clanstvo(grupaId);
  if (!kontekst) return;

  await kontekst.supabase
    .from("match_signups")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("match_id", terminId)
    .eq("user_id", kontekst.user.id);

  revalidatePath(`/grupe/${grupaId}/termin/${terminId}`);
  revalidatePath(`/grupe/${grupaId}`);
}

export async function otkaziTermin(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const terminId = String(formData.get("terminId") ?? "");

  const kontekst = await clanstvo(grupaId);
  if (!kontekst?.admin) return;

  await kontekst.supabase
    .from("matches")
    .update({ status: "otkazan" })
    .eq("id", terminId)
    .in("status", ["najavljen", "zakljucan"]);

  revalidatePath(`/grupe/${grupaId}`);
  revalidatePath(`/grupe/${grupaId}/termin/${terminId}`);
}
