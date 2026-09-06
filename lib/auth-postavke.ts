/**
 * Koje su metode prijave stvarno ukljucene na Supabase projektu.
 *
 * Postoji samo zato da lokalni razvoj ne nudi gumb koji ne moze raditi:
 * Google je podesen u oblaku, a lokalni Docker Supabase o njemu ne zna nista.
 *
 * VAZNO — u neizvjesnosti se gumb PRIKAZUJE, ne skriva.
 * Prva verzija ove funkcije radila je obrnuto i sakrila Google na produkciji
 * cim dohvat postavki nije uspio, cime je prijava postala nemoguca. Kriva
 * strana opreza: neuspjela prijava barem javi gresku, a gumb kojeg nema
 * ne moze se ni pokusati.
 */
export type DostupneMetode = {
  google: boolean;
};

export async function dohvatiDostupneMetode(): Promise<DostupneMetode> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kljuc = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Ne znamo — prikazi.
  if (!url || !kljuc) return { google: true };

  try {
    const odgovor = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: kljuc },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!odgovor.ok) return { google: true };

    const podaci = (await odgovor.json()) as { external?: Record<string, boolean> };

    // Skrivamo ISKLJUCIVO kad je Supabase izricito rekao da je iskljucen.
    return { google: podaci.external?.google !== false };
  } catch {
    return { google: true };
  }
}
