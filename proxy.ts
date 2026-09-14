import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * In Next 16, `middleware` was renamed to `proxy` — the file must be named
 * proxy.ts and export a `proxy` function.
 *
 * Job: refresh the Supabase session before the page is rendered. Without this
 * an expired token would never renew and users would be signed out at random.
 *
 * On `/` we also resolve the destination here so cold open pays one auth
 * round-trip instead of home → redirect → group (two full navigations).
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname === "/") {
    const dest = await resolveHomeDestination(supabase, user?.id ?? null);
    const redirect = NextResponse.redirect(new URL(dest, request.url));
    // Keep refreshed session cookies on the redirect response.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

async function resolveHomeDestination(
  supabase: ReturnType<typeof createServerClient>,
  userId: string | null,
): Promise<string> {
  if (!userId) return "/prijava";

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("nickname").eq("id", userId).maybeSingle(),
    supabase.from("group_members").select("group_id, status").eq("user_id", userId),
  ]);

  if (!profile?.nickname) return "/profil";

  const active = (memberships ?? []).filter(
    (c: { group_id: string; status: string }) => c.status === "active",
  );
  const pending = (memberships ?? []).filter(
    (c: { group_id: string; status: string }) => c.status === "pending",
  );

  if (active.length === 1 && pending.length === 0) {
    return `/grupe/${active[0].group_id}`;
  }

  return "/grupe";
}

export const config = {
  matcher: [
    // Sve osim statickih datoteka i ikona — one ne trebaju sesiju.
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
