import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Tab "Termini". Pravi sadrzaj — popis termina, kreiranje, prijave — dolazi u M4.
 */
export default async function StranicaTermina({
  params,
}: PageProps<"/grupe/[grupaId]">) {
  const { grupaId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const { data: clanstvo } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", grupaId)
    .eq("user_id", user.id)
    .maybeSingle();

  const admin = clanstvo?.role === "admin";

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-medium">Još nema termina</p>
      <p className="mt-1 text-sm text-slate-500">
        {admin
          ? "Otvaranje termina dolazi u sljedećem koraku izrade."
          : "Kad organizator otvori termin, pojavit će se ovdje."}
      </p>
    </div>
  );
}
