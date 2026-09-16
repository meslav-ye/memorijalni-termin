import { notFound, redirect } from "next/navigation";
import { SoftLink } from "@/components/ui/SoftLink";
import { getGroup } from "@/lib/data/groups";
import { getMembership, getUser } from "@/lib/data/user";
import { GroupTabs } from "./Tabs";

export default async function GroupLayout({
  children,
  params,
}: LayoutProps<"/grupe/[grupaId]">) {
  const { grupaId } = await params;

  // User, membership and group go through cache() — nested pages ask for
  // the same data, so this way we hit the DB only once per request.
  const user = await getUser();
  if (!user) redirect("/prijava");

  const [group, membership] = await Promise.all([
    getGroup(grupaId),
    getMembership(grupaId),
  ]);

  // RLS already limits visibility to groups you are an active member of,
  // so an empty result means "not a member" the same as "does not exist".
  if (!group) notFound();

  const admin = membership?.role === "admin" && membership.status === "active";

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <SoftLink href="/grupe">← Moje grupe</SoftLink>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{group.name}</h1>
        </div>
        <SoftLink href="/profil">Postavke profila</SoftLink>
      </header>

      <GroupTabs grupaId={grupaId} admin={admin} />

      {children}
    </div>
  );
}
