import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * PRIVREMENA verzija — M3 dodaje kreiranje grupe, pozivnice i odobravanje clanova.
 * Zasad sluzi kao dokaz da prijava i RLS rade zajedno: prikazuje tocno one grupe
 * kojih je prijavljeni korisnik aktivni clan, i nijednu vise.
 */
export default async function StranicaGrupa() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prijava");

  const { data: clanstva } = await supabase
    .from("group_members")
    .select("status, groups(id, name)")
    .eq("user_id", user.id);

  const aktivne = (clanstva ?? []).filter((c) => c.status === "active");
  const naCekanju = (clanstva ?? []).filter((c) => c.status === "pending");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Moje grupe</h1>
        <Link href="/profil" className="text-sm text-slate-500 underline underline-offset-4">
          Profil
        </Link>
      </header>

      {aktivne.length === 0 && naCekanju.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium">Još nisi ni u jednoj grupi</p>
          <p className="mt-1 text-sm text-slate-500">
            Zamoli organizatora za link pozivnice.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {aktivne.map((c) => (
          <li key={c.groups!.id}>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <span className="font-medium">{c.groups!.name}</span>
            </div>
          </li>
        ))}
        {naCekanju.map((c) => (
          <li key={c.groups!.id}>
            <div className="rounded-lg border border-slate-200 bg-slate-100 p-4 text-slate-500">
              <span className="font-medium">{c.groups!.name}</span>
              <span className="block text-sm">Čeka se odobrenje admina</span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
