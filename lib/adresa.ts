import { headers } from "next/headers";

/**
 * Javna adresa aplikacije, iz zaglavlja zahtjeva.
 *
 * Ne smije se zakucati: ista aplikacija radi na localhostu, na Vercelovim
 * preview adresama i na produkciji. Iza posrednika (Vercel) izvorni protokol
 * stize u x-forwarded-proto, pa se `origin` ne moze uvijek dobiti izravno.
 */
export async function baznaAdresa(): Promise<string> {
  const h = await headers();

  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("host") ?? "localhost:3000";
  const protokol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return `${protokol}://${host}`;
}
