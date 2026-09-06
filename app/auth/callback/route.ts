import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Odrediste nakon Google prijave, magic linka ili potvrde registracije.
 * Ovdje se jednokratni kod mijenja za sesiju.
 *
 * Razlozi neuspjeha se RAZLIKUJU u odgovoru (parametar `razlog`) — bez toga se
 * svaki kvar cini istim i ne moze se dijagnosticirati.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const oauthGreska = searchParams.get("error");
  const oauthOpis = searchParams.get("error_description");

  function natrag(razlog: string, detalj?: string | null) {
    const url = new URL("/prijava", origin);
    url.searchParams.set("greska", "veza");
    url.searchParams.set("razlog", razlog);
    if (detalj) url.searchParams.set("detalj", detalj.slice(0, 200));
    return NextResponse.redirect(url);
  }

  // 1. Google ili Supabase su odbili prijavu jos prije nego smo dosli do koda.
  if (oauthGreska) {
    console.error("[auth/callback] OAuth greska:", oauthGreska, oauthOpis);
    return natrag(oauthGreska, oauthOpis);
  }

  // 2. Nema koda — netko je dosao izravno na ovu adresu, ili je preusmjeravanje
  //    izgubilo parametre.
  if (!code) {
    console.error("[auth/callback] Nema `code` parametra. Upit:", searchParams.toString());
    return natrag("bez_koda");
  }

  // 3. Kod postoji, ali zamjena za sesiju moze pasti — najcesce zato sto
  //    PKCE kolacic (code verifier) nije stigao natrag uz zahtjev.
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message, error.status);
    return natrag("zamjena", error.message);
  }

  return NextResponse.redirect(new URL("/", origin));
}
