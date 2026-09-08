import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { rejectMember, approveMember, removeMember, changeRole } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

const SMALL_BTN =
  "h-10 rounded-lg px-3 text-sm font-medium transition active:scale-[0.97]";

export default async function MembersPage({
  params,
}: PageProps<"/grupe/[grupaId]/clanovi">) {
  const { grupaId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const me = await getMembership(grupaId);

  const admin = me?.role === "admin";

  const { data: memberships } = await supabase
    .from("group_members")
    .select("user_id, role, status, profiles(nickname, full_name, is_goalkeeper)")
    .eq("group_id", grupaId);

  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("user_id, rating, matches_played")
    .eq("group_id", grupaId);

  // Pending requests are invisible to a regular member under RLS, so we
  // fetch them for the admin with the service role — only after confirming
  // they are an admin.
  let requests: { user_id: string; nickname: string; full_name: string }[] = [];
  if (admin) {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("group_members")
      .select("user_id, profiles(nickname, full_name)")
      .eq("group_id", grupaId)
      .eq("status", "pending");

    requests = (data ?? []).map((z) => ({
      user_id: z.user_id,
      nickname: z.profiles?.nickname || "(bez nadimka)",
      full_name: z.profiles?.full_name || "",
    }));
  }

  const activeMembers = (memberships ?? [])
    .filter((c) => c.status === "active")
    .map((c) => ({
      ...c,
      rating: ratings?.find((r) => r.user_id === c.user_id)?.rating ?? 1000,
      matchesPlayed: ratings?.find((r) => r.user_id === c.user_id)?.matches_played ?? 0,
    }))
    .sort((a, b) => (a.profiles?.nickname ?? "").localeCompare(b.profiles?.nickname ?? "", "hr"));

  return (
    <div className="space-y-8">
      {admin && requests.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Zahtjevi za članstvo ({requests.length})
          </h2>
          <ul className="space-y-2">
            {requests.map((z) => (
              <li
                key={z.user_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg
                           border border-amber-200 bg-amber-50 p-4"
              >
                <div>
                  <span className="font-medium">{z.nickname}</span>
                  {z.full_name && (
                    <span className="block text-sm text-slate-500">{z.full_name}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <form action={approveMember}>
                    <input type="hidden" name="groupId" value={grupaId} />
                    <input type="hidden" name="userId" value={z.user_id} />
                    <SubmitButton
                      pendingLabel="…"
                      className={`${SMALL_BTN} bg-marka text-white`}
                    >
                      Odobri
                    </SubmitButton>
                  </form>
                  <form action={rejectMember}>
                    <input type="hidden" name="groupId" value={grupaId} />
                    <input type="hidden" name="userId" value={z.user_id} />
                    <SubmitButton
                      pendingLabel="…"
                      className={`${SMALL_BTN} border border-slate-300 bg-white`}
                    >
                      Odbij
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Članovi ({activeMembers.length})
        </h2>

        {activeMembers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            Još nema članova.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeMembers.map((c) => (
              <li
                key={c.user_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg
                           border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/grupe/${grupaId}/igrac/${c.user_id}?from=clanovi`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {c.profiles?.nickname || "(bez nadimka)"}
                    {c.profiles?.is_goalkeeper && (
                      <span title="Igra golmana" className="ml-1">
                        🧤
                      </span>
                    )}
                    {c.role === "admin" && (
                      <span className="ml-2 rounded bg-marka px-1.5 py-0.5 text-xs font-semibold text-white">
                        admin
                      </span>
                    )}
                  </Link>
                  <span className="block text-sm text-slate-500">
                    rating {c.rating} · {c.matchesPlayed}{" "}
                    {c.matchesPlayed === 1 ? "utakmica" : "utakmice"}
                  </span>
                </div>

                {admin && c.user_id !== user.id && (
                  <div className="flex gap-2">
                    <form action={changeRole}>
                      <input type="hidden" name="groupId" value={grupaId} />
                      <input type="hidden" name="userId" value={c.user_id} />
                      <input
                        type="hidden"
                        name="role"
                        value={c.role === "admin" ? "member" : "admin"}
                      />
                      <SubmitButton
                        pendingLabel="…"
                        className={`${SMALL_BTN} border border-slate-300 bg-white`}
                      >
                        {c.role === "admin" ? "Skini admina" : "Napravi adminom"}
                      </SubmitButton>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="groupId" value={grupaId} />
                      <input type="hidden" name="userId" value={c.user_id} />
                      <SubmitButton
                        pendingLabel="…"
                        className={`${SMALL_BTN} border border-red-300 bg-white text-red-700`}
                      >
                        Izbaci
                      </SubmitButton>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
