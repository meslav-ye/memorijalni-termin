import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Klijent s tajnim kljucem — ZAOBILAZI SVA RLS PRAVILA.
 *
 * Koristi se ISKLJUCIVO u server actionima, i to samo ondje gdje obicni korisnik
 * po pravilima ne smije pisati: odobravanje clanova i upis ratinga.
 * Nikad ga ne uvoziti u komponentu koja ide pregledniku.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY nije postavljen. Provjeri .env.local (lokalno) ili varijable okoline na Vercelu.",
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
