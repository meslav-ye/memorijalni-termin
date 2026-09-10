import Link from "next/link";
import { redirect } from "next/navigation";
import { SoftLink } from "@/components/ui/SoftLink";
import { createClient } from "@/lib/supabase/server";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prijava");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("status, groups(id, name)")
    .eq("user_id", user.id);

  const activeGroups = (memberships ?? []).filter((c) => c.status === "active" && c.groups);
  const pendingGroups = (memberships ?? []).filter((c) => c.status === "pending" && c.groups);

  // Creating a group needs explicit permission; joining another does not.
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("can_create_groups")
    .eq("id", user.id)
    .maybeSingle();

  const canCreate = myProfile?.can_create_groups ?? false;

  // Do NOT redirect here, even if the member is only in one group.
  //
  // There used to be a shortcut "one group -> go straight in". The result was
  // that the group list could never be seen: every click on "Moje grupe" sent
  // you back into the same group, so the create-new button was unreachable.
  // The shortcut remains on the entry point (app/page.tsx) — there the user
  // "went somewhere"; here they explicitly asked for the list.

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Moje grupe</h1>
        <SoftLink href="/profil">Postavke profila</SoftLink>
      </header>

      {activeGroups.length === 0 && pendingGroups.length === 0 && (
        <div className="mb-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium">Još nisi ni u jednoj grupi</p>
          <p className="mt-1 text-sm text-slate-500">
            Otvori svoju ili se pridruži preko linka koji ti je netko poslao.
          </p>
        </div>
      )}

      <ul className="mb-8 space-y-3">
        {activeGroups.map((c) => (
          <li key={c.groups!.id}>
            <Link
              href={`/grupe/${c.groups!.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 font-medium
                         transition active:scale-[0.99] hover:border-slate-400"
            >
              {c.groups!.name}
            </Link>
          </li>
        ))}
        {pendingGroups.map((c) => (
          <li
            key={c.groups!.id}
            className="rounded-lg border border-slate-200 bg-slate-100 p-4 text-slate-500"
          >
            <span className="font-medium">{c.groups!.name}</span>
            <span className="block text-sm">Čeka se odobrenje admina</span>
          </li>
        ))}
      </ul>

      {canCreate ? (
        <>
          <Link
            href="/grupe/nova"
            className="flex h-14 w-full items-center justify-center rounded-lg bg-marka
                       text-base font-semibold text-white transition active:scale-[0.98]"
          >
            Otvori novu grupu
          </Link>

          <p className="mt-4 text-center text-sm text-slate-500">
            U postojeću grupu ulaziš preko linka pozivnice koji ti pošalje organizator.
          </p>
        </>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
          U grupu se ulazi preko <strong>linka pozivnice</strong> koji ti pošalje
          organizator. Otvaranje vlastite grupe traži posebno dopuštenje.
        </p>
      )}
    </main>
  );
}
