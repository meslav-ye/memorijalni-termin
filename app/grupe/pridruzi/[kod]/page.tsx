import { redirect } from "next/navigation";
import { SoftLink } from "@/components/ui/SoftLink";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JoinRequestButton } from "./JoinRequestButton";

export default async function JoinGroupPage({
  params,
}: PageProps<"/grupe/pridruzi/[kod]">) {
  const { kod } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/prijava?povratak=${encodeURIComponent(`/grupe/pridruzi/${kod}`)}`);

  // Someone who is not yet a member cannot read the group under RLS — but
  // they must see at least its name to know where they are joining. So the
  // service role is used, exclusively for fetching the name.
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, name")
    .eq("invite_code", kod)
    .maybeSingle();

  if (!group) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold">Pozivnica nije važeća</h1>
          <p className="mt-2 text-slate-600">
            Link je možda istekao ili je admin izdao novi. Zamoli ga za svježi.
          </p>
          <SoftLink href="/grupe" className="mt-6">
            Idi na moje grupe
          </SoftLink>
        </div>
      </main>
    );
  }

  const { data: membership } = await admin
    .from("group_members")
    .select("status")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.status === "active") redirect(`/grupe/${group.id}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Pozvan si u grupu</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{group.name}</h1>
      </div>

      <div className="mt-6">
        {membership?.status === "pending" ? (
          <div className="rounded-lg border border-slate-200 bg-slate-100 p-4 text-center text-slate-600">
            Zahtjev je već poslan. Čeka se odobrenje admina.
          </div>
        ) : (
          <JoinRequestButton kod={kod} />
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Admin grupe mora odobriti tvoj zahtjev prije nego vidiš termine.
      </p>
    </main>
  );
}
