import { createClient } from "@/lib/supabase/server";
import { splitSignups } from "@/lib/domain/waitlist";
import { fillStatus, type FillStatus } from "@/lib/domain/fill";

export type TerminSaPrijavama = {
  id: string;
  startsAt: string;
  capacity: number;
  minPlayers: number;
  status: string;
  notes: string | null;
  lokacija: string;
  prijavljenih: number;
  stanje: FillStatus;
  jaSamUnutra: boolean;
  jaCekam: boolean;
};

export type PodijeljeniTermini = {
  nadolazeci: TerminSaPrijavama[];
  prosli: TerminSaPrijavama[];
};

/**
 * Dohvaca termine grupe i racuna fillStatus svakog.
 *
 * Namjerno stoji IZVAN komponente: cita trenutno vrijeme, a citanje sata unutar
 * render funkcije daje rezultat koji se moze promijeniti izmedju dva rendera.
 * Ovdje se pozove jednom po zahtjevu i vrati gotove podatke.
 */
export async function dohvatiTermine(
  grupaId: string,
  korisnikId: string,
): Promise<PodijeljeniTermini> {
  const supabase = await createClient();

  const { data: termini } = await supabase
    .from("matches")
    .select(
      "id, starts_at, capacity, min_players, status, notes, location_text, locations(name)",
    )
    .eq("group_id", grupaId)
    .order("starts_at", { ascending: false });

  const sviTermini = termini ?? [];
  if (sviTermini.length === 0) return { nadolazeci: [], prosli: [] };

  const { data: prijave } = await supabase
    .from("match_signups")
    .select("match_id, user_id, signed_up_at, manual_order, cancelled_at")
    .in(
      "match_id",
      sviTermini.map((t) => t.id),
    );

  const sada = Date.now();

  const obogaceni: TerminSaPrijavama[] = sviTermini.map((t) => {
    const zaTermin = (prijave ?? [])
      .filter((p) => p.match_id === t.id)
      .map((p) => ({
        userId: p.user_id,
        signedUpAt: p.signed_up_at,
        manualOrder: p.manual_order,
        cancelledAt: p.cancelled_at,
      }));

    const { confirmed, waitlist } = splitSignups(zaTermin, t.capacity);

    return {
      id: t.id,
      startsAt: t.starts_at,
      capacity: t.capacity,
      minPlayers: t.min_players,
      status: t.status,
      notes: t.notes,
      lokacija: t.locations?.name ?? t.location_text ?? "Lokacija nije upisana",
      prijavljenih: confirmed.length,
      stanje: fillStatus(confirmed.length, t.min_players, t.capacity),
      jaSamUnutra: confirmed.includes(korisnikId),
      jaCekam: waitlist.includes(korisnikId),
    };
  });

  return {
    nadolazeci: obogaceni
      .filter((t) => new Date(t.startsAt).getTime() >= sada && t.status !== "otkazan")
      .reverse(),
    prosli: obogaceni.filter(
      (t) => new Date(t.startsAt).getTime() < sada || t.status === "otkazan",
    ),
  };
}
