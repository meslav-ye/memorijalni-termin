import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { GroupTabs } from "./Tabs";

export default async function LayoutGrupe({
  children,
  params,
}: LayoutProps<"/grupe/[grupaId]">) {
  const { grupaId } = await params;

  // Korisnik i clanstvo idu kroz cache() — stranica ispod pita isto,
  // a ovako se prema bazi ode samo jednom po zahtjevu.
  const korisnik = await getUser();
  if (!korisnik) redirect("/prijava");

  const supabase = await createClient();

  // RLS vec ogranicava vidljivost na grupe cijim si aktivnim clanom,
  // pa prazan rezultat znaci "nisi clan" jednako kao i "ne postoji".
  const { data: grupa } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", grupaId)
    .maybeSingle();

  if (!grupa) notFound();

  const clanstvo = await getMembership(grupaId);
  const admin = clanstvo?.role === "admin" && clanstvo.status === "active";

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/grupe"
            className="text-sm text-slate-500 underline underline-offset-4"
          >
            ← Moje grupe
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{grupa.name}</h1>
        </div>
        <Link
          href="/profil"
          className="shrink-0 text-sm text-slate-500 underline underline-offset-4"
        >
          Profil
        </Link>
      </header>

      <GroupTabs grupaId={grupaId} admin={admin} />

      {children}
    </div>
  );
}
