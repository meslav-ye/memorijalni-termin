/**
 * Which sign-in methods are actually enabled on the Supabase project.
 *
 * Exists so local development does not offer a button that cannot work:
 * Google is configured in the cloud, but local Docker Supabase knows nothing
 * about it.
 *
 * IMPORTANT — when unsure, SHOW the button, do not hide it.
 * The first version of this function did the opposite and hid Google in
 * production whenever settings fetch failed, making sign-in impossible.
 * Wrong side of caution: a failed sign-in at least reports an error; a
 * missing button cannot even be tried.
 */
export type AvailableMethods = {
  google: boolean;
};

export async function getAvailableMethods(): Promise<AvailableMethods> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Unknown — show it.
  if (!url || !key) return { google: true };

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return { google: true };

    const data = (await response.json()) as { external?: Record<string, boolean> };

    // Hide ONLY when Supabase explicitly said it is disabled.
    return { google: data.external?.google !== false };
  } catch {
    return { google: true };
  }
}
