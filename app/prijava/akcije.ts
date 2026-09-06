"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { baznaAdresa } from "@/lib/adresa";

/** Zajednicki oblik odgovora svake akcije prijave. */
export type StanjePrijave = {
  greska?: string;
  poruka?: string;
};

function ispravanEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function prijavaGoogle(): Promise<StanjePrijave> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await baznaAdresa()}/auth/callback` },
  });

  if (error || !data.url) {
    return { greska: "Prijava Googleom trenutno ne radi. Pokušaj ponovno." };
  }

  // redirect() baca posebnu iznimku koju Next hvata — zato ide IZVAN try/catch
  // i tek nakon sto su svi await-ovi gotovi.
  redirect(data.url);
}

export async function posaljiMagicLink(
  _prethodno: StanjePrijave,
  formData: FormData,
): Promise<StanjePrijave> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) return { greska: "Upiši email adresu." };
  if (!ispravanEmail(email)) return { greska: "To ne izgleda kao ispravna email adresa." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await baznaAdresa()}/auth/callback` },
  });

  if (error) {
    return { greska: "Slanje linka nije uspjelo. Pokušaj za koju minutu." };
  }

  return { poruka: `Poslali smo link na ${email}. Otvori ga na ovom uređaju.` };
}

export async function prijavaLozinkom(
  _prethodno: StanjePrijave,
  formData: FormData,
): Promise<StanjePrijave> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const lozinka = String(formData.get("lozinka") ?? "");

  if (!email || !lozinka) return { greska: "Upiši email i lozinku." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: lozinka,
  });

  // Namjerno ista poruka za nepostojeci email i za krivu lozinku — inace se
  // preko obrasca moze provjeravati tko ima racun.
  if (error) return { greska: "Pogrešan email ili lozinka." };

  redirect("/");
}

export async function registracijaLozinkom(
  _prethodno: StanjePrijave,
  formData: FormData,
): Promise<StanjePrijave> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const lozinka = String(formData.get("lozinka") ?? "");

  if (!ispravanEmail(email)) return { greska: "To ne izgleda kao ispravna email adresa." };
  if (lozinka.length < 8) return { greska: "Lozinka mora imati barem 8 znakova." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: lozinka,
    options: { emailRedirectTo: `${await baznaAdresa()}/auth/callback` },
  });

  if (error) {
    return { greska: "Registracija nije uspjela. Možda već imaš račun s tim emailom?" };
  }

  // Ako je potvrda emailom ukljucena, sesija jos ne postoji.
  if (!data.session) {
    return { poruka: `Poslali smo ti potvrdu na ${email}. Otvori link iz maila.` };
  }

  redirect("/profil");
}
