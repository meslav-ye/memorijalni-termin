import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { formatMatchDateTime } from "@/lib/format";
import { splitSignups } from "@/lib/domain/waitlist";
import { proposeTeams, movePlayer, setGoalkeeper } from "../../actions";

type IgracUPostavi = {
  userId: string;
  nadimak: string;
  rating: number;
  golman: boolean;
};

function Kolona({
  naslov,
  ekipa,
  igraci,
  grupaId,
  terminId,
  smjer,
}: {
  naslov: string;
  ekipa: "A" | "B";
  igraci: IgracUPostavi[];
  grupaId: string;
  terminId: string;
  smjer: "→" | "←";
}) {
  const zbroj = igraci.reduce((s, p) => s + p.rating, 0);
  const prosjek = igraci.length ? Math.round(zbroj / igraci.length) : 0;
  const imaGolmana = igraci.some((p) => p.golman);

  return (
    <div className="flex-1">
      <div className="mb-2">
        <h3 className="font-bold">{naslov}</h3>
        <p className="text-xs text-slate-500">
          {igraci.length} {igraci.length === 1 ? "igrač" : "igrača"} · prosjek {prosjek}
        </p>
      </div>

      {!imaGolmana && igraci.length > 0 && (
        <p className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          Nema golmana
        </p>
      )}

      <ul className="space-y-1">
        {igraci.map((p) => (
          <li
            key={p.userId}
            className={
              "flex items-center gap-1 rounded-lg border p-1 pl-2 " +
              // Golman se mora vidjeti na prvi pogled, ne tek zagledavanjem
              // u ikonu — zato se boji cijeli redak.
              (p.golman
                ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400/40"
                : "border-slate-200 bg-white")
            }
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nadimak}</span>

            <form action={setGoalkeeper}>
              <input type="hidden" name="grupaId" value={grupaId} />
              <input type="hidden" name="terminId" value={terminId} />
              <input type="hidden" name="korisnikId" value={p.userId} />
              <input type="hidden" name="ekipa" value={ekipa} />
              <button
                title={p.golman ? "Skini oznaku golmana" : "Postavi za golmana"}
                aria-label={p.golman ? "Skini oznaku golmana" : "Postavi za golmana"}
                className={
                  "h-9 w-9 rounded text-base transition active:scale-95 " +
                  (p.golman ? "bg-emerald-100" : "opacity-30 hover:opacity-70")
                }
              >
                🧤
              </button>
            </form>

            <form action={movePlayer}>
              <input type="hidden" name="grupaId" value={grupaId} />
              <input type="hidden" name="terminId" value={terminId} />
              <input type="hidden" name="korisnikId" value={p.userId} />
              <input type="hidden" name="ekipa" value={ekipa === "A" ? "B" : "A"} />
              <button
                title="Premjesti u drugu ekipu"
                aria-label={`Premjesti ${p.nadimak} u drugu ekipu`}
                className="h-9 w-9 rounded border border-slate-200 text-sm text-slate-500
                           transition active:scale-95 hover:bg-slate-100"
              >
                {smjer}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function StranicaEkipa({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]/ekipe">) {
  const { grupaId, terminId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const clanstvo = await getMembership(grupaId);
  if (clanstvo?.status !== "active") notFound();

  const { data: termin } = await supabase
    .from("matches")
    .select("id, starts_at, capacity, status")
    .eq("id", terminId)
    .maybeSingle();
  if (!termin) notFound();

  const { data: postava } = await supabase
    .from("match_lineup")
    .select("user_id, team, is_goalkeeper")
    .eq("match_id", terminId);

  const { data: prijave } = await supabase
    .from("match_signups")
    .select("user_id, signed_up_at, manual_order, cancelled_at")
    .eq("match_id", terminId);

  const { confirmed } = splitSignups(
    (prijave ?? []).map((p) => ({
      userId: p.user_id,
      signedUpAt: p.signed_up_at,
      manualOrder: p.manual_order,
      cancelledAt: p.cancelled_at,
    })),
    termin.capacity,
  );

  const sviIdevi = [...new Set([...(postava ?? []).map((p) => p.user_id), ...confirmed])];

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", sviIdevi.length ? sviIdevi : ["-"]);

  const { data: ratinzi } = await supabase
    .from("player_ratings")
    .select("user_id, rating")
    .eq("group_id", grupaId)
    .in("user_id", sviIdevi.length ? sviIdevi : ["-"]);

  const napravi = (userId: string, golman: boolean): IgracUPostavi => ({
    userId,
    nadimak: profili?.find((p) => p.id === userId)?.nickname || "(bez nadimka)",
    rating: ratinzi?.find((r) => r.user_id === userId)?.rating ?? 1000,
    golman,
  });

  const ekipaA = (postava ?? [])
    .filter((p) => p.team === "A")
    .map((p) => napravi(p.user_id, p.is_goalkeeper));
  const ekipaB = (postava ?? [])
    .filter((p) => p.team === "B")
    .map((p) => napravi(p.user_id, p.is_goalkeeper));

  const postavaPostoji = ekipaA.length + ekipaB.length > 0;
  const zbrojA = ekipaA.reduce((s, p) => s + p.rating, 0);
  const zbrojB = ekipaB.reduce((s, p) => s + p.rating, 0);

  // Tko je prijavljen, a nije rasporedjen — npr. netko se prijavio nakon
  // sto su ekipe vec bile slozene.
  const nerasporedeni = confirmed.filter(
    (id) => !(postava ?? []).some((p) => p.user_id === id),
  );

  return (
    <div>
      <Link
        href={`/grupe/${grupaId}/termin/${terminId}`}
        className="text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na termin
      </Link>

      <header className="mt-4 mb-6">
        <h2 className="text-lg font-bold tracking-tight">Ekipe</h2>
        <p className="text-sm text-slate-500">{formatMatchDateTime(termin.starts_at)}</p>
      </header>

      {!postavaPostoji ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium">Ekipe još nisu složene</p>
          <p className="mt-1 text-sm text-slate-500">
            {confirmed.length === 0
              ? "Nitko se još nije prijavio."
              : `Prijavljenih: ${confirmed.length}. Aplikacija će razdvojiti golmane i poravnati ekipe.`}
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            <Kolona
              naslov="Ekipa A"
              ekipa="A"
              igraci={ekipaA}
              grupaId={grupaId}
              terminId={terminId}
              smjer="→"
            />
            <Kolona
              naslov="Ekipa B"
              ekipa="B"
              igraci={ekipaB}
              grupaId={grupaId}
              terminId={terminId}
              smjer="←"
            />
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            Razlika u zbroju ratinga:{" "}
            <span className="font-medium tabular-nums text-slate-700">
              {Math.abs(zbrojA - zbrojB)}
            </span>
          </p>
        </>
      )}

      {nerasporedeni.length > 0 && postavaPostoji && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {nerasporedeni.length}{" "}
          {nerasporedeni.length === 1 ? "igrač se prijavio" : "igrača se prijavilo"} nakon
          slaganja ekipa. Promiješaj ponovno da uđu u postavu.
        </p>
      )}

      {confirmed.length > 0 && termin.status !== "zavrsen" && termin.status !== "otkazan" && (
        <form action={proposeTeams} className="mt-6">
          <input type="hidden" name="grupaId" value={grupaId} />
          <input type="hidden" name="terminId" value={terminId} />
          <button
            className="h-14 w-full rounded-lg bg-marka text-base font-semibold text-white
                       transition active:scale-[0.98]"
          >
            {postavaPostoji ? "Promiješaj ponovno" : "Predloži ekipe"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        Ekipe smije mijenjati bilo tko iz grupe.
      </p>
    </div>
  );
}
