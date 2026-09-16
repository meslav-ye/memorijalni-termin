import { notFound, redirect } from "next/navigation";
import { SoftLink } from "@/components/ui/SoftLink";
import { createClient } from "@/lib/supabase/server";
import { getGroup } from "@/lib/data/groups";
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

  const [group, { data: locations }] = await Promise.all([
    getGroup(grupaId),
    supabase
      .from("locations")
      .select("id, name")
      .eq("group_id", grupaId)
      .order("name"),
  ]);

  if (!group) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <SoftLink href={`/grupe/${grupaId}`}>← Natrag na termine</SoftLink>

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
