import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * In Next 16, `middleware` was renamed to `proxy` — the file must be named
 * proxy.ts and export a `proxy` function.
 *
 * Job: refresh the Supabase session before the page is rendered. Without this
 * an expired token would never renew and users would be signed out at random.
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
