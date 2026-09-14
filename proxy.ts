import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  MT_HOME_COOKIE,
  groupIdFromPathname,
  mtHomeCookieOptions,
  mtHomePath,
  parseMtHomeGroupId,
} from "@/lib/auth/home-cookie";
import { isExpiresAtFresh } from "@/lib/auth/session-fresh";

/**
 * In Next 16, `middleware` was renamed to `proxy` — the file must be named
 * proxy.ts and export a `proxy` function.
 *
 * Job: refresh the Supabase session before the page is rendered. Without this
 * an expired token would never renew and users would be signed out at random.
 * Refresh via getUser only when the session is missing or near expiry;
 * otherwise trust getSession for proxy routing.
 *
 * On `/` we also resolve the destination here so cold open pays one auth
 * round-trip instead of home → redirect → group (two full navigations).
 * Signed-in destinations use rewrite; /prijava and /profil still redirect.
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userId = session?.user?.id ?? null;

  if (!isExpiresAtFresh(session?.expires_at)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  // setAll may recreate `response` during getUser — set mt_home only after auth.
  const pathGroupId = groupIdFromPathname(request.nextUrl.pathname);
  if (userId && pathGroupId) {
    response.cookies.set(
      MT_HOME_COOKIE,
      mtHomePath(pathGroupId),
      mtHomeCookieOptions(),
    );
  }

  if (request.nextUrl.pathname === "/") {
    const { dest, clearMtHome } = await resolveHomeDestination(
      supabase,
      userId,
      request,
    );

    if (dest === "/prijava" || dest === "/profil") {
      const redirect = NextResponse.redirect(new URL(dest, request.url));
      copyCookies(response, redirect);
      if (clearMtHome) clearMtHomeCookie(redirect);
      return redirect;
    }

    const rewrite = NextResponse.rewrite(new URL(dest, request.url));
    copyCookies(response, rewrite);
    if (clearMtHome) clearMtHomeCookie(rewrite);
    if (dest.startsWith("/grupe/")) {
      const gid = parseMtHomeGroupId(dest);
      if (gid) {
        rewrite.cookies.set(MT_HOME_COOKIE, dest, mtHomeCookieOptions());
      }
    }
    return rewrite;
  }

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
}

function clearMtHomeCookie(res: NextResponse) {
  res.cookies.set(MT_HOME_COOKIE, "", { ...mtHomeCookieOptions(), maxAge: 0 });
}

async function resolveHomeDestination(
  supabase: ReturnType<typeof createServerClient>,
  userId: string | null,
  request: NextRequest,
): Promise<{ dest: string; clearMtHome?: boolean }> {
  if (!userId) return { dest: "/prijava" };

  const cookieGroupId = parseMtHomeGroupId(
    request.cookies.get(MT_HOME_COOKIE)?.value,
  );

  if (cookieGroupId) {
    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("nickname").eq("id", userId).maybeSingle(),
      supabase
        .from("group_members")
        .select("status")
        .eq("user_id", userId)
        .eq("group_id", cookieGroupId)
        .maybeSingle(),
    ]);
    if (!profile?.nickname) return { dest: "/profil" };
    if (membership?.status === "active") {
      return { dest: mtHomePath(cookieGroupId) };
    }
    // Stale cookie — fall through to full memberships query and clear.
    const dest = await resolveFromMemberships(supabase, userId, profile.nickname);
    return { dest, clearMtHome: true };
  }

  const dest = await resolveFromMemberships(supabase, userId);
  return { dest };
}

async function resolveFromMemberships(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  knownNickname?: string | null,
): Promise<string> {
  if (knownNickname !== undefined) {
    if (!knownNickname) return "/profil";
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, status")
      .eq("user_id", userId);
    return destFromMemberships(memberships);
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("nickname").eq("id", userId).maybeSingle(),
    supabase.from("group_members").select("group_id, status").eq("user_id", userId),
  ]);

  if (!profile?.nickname) return "/profil";
  return destFromMemberships(memberships);
}

function destFromMemberships(
  memberships:
    | { group_id: string; status: string }[]
    | null
    | undefined,
): string {
  const active = (memberships ?? []).filter((c) => c.status === "active");
  const pending = (memberships ?? []).filter((c) => c.status === "pending");

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
