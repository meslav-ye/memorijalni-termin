import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Prijavljeni korisnik, dohvacen NAJVISE JEDNOM po zahtjevu.
 *
 * Layout i stranica se izvrsavaju u istom zahtjevu i oboje trebaju korisnika,
 * pa se bez ovoga isto pitalo dvaput. Mjerenje je pokazalo 2 poziva na
 * /auth/v1/user po otvaranju svake stranice grupe.
 *
 * `cache()` iz Reacta pamti rezultat samo unutar jednog zahtjeva — nema
 * dijeljenja izmedju korisnika ni izmedju zahtjeva.
 */
export const dohvatiKorisnika = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type Clanstvo = { role: "admin" | "member"; status: string } | null;

/**
 * Clanstvo prijavljenog korisnika u grupi, takodjer najvise jednom po zahtjevu.
 *
 * Isti razlog: layout provjerava je li korisnik admin (za tab Postavke), a
 * stranica isto to pita za svoje potrebe.
 */
export const dohvatiClanstvo = cache(async (grupaId: string): Promise<Clanstvo> => {
  const korisnik = await dohvatiKorisnika();
  if (!korisnik) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", grupaId)
    .eq("user_id", korisnik.id)
    .maybeSingle();

  return (data as Clanstvo) ?? null;
});

/** Je li korisnik aktivan clan grupe. */
export async function jeClan(grupaId: string): Promise<boolean> {
  return (await dohvatiClanstvo(grupaId))?.status === "active";
}

/** Je li korisnik aktivan admin grupe. */
export async function jeAdmin(grupaId: string): Promise<boolean> {
  const c = await dohvatiClanstvo(grupaId);
  return c?.status === "active" && c.role === "admin";
}
