import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vraca id sezone za danu godinu, stvarajuci je ako ne postoji.
 *
 * Sezona je kalendarska godina i stvara se lijeno — kad se otvori prvi termin
 * u toj godini. Ide preko tajnog kljuca jer sezone po RLS-u pise samo admin,
 * a termin smije otvoriti i netko tko to nije.
 */
export async function osiguraSezonu(grupaId: string, godina: number): Promise<string | null> {
  const admin = createAdminClient();

  const { data: postojeca } = await admin
    .from("seasons")
    .select("id")
    .eq("group_id", grupaId)
    .eq("name", String(godina))
    .maybeSingle();

  if (postojeca) return postojeca.id;

  const { data: nova } = await admin
    .from("seasons")
    .insert({
      group_id: grupaId,
      name: String(godina),
      starts_on: `${godina}-01-01`,
      ends_on: `${godina}-12-31`,
    })
    .select("id")
    .single();

  return nova?.id ?? null;
}

/** Godina u koju termin pripada, po zagrebackom vremenu. */
export function godinaTermina(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zagreb",
      year: "numeric",
    }).format(new Date(iso)),
  );
}
