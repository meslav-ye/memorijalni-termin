import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Entry gate. Renders nothing — only decides where the user goes:
 *
 *   not signed in           -> /prijava
 *   signed in, no nickname  -> /profil
 *   member of exactly one   -> straight into that group
 *   otherwise               -> /grupe
 *
 * The one-group shortcut lives HERE, not on /grupe. It used to live there and
 * locked the user in: clicking "Moje grupe" sent them back into the same group,
 * so the list and the create-new button were unreachable.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prijava");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  if (!profile?.nickname) redirect("/profil");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, status")
    .eq("user_id", user.id);

  const activeGroups = (memberships ?? []).filter((c) => c.status === "active");
  const pendingGroups = (memberships ?? []).filter((c) => c.status === "pending");

  if (activeGroups.length === 1 && pendingGroups.length === 0) {
    redirect(`/grupe/${activeGroups[0].group_id}`);
  }

  redirect("/grupe");
}
