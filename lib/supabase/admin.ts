import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Client with the service-role key — BYPASSES ALL RLS RULES.
 *
 * Used EXCLUSIVELY in server actions, and only where a regular user is not
 * allowed to write under the rules: approving members and writing ratings.
 * Never import it into a component that goes to the browser.
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
