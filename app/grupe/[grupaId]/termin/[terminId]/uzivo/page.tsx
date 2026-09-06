import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dohvatiClanstvo, dohvatiKorisnika } from "@/lib/podaci/korisnik";
import type { Team } from "@/lib/domain/types";
import { razlikujNadimke } from "@/lib/domain/nadimak";
import { EkranUzivo, type Dogadjaj, type IgracPostave } from "./EkranUzivo";

export default async function StranicaUzivo({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]/uzivo">) {
  const { grupaId, terminId } = await params;

  const user = await dohvatiKorisnika();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const clanstvo = await dohvatiClanstvo(grupaId);
  if (clanstvo?.status !== "active") notFound();

  const { data: termin } = await supabase
    .from("matches")
    .select("id, status, started_at, paused_at, total_paused_seconds")
    .eq("id", terminId)
    .maybeSingle();
  if (!termin) notFound();

  // Na ovaj ekran se dolazi tek kad je termin pokrenut ili zavrsen.
  if (termin.status !== "u_tijeku" && termin.status !== "zavrsen") {
    redirect(`/grupe/${grupaId}/termin/${terminId}`);
  }

  const { data: postavaRedci } = await supabase
    .from("match_lineup")
    .select("user_id, team, is_goalkeeper")
    .eq("match_id", terminId);

  const idevi = (postavaRedci ?? []).map((p) => p.user_id);

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, nickname, full_name")
    .in("id", idevi.length ? idevi : ["-"]);

  // Ako dvoje u postavi ima isti nadimak, oznaka dobiva razlikovni dodatak
  // (prezime). Racuna se OVDJE, pri dohvatu, pa ekran uzivo dobije gotov
  // tekst i ne mora nista znati o kolizijama.
  const oznake = razlikujNadimke(
    (postavaRedci ?? []).map((p) => {
      const profil = profili?.find((x) => x.id === p.user_id);
      return {
        userId: p.user_id,
        nadimak: profil?.nickname || "?",
        fullName: profil?.full_name ?? null,
      };
    }),
  );

  const postava: IgracPostave[] = (postavaRedci ?? []).map((p) => ({
    userId: p.user_id,
    nadimak: oznake.get(p.user_id) ?? "?",
    team: p.team as Team,
    jeGolman: p.is_goalkeeper,
  }));

  const { data: dogadjajiRedci } = await supabase
    .from("match_events")
    .select("id, type, team, scorer_id, assist_id, elapsed_seconds, created_at, deleted_at")
    .eq("match_id", terminId)
    .order("created_at", { ascending: false });

  const dogadjaji: Dogadjaj[] = (dogadjajiRedci ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    team: e.team as Team | null,
    scorerId: e.scorer_id,
    assistId: e.assist_id,
    elapsedSeconds: e.elapsed_seconds,
    createdAt: e.created_at,
    deletedAt: e.deleted_at,
  }));

  return (
    <div>
      <Link
        href={`/grupe/${grupaId}/termin/${terminId}`}
        className="mb-4 inline-block text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na termin
      </Link>

      <EkranUzivo
        grupaId={grupaId}
        terminId={terminId}
        pocetnaPostava={postava}
        pocetniDogadjaji={dogadjaji}
        pocetnoStanje={{
          status: termin.status,
          startedAt: termin.started_at,
          pausedAt: termin.paused_at,
          totalPausedSeconds: termin.total_paused_seconds,
        }}
      />
    </div>
  );
}
