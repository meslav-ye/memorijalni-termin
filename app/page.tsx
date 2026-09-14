import { redirect } from "next/navigation";
import { getUser } from "@/lib/data/user";
import { createClient } from "@/lib/supabase/server";

/**
 * Fallback entry gate. Cold open normally rewrites from `proxy.ts` so we
 * avoid a second full navigation. This page still covers edge cases where
 * the proxy path is skipped.
 *
 *   not signed in           -> /prijava
 *   signed in, no nickname  -> /profil
 *   member of exactly one   -> straight into that group
 *   otherwise               -> /grupe
 */
export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/prijava");

  const supabase = await createClient();
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("nickname").eq("id", user.id).maybeSingle(),
    supabase.from("group_members").select("group_id, status").eq("user_id", user.id),
  ]);

  if (!profile?.nickname) redirect("/profil");

  const activeGroups = (memberships ?? []).filter((c) => c.status === "active");
  const pendingGroups = (memberships ?? []).filter((c) => c.status === "pending");

  if (activeGroups.length === 1 && pendingGroups.length === 0) {
    redirect(`/grupe/${activeGroups[0].group_id}`);
  }

  redirect("/grupe");
}
