import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { GroupTabs } from "./Tabs";

export default async function GroupLayout({
  children,
  params,
}: LayoutProps<"/grupe/[grupaId]">) {
  const { grupaId } = await params;

  // User and membership go through cache() — the page below asks for the
  // same data, so this way we hit the DB only once per request.
  const user = await getUser();
  if (!user) redirect("/prijava");

  const supabase = await createClient();

  // RLS already limits visibility to groups you are an active member of,
  // so an empty result means "not a member" the same as "does not exist".
  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", grupaId)
    .maybeSingle();

  if (!group) notFound();

  const membership = await getMembership(grupaId);
  const admin = membership?.role === "admin" && membership.status === "active";

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
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{group.name}</h1>
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
