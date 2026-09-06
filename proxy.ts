import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * U Next 16 je `middleware` preimenovan u `proxy` — datoteka se mora zvati
 * proxy.ts i izvoziti funkciju `proxy`.
 *
 * Zadaca: osvjeziti Supabase sesiju prije nego se stranica prikaze. Bez ovoga
 * istekli token nikad ne bi bio obnovljen i korisnika bi nasumicno izbacivalo.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ovaj poziv je razlog postojanja cijele datoteke: on obnavlja token.
  // Mora ostati getUser(), ne getSession() — getUser provjerava token kod
  // Supabasea, dok getSession samo vjeruje kolacicu.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Sve osim statickih datoteka i ikona — one ne trebaju sesiju.
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
