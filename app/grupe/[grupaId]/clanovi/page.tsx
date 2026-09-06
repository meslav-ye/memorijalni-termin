import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dohvatiClanstvo, dohvatiKorisnika } from "@/lib/podaci/korisnik";
import { createAdminClient } from "@/lib/supabase/admin";
import { odbijClana, odobriClana, izbaciClana, promijeniUlogu } from "./akcije";

const GUMB_MALI =
  "h-10 rounded-lg px-3 text-sm font-medium transition active:scale-[0.97]";

export default async function StranicaClanova({
  params,
}: PageProps<"/grupe/[grupaId]/clanovi">) {
  const { grupaId } = await params;

  const user = await dohvatiKorisnika();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const ja = await dohvatiClanstvo(grupaId);

  const admin = ja?.role === "admin";

  const { data: clanstva } = await supabase
    .from("group_members")
    .select("user_id, role, status, profiles(nickname, full_name, is_goalkeeper)")
    .eq("group_id", grupaId);

  const { data: ratinzi } = await supabase
    .from("player_ratings")
    .select("user_id, rating, matches_played")
    .eq("group_id", grupaId);

  // Zahtjevi na cekanju su nevidljivi obicnom clanu po RLS-u, pa ih adminu
  // dohvacamo tajnim kljucem — ali tek nakon sto smo potvrdili da je admin.
  let zahtjevi: { user_id: string; nickname: string; full_name: string }[] = [];
  if (admin) {
    const adminKlijent = createAdminClient();
    const { data } = await adminKlijent
      .from("group_members")
      .select("user_id, profiles(nickname, full_name)")
      .eq("group_id", grupaId)
      .eq("status", "pending");

    zahtjevi = (data ?? []).map((z) => ({
      user_id: z.user_id,
      nickname: z.profiles?.nickname || "(bez nadimka)",
      full_name: z.profiles?.full_name || "",
    }));
  }

  const aktivni = (clanstva ?? [])
    .filter((c) => c.status === "active")
    .map((c) => ({
      ...c,
      rating: ratinzi?.find((r) => r.user_id === c.user_id)?.rating ?? 1000,
      odigrani: ratinzi?.find((r) => r.user_id === c.user_id)?.matches_played ?? 0,
    }))
    .sort((a, b) => (a.profiles?.nickname ?? "").localeCompare(b.profiles?.nickname ?? "", "hr"));

  return (
    <div className="space-y-8">
      {admin && zahtjevi.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Zahtjevi za članstvo ({zahtjevi.length})
          </h2>
          <ul className="space-y-2">
            {zahtjevi.map((z) => (
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
                  <form action={odobriClana}>
                    <input type="hidden" name="grupaId" value={grupaId} />
                    <input type="hidden" name="korisnikId" value={z.user_id} />
                    <button className={`${GUMB_MALI} bg-marka text-white`}>Odobri</button>
                  </form>
                  <form action={odbijClana}>
                    <input type="hidden" name="grupaId" value={grupaId} />
                    <input type="hidden" name="korisnikId" value={z.user_id} />
                    <button className={`${GUMB_MALI} border border-slate-300 bg-white`}>
                      Odbij
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Članovi ({aktivni.length})
        </h2>

        {aktivni.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            Još nema članova.
          </p>
        ) : (
          <ul className="space-y-2">
            {aktivni.map((c) => (
              <li
                key={c.user_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg
                           border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <span className="font-medium">
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
                  </span>
                  <span className="block text-sm text-slate-500">
                    rating {c.rating} · {c.odigrani}{" "}
                    {c.odigrani === 1 ? "termin" : "termina"}
                  </span>
                </div>

                {admin && c.user_id !== user.id && (
                  <div className="flex gap-2">
                    <form action={promijeniUlogu}>
                      <input type="hidden" name="grupaId" value={grupaId} />
                      <input type="hidden" name="korisnikId" value={c.user_id} />
                      <input
                        type="hidden"
                        name="uloga"
                        value={c.role === "admin" ? "member" : "admin"}
                      />
                      <button className={`${GUMB_MALI} border border-slate-300 bg-white`}>
                        {c.role === "admin" ? "Skini admina" : "Napravi adminom"}
                      </button>
                    </form>
                    <form action={izbaciClana}>
                      <input type="hidden" name="grupaId" value={grupaId} />
                      <input type="hidden" name="korisnikId" value={c.user_id} />
                      <button className={`${GUMB_MALI} border border-red-300 bg-white text-red-700`}>
                        Izbaci
                      </button>
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
