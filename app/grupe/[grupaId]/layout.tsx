import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabovi } from "./Tabovi";

export default async function LayoutGrupe({
  children,
  params,
}: LayoutProps<"/grupe/[grupaId]">) {
  const { grupaId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prijava");

  // RLS vec ogranicava vidljivost na grupe cijim si aktivnim clanom,
  // pa prazan rezultat znaci "nisi clan" jednako kao i "ne postoji".
  const { data: grupa } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", grupaId)
    .maybeSingle();

  if (!grupa) notFound();

  const { data: clanstvo } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", grupaId)
    .eq("user_id", user.id)
    .maybeSingle();

  const admin = clanstvo?.role === "admin";

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

      <Tabovi grupaId={grupaId} admin={admin} />

      {children}
    </div>
  );
}
