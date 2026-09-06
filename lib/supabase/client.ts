import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Supabase klijent za kod koji se izvrsava u pregledniku.
 * Koristi javni kljuc — sto smije vidjeti odredjuje RLS, ne tajnost kljuca.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
