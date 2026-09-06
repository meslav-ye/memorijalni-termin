import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/**
 * Supabase klijent za server komponente i server actione.
 * U Next 16 je `cookies()` asinkron, pa je i ova funkcija asinkrona.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server komponenta ne smije pisati kolacice. To nije greska —
            // osvjezavanje sesije preuzima proxy.ts prije nego se stranica prikaze.
          }
        },
      },
    },
  );
}
