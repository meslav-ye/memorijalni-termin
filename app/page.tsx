import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Vratar na ulazu. Sam nista ne prikazuje — samo odlucuje kamo korisnik ide:
 *   nije prijavljen        -> /prijava
 *   prijavljen bez nadimka -> /profil
 *   inace                  -> /grupe
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

  redirect("/grupe");
}
