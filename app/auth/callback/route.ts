import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destination after Google sign-in, magic link, or registration confirmation.
 * Here the one-time code is exchanged for a session.
 *
 * Failure reasons DIFFER in the response (the `razlog` param) — without that
 * every failure looks the same and cannot be diagnosed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthDescription = searchParams.get("error_description");

  function backToLogin(reason: string, detail?: string | null) {
    const url = new URL("/prijava", origin);
    url.searchParams.set("error", "link");
    url.searchParams.set("reason", reason);
    if (detail) url.searchParams.set("detail", detail.slice(0, 200));
    return NextResponse.redirect(url);
  }

  // 1. Google or Supabase rejected the sign-in before we got a code.
  if (oauthError) {
    console.error("[auth/callback] OAuth error:", oauthError, oauthDescription);
    return backToLogin(oauthError, oauthDescription);
  }

  // 2. No code — someone hit this URL directly, or the redirect lost params.
  if (!code) {
    console.error("[auth/callback] Missing `code` param. Query:", searchParams.toString());
    return backToLogin("no_code");
  }

  // 3. Code exists, but session exchange can fail — most often because the
  //    PKCE cookie (code verifier) did not come back with the request.
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message, error.status);
    return backToLogin("exchange", error.message);
  }

  return NextResponse.redirect(new URL("/", origin));
}
