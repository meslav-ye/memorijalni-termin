/**
 * Koje su metode prijave stvarno ukljucene na Supabase projektu.
 *
 * Postoji jer se lokalni Docker Supabase i onaj u oblaku razlikuju: Google je
 * podesen samo u oblaku. Bez ove provjere lokalno bi se nudio gumb koji ne moze
 * raditi, a korisnik bi zavrsio natrag na prijavi bez ijednog objasnjenja.
 */
export type DostupneMetode = {
  google: boolean;
  email: boolean;
};

export async function dohvatiDostupneMetode(): Promise<DostupneMetode> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kljuc = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !kljuc) return { google: false, email: true };

  try {
    const odgovor = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: kljuc },
      // Postavke se rijetko mijenjaju; ne treba ih dohvacati pri svakom prikazu.
      next: { revalidate: 300 },
    });

    if (!odgovor.ok) return { google: false, email: true };

    const podaci = (await odgovor.json()) as { external?: Record<string, boolean> };

    return {
      google: podaci.external?.google === true,
      email: podaci.external?.email !== false,
    };
  } catch {
    // Ako se ne moze doznati, ne skrivamo email prijavu — ona radi uvijek.
    return { google: false, email: true };
  }
}
