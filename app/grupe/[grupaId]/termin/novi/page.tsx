import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { NewMatchForm } from "./NewMatchForm";

export default async function NewMatchPage({
  params,
}: PageProps<"/grupe/[grupaId]/termin/novi">) {
  const { grupaId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const membership = await getMembership(grupaId);

  if (membership?.role !== "admin" || membership.status !== "active") notFound();

  const { data: group } = await supabase
    .from("groups")
    .select("default_capacity, default_min_players")
    .eq("id", grupaId)
    .maybeSingle();

  if (!group) notFound();

  const { data: locations } = await supabase
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

      <NewMatchForm
        grupaId={grupaId}
        locations={locations ?? []}
        defaultCapacity={group.default_capacity}
        defaultMin={group.default_min_players}
      />
    </main>
  );
}
