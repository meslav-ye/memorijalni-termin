"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findRecentDuplicate, secondsAgo, DUPLICATE_WINDOW_SECONDS } from "@/lib/domain/duplicates";
import { computeElo, POCETNI_RATING } from "@/lib/domain/elo";
import type { Team } from "@/lib/domain/types";

/**
 * Odgovor akcije. Eksplicitno je oznacen kao unija dviju grana — bez toga
 * TypeScript zakljuci neobavezna polja na obje strane, pa `"greska" in odgovor`
 * ne suzava tip i `odgovor.greska` ispadne `string | undefined`.
 */
export type Odgovor = { ok: true } | { greska: string };

export type OdgovorGola =
  | { ok: true; dogadjajId: string }
  | { mozdaDuplikat: { sekundiPrije: number } }
  | { greska: string };

/** Smije li prijavljeni korisnik uopce dirati ovaj termin. */
async function pristup(terminId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: postava } = await supabase
    .from("match_lineup")
    .select("team")
    .eq("match_id", terminId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Unosi samo tko je u postavi. RLS to provodi i u bazi — ovo je samo
  // da korisnik dobije razumljivu poruku umjesto tihe greske.
  if (!postava) return null;

  return { supabase, user };
}

/**
 * Rezultat na `matches` je samo brza kopija radi ispisa liste termina.
 * Izvor istine su dogadjaji, pa se rezultat uvijek preracunava iz njih.
 */
async function osvjeziRezultat(terminId: string) {
  const supabase = await createClient();

  const { data: dogadjaji } = await supabase
    .from("match_events")
    .select("team")
    .eq("match_id", terminId)
    .is("deleted_at", null)
    .in("type", ["goal", "own_goal"]);

  const a = (dogadjaji ?? []).filter((e) => e.team === "A").length;
  const b = (dogadjaji ?? []).filter((e) => e.team === "B").length;

  await supabase.from("matches").update({ score_a: a, score_b: b }).eq("id", terminId);
}

export async function pokreniTermin(grupaId: string, terminId: string): Promise<Odgovor> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Termin pokreće netko tko je u postavi." };

  const { data: termin } = await kontekst.supabase
    .from("matches")
    .select("status, starts_at")
    .eq("id", terminId)
    .maybeSingle();

  if (!termin) return { greska: "Termin nije pronađen." };
  if (termin.status === "zavrsen") return { greska: "Termin je već završen." };
  if (termin.status === "otkazan") return { greska: "Termin je otkazan." };
  if (termin.status === "u_tijeku") return { ok: true };

  // Najranije 2 sata prije pocetka — da se ne pokrene slucajno danima ranije.
  const dvaSataPrije = new Date(termin.starts_at).getTime() - 2 * 60 * 60 * 1000;
  if (Date.now() < dvaSataPrije) {
    return { greska: "Termin se može pokrenuti najranije 2 sata prije početka." };
  }

  const { error } = await kontekst.supabase
    .from("matches")
    .update({
      status: "u_tijeku",
      started_at: new Date().toISOString(),
      paused_at: null,
      total_paused_seconds: 0,
    })
    .eq("id", terminId);

  if (error) return { greska: "Pokretanje nije uspjelo. Pokušaj ponovno." };

  revalidatePath(`/grupe/${grupaId}/termin/${terminId}`);
  return { ok: true };
}

export async function pauzirajTermin(terminId: string): Promise<Odgovor> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Nemaš pravo." };

  const { error } = await kontekst.supabase
    .from("matches")
    .update({ paused_at: new Date().toISOString() })
    .eq("id", terminId)
    .is("paused_at", null);

  return error ? { greska: "Pauziranje nije uspjelo." } : { ok: true };
}

export async function nastaviTermin(terminId: string): Promise<Odgovor> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Nemaš pravo." };

  const { data: termin } = await kontekst.supabase
    .from("matches")
    .select("paused_at, total_paused_seconds")
    .eq("id", terminId)
    .maybeSingle();

  if (!termin?.paused_at) return { ok: true };

  const trajanjePauze = Math.floor(
    (Date.now() - new Date(termin.paused_at).getTime()) / 1000,
  );

  const { error } = await kontekst.supabase
    .from("matches")
    .update({
      paused_at: null,
      total_paused_seconds: termin.total_paused_seconds + Math.max(0, trajanjePauze),
    })
    .eq("id", terminId);

  return error ? { greska: "Nastavak nije uspio." } : { ok: true };
}

export async function upisiGol(
  terminId: string,
  strijelacId: string,
  ekipa: Team,
  proteklo: number,
  potvrdjenDuplikat = false,
): Promise<OdgovorGola> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Golove unosi netko tko je u postavi." };

  if (!potvrdjenDuplikat) {
    const granica = new Date(Date.now() - DUPLICATE_WINDOW_SECONDS * 1000).toISOString();

    const { data: nedavni } = await kontekst.supabase
      .from("match_events")
      .select("id, type, scorer_id, created_at, deleted_at")
      .eq("match_id", terminId)
      .eq("type", "goal")
      .eq("scorer_id", strijelacId)
      .is("deleted_at", null)
      .gte("created_at", granica);

    const duplikat = findRecentDuplicate(
      (nedavni ?? []).map((e) => ({
        id: e.id,
        type: "goal" as const,
        scorerId: e.scorer_id,
        createdAt: e.created_at,
        deletedAt: e.deleted_at,
      })),
      strijelacId,
      new Date(),
    );

    if (duplikat) {
      return { mozdaDuplikat: { sekundiPrije: secondsAgo(duplikat, new Date()) } };
    }
  }

  // Gol se upisuje ODMAH, bez asistencije. Asistent se dopisuje drugim dodirom.
  // Ako covjek zakljuca mobitel usred unosa, gol je vec u bazi.
  const { data, error } = await kontekst.supabase
    .from("match_events")
    .insert({
      match_id: terminId,
      type: "goal",
      team: ekipa,
      scorer_id: strijelacId,
      assist_id: null,
      elapsed_seconds: proteklo,
      created_by: kontekst.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { greska: "Gol nije upisan. Pokušaj ponovno." };

  await osvjeziRezultat(terminId);
  return { ok: true, dogadjajId: data.id };
}

export async function dodajAsistenciju(
  terminId: string,
  dogadjajId: string,
  asistentId: string | null,
): Promise<Odgovor> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Nemaš pravo." };

  const { error } = await kontekst.supabase
    .from("match_events")
    .update({ assist_id: asistentId })
    .eq("id", dogadjajId);

  return error ? { greska: "Asistencija nije spremljena." } : { ok: true };
}

export async function upisiAutogol(
  terminId: string,
  igracId: string,
  njegovaEkipa: Team,
  proteklo: number,
): Promise<Odgovor> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Nemaš pravo." };

  const { error } = await kontekst.supabase.from("match_events").insert({
    match_id: terminId,
    type: "own_goal",
    // Gol se pripisuje PROTIVNICKOJ ekipi; igracu se biljezi autogol.
    team: njegovaEkipa === "A" ? "B" : "A",
    scorer_id: igracId,
    elapsed_seconds: proteklo,
    created_by: kontekst.user.id,
  });

  if (error) return { greska: "Autogol nije upisan." };

  await osvjeziRezultat(terminId);
  return { ok: true };
}

export async function ponistiDogadjaj(terminId: string, dogadjajId: string): Promise<Odgovor> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Nemaš pravo." };

  // Meko brisanje — zapis ostaje, da se uvijek zna tko je sto unio i povukao.
  const { error } = await kontekst.supabase
    .from("match_events")
    .update({ deleted_at: new Date().toISOString(), deleted_by: kontekst.user.id })
    .eq("id", dogadjajId);

  if (error) return { greska: "Poništavanje nije uspjelo." };

  await osvjeziRezultat(terminId);
  return { ok: true };
}

/**
 * Obracun Elo ratinga za zavrseni termin.
 *
 * Ide preko tajnog kljuca jer player_ratings namjerno nema pravilo za pisanje —
 * nitko iz preglednika ne smije dirati rating, ni svoj ni tudji.
 *
 * Idempotentno je: ako za termin vec postoji zapis u rating_history, znaci da
 * je obracun vec napravljen i drugi poziv ne radi nista. Bez toga bi dva
 * istovremena klika na "Zavrsi" dvaput pomaknula rating.
 */
async function obracunajRating(grupaId: string, terminId: string) {
  const admin = createAdminClient();

  const { data: vecObracunato } = await admin
    .from("rating_history")
    .select("id")
    .eq("match_id", terminId)
    .limit(1);

  if (vecObracunato && vecObracunato.length > 0) return;

  const { data: termin } = await admin
    .from("matches")
    .select("score_a, score_b")
    .eq("id", terminId)
    .maybeSingle();

  const { data: postava } = await admin
    .from("match_lineup")
    .select("user_id, team")
    .eq("match_id", terminId);

  if (!termin || !postava?.length) return;

  const { data: ratinzi } = await admin
    .from("player_ratings")
    .select("user_id, rating")
    .eq("group_id", grupaId)
    .in(
      "user_id",
      postava.map((p) => p.user_id),
    );

  const ekipa = (strana: Team) =>
    postava
      .filter((p) => p.team === strana)
      .map((p) => ({
        userId: p.user_id,
        rating: ratinzi?.find((r) => r.user_id === p.user_id)?.rating ?? POCETNI_RATING,
      }));

  const rezultat = computeElo({
    teamA: ekipa("A"),
    teamB: ekipa("B"),
    scoreA: termin.score_a,
    scoreB: termin.score_b,
  });

  if (rezultat.updates.length === 0) return;

  // Povijest prva: ako upis ratinga zapne na pola, po njoj se zna gdje se stalo.
  await admin.from("rating_history").upsert(
    rezultat.updates.map((u) => ({
      match_id: terminId,
      user_id: u.userId,
      rating_before: u.ratingBefore,
      rating_after: u.ratingAfter,
    })),
    { onConflict: "match_id,user_id" },
  );

  for (const u of rezultat.updates) {
    await admin.rpc("apply_rating", {
      p_group: grupaId,
      p_user: u.userId,
      p_rating: u.ratingAfter,
    });
  }
}

/**
 * Zatvara termin, zaustavlja unos i obracunava rating.
 */
export async function zavrsiTermin(grupaId: string, terminId: string): Promise<Odgovor> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Termin završava netko tko je u postavi." };

  const { data: termin } = await kontekst.supabase
    .from("matches")
    .select("status")
    .eq("id", terminId)
    .maybeSingle();

  if (termin?.status === "zavrsen") return { ok: true };
  if (termin?.status !== "u_tijeku") return { greska: "Termin nije u tijeku." };

  await osvjeziRezultat(terminId);

  const { error } = await kontekst.supabase
    .from("matches")
    .update({ status: "zavrsen", ended_at: new Date().toISOString(), paused_at: null })
    .eq("id", terminId);

  if (error) return { greska: "Završavanje nije uspjelo. Pokušaj ponovno." };

  await obracunajRating(grupaId, terminId);

  revalidatePath(`/grupe/${grupaId}`);
  revalidatePath(`/grupe/${grupaId}/termin/${terminId}`);
  return { ok: true };
}

export async function promijeniGolmana(
  terminId: string,
  igracId: string,
  ekipa: Team,
  proteklo: number,
): Promise<Odgovor> {
  const kontekst = await pristup(terminId);
  if (!kontekst) return { greska: "Nemaš pravo." };

  await kontekst.supabase
    .from("match_lineup")
    .update({ is_goalkeeper: false })
    .eq("match_id", terminId)
    .eq("team", ekipa);

  await kontekst.supabase
    .from("match_lineup")
    .update({ is_goalkeeper: true })
    .eq("match_id", terminId)
    .eq("user_id", igracId);

  // Trag u kronologiji: iz njega se kasnije racuna tko je primio koji gol.
  await kontekst.supabase.from("match_events").insert({
    match_id: terminId,
    type: "keeper_change",
    team: ekipa,
    scorer_id: igracId,
    elapsed_seconds: proteklo,
    created_by: kontekst.user.id,
  });

  return { ok: true };
}
