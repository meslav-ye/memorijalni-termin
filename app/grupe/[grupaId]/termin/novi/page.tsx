import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ObrazacNoviTermin } from "./ObrazacNoviTermin";

export default async function StranicaNoviTermin({
  params,
}: PageProps<"/grupe/[grupaId]/termin/novi">) {
  const { grupaId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const { data: clanstvo } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", grupaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (clanstvo?.role !== "admin" || clanstvo.status !== "active") notFound();

  const { data: grupa } = await supabase
    .from("groups")
    .select("default_capacity, default_min_players")
    .eq("id", grupaId)
    .maybeSingle();

  if (!grupa) notFound();

  const { data: lokacije } = await supabase
    .from("locations")
    .select("id, name")
    .eq("group_id", grupaId)
    .order("name");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <Link
        href={`/grupe/${grupaId}`}
        className="text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na termine
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-2xl font-bold tracking-tight">Novi termin</h1>
      </header>

      <ObrazacNoviTermin
        grupaId={grupaId}
        lokacije={lokacije ?? []}
        zadanaKvota={grupa.default_capacity}
        zadaniMin={grupa.default_min_players}
      />
    </main>
  );
}
