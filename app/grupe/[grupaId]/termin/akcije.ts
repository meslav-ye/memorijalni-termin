"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { godinaTermina, osiguraSezonu } from "@/lib/sezone";
import { zagrebUIso } from "@/lib/format";
import { splitSignups } from "@/lib/domain/waitlist";
import { suggestTeams } from "@/lib/domain/teams";

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

/**
 * Slaze prijedlog ekipa i sprema ga kao postavu.
 *
 * Postojeca postava se brise i pise ispocetka — gumb je zamisljen kao
 * "promijesaj ponovno", pa svaki poziv daje cist prijedlog.
 */
export async function predloziEkipe(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const terminId = String(formData.get("terminId") ?? "");

  const kontekst = await clanstvo(grupaId);
  if (!kontekst) return;

  const { supabase } = kontekst;

  const { data: termin } = await supabase
    .from("matches")
    .select("capacity, status")
    .eq("id", terminId)
    .maybeSingle();

  // Nakon pokretanja termina postava se vise ne premjesa.
  if (!termin || termin.status === "zavrsen" || termin.status === "otkazan") return;

  const { data: prijave } = await supabase
    .from("match_signups")
    .select("user_id, signed_up_at, manual_order, cancelled_at")
    .eq("match_id", terminId);

  const { confirmed } = splitSignups(
    (prijave ?? []).map((p) => ({
      userId: p.user_id,
      signedUpAt: p.signed_up_at,
      manualOrder: p.manual_order,
      cancelledAt: p.cancelled_at,
    })),
    termin.capacity,
  );

  if (confirmed.length === 0) return;

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, is_goalkeeper")
    .in("id", confirmed);

  const { data: ratinzi } = await supabase
    .from("player_ratings")
    .select("user_id, rating")
    .eq("group_id", grupaId)
    .in("user_id", confirmed);

  const igraci = confirmed.map((userId) => ({
    userId,
    rating: ratinzi?.find((r) => r.user_id === userId)?.rating ?? 1000,
    isGoalkeeper: profili?.find((p) => p.id === userId)?.is_goalkeeper ?? false,
  }));

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("group_id", grupaId)
    .eq("status", "zavrsen");

  const { teamA, teamB } = suggestTeams(igraci, count ?? 0);

  await supabase.from("match_lineup").delete().eq("match_id", terminId);
  await supabase.from("match_lineup").insert([
    ...teamA.map((p, i) => ({
      match_id: terminId,
      user_id: p.userId,
      team: "A" as const,
      // Golman je onaj koji je i u prijedlogu bio golman, i to samo prvi.
      is_goalkeeper: i === 0 && p.isGoalkeeper,
    })),
    ...teamB.map((p, i) => ({
      match_id: terminId,
      user_id: p.userId,
      team: "B" as const,
      is_goalkeeper: i === 0 && p.isGoalkeeper,
    })),
  ]);

  revalidatePath(`/grupe/${grupaId}/termin/${terminId}/ekipe`);
}

export async function premjestiIgraca(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const terminId = String(formData.get("terminId") ?? "");
  const korisnikId = String(formData.get("korisnikId") ?? "");
  const ekipa = String(formData.get("ekipa") ?? "");

  if (ekipa !== "A" && ekipa !== "B") return;

  const kontekst = await clanstvo(grupaId);
  if (!kontekst) return;

  // Igrac koji mijenja ekipu vise nije golman te ekipe.
  await kontekst.supabase
    .from("match_lineup")
    .update({ team: ekipa, is_goalkeeper: false })
    .eq("match_id", terminId)
    .eq("user_id", korisnikId);

  revalidatePath(`/grupe/${grupaId}/termin/${terminId}/ekipe`);
}

export async function postaviGolmana(formData: FormData) {
  const grupaId = String(formData.get("grupaId") ?? "");
  const terminId = String(formData.get("terminId") ?? "");
  const korisnikId = String(formData.get("korisnikId") ?? "");
  const ekipa = String(formData.get("ekipa") ?? "");

  if (ekipa !== "A" && ekipa !== "B") return;

  const kontekst = await clanstvo(grupaId);
  if (!kontekst) return;

  const { data: trenutni } = await kontekst.supabase
    .from("match_lineup")
    .select("is_goalkeeper")
    .eq("match_id", terminId)
    .eq("user_id", korisnikId)
    .maybeSingle();

  // Ponovni klik na istog golmana skida oznaku.
  const postaje = !trenutni?.is_goalkeeper;

  // U svakoj ekipi je najvise jedan oznaceni golman.
  await kontekst.supabase
    .from("match_lineup")
    .update({ is_goalkeeper: false })
    .eq("match_id", terminId)
    .eq("team", ekipa);

  if (postaje) {
    await kontekst.supabase
      .from("match_lineup")
      .update({ is_goalkeeper: true })
      .eq("match_id", terminId)
      .eq("user_id", korisnikId);
  }

  revalidatePath(`/grupe/${grupaId}/termin/${terminId}/ekipe`);
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
