import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Vratar na ulazu. Sam nista ne prikazuje — samo odlucuje kamo korisnik ide:
 *
 *   nije prijavljen         -> /prijava
 *   prijavljen bez nadimka  -> /profil
 *   clan tocno jedne grupe  -> ravno u tu grupu
 *   inace                   -> /grupe
 *
 * Precac za jednu grupu stoji OVDJE, a ne na /grupe. Ondje je stajao prije i
 * zakljucavao korisnika: klik na "Moje grupe" vracao bi ga u istu grupu, pa
 * popis i gumb za otvaranje nove grupe nisu bili dostupni.
 */
export default async function Pocetna() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prijava");

  const { data: profil } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  if (!profil?.nickname) redirect("/profil");

  const { data: clanstva } = await supabase
    .from("group_members")
    .select("group_id, status")
    .eq("user_id", user.id);

  const aktivne = (clanstva ?? []).filter((c) => c.status === "active");
  const naCekanju = (clanstva ?? []).filter((c) => c.status === "pending");

  if (aktivne.length === 1 && naCekanju.length === 0) {
    redirect(`/grupe/${aktivne[0].group_id}`);
  }

  redirect("/grupe");
}
