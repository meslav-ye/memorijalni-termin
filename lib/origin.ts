import { headers } from "next/headers";

/**
 * Public app origin, derived from request headers.
 *
 * Must not be hard-coded: the same app runs on localhost, Vercel preview
 * URLs, and production. Behind a proxy (Vercel) the original protocol
 * arrives in x-forwarded-proto, so `origin` is not always available directly.
 */
export async function getAppOrigin(): Promise<string> {
  const h = await headers();

  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
