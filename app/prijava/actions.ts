"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/origin";

/** Shared shape returned by every login action. */
export type LoginState = {
  error?: string;
  message?: string;
};

/**
 * Tell the user WHAT happened, instead of a generic "try later".
 *
 * This exists because "try in a minute" was harmful: when the email send
 * quota is exhausted, waiting does not help and people keep retrying in a
 * loop. Better to steer them to Google or password sign-in.
 */
function emailErrorMessage(code: string | undefined): string {
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return (
      "Potrošena je kvota za slanje mailova (ograničenje besplatnog plana). " +
      "Prijavi se Googleom ili lozinkom — to ne ovisi o mailu."
    );
  }
  if (code === "email_address_invalid") {
    return "Ta email adresa nije prihvaćena. Provjeri je li točno upisana.";
  }
  return "Slanje linka nije uspjelo. Prijavi se Googleom ili lozinkom.";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signInWithGoogle(): Promise<LoginState> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await getAppOrigin()}/auth/callback` },
  });

  if (error || !data.url) {
    return { error: "Prijava Googleom trenutno ne radi. Pokušaj ponovno." };
  }

  // redirect() throws a special exception Next catches — so it must stay
  // outside try/catch and only run after every await has finished.
  redirect(data.url);
}

export async function sendMagicLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) return { error: "Upiši email adresu." };
  if (!isValidEmail(email)) return { error: "To ne izgleda kao ispravna email adresa." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await getAppOrigin()}/auth/callback` },
  });

  if (error) {
    console.error("[prijava] signInWithOtp:", error.code, error.message);
    return { error: emailErrorMessage(error.code) };
  }

  return { message: `Poslali smo link na ${email}. Otvori ga na ovom uređaju.` };
}

export async function signInWithPassword(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("lozinka") ?? "");

  if (!email || !password) return { error: "Upiši email i lozinku." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Same message for unknown email and wrong password on purpose — otherwise
  // the form can be used to probe who has an account.
  if (error) return { error: "Pogrešan email ili lozinka." };

  redirect("/");
}

export async function signUpWithPassword(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("lozinka") ?? "");

  if (!isValidEmail(email)) return { error: "To ne izgleda kao ispravna email adresa." };
  if (password.length < 8) return { error: "Lozinka mora imati barem 8 znakova." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await getAppOrigin()}/auth/callback` },
  });

  if (error) {
    console.error("[prijava] signUp:", error.code, error.message);

    if (error.code === "over_email_send_rate_limit") {
      return { error: emailErrorMessage(error.code) };
    }
    return { error: "Registracija nije uspjela. Možda već imaš račun s tim emailom?" };
  }

  // If email confirmation is enabled, there is no session yet.
  if (!data.session) {
    return { message: `Poslali smo ti potvrdu na ${email}. Otvori link iz maila.` };
  }

  redirect("/profil");
}
