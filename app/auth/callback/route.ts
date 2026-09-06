import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Odrediste na koje se korisnik vraca nakon Google prijave, magic linka
 * ili potvrde registracije. Ovdje se jednokratni kod mijenja za sesiju.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Korijen sam odlucuje ide li korisnik na profil ili na svoje grupe.
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/prijava?greska=veza`);
}
