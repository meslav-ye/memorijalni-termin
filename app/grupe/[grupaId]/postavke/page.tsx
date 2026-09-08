import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { baznaAdresa } from "@/lib/adresa";
import { LinkPozivnice } from "./LinkPozivnice";
import { obnoviKodPozivnice, spremiPostavke } from "./akcije";

export default async function StranicaPostavki({
  params,
}: PageProps<"/grupe/[grupaId]/postavke">) {
  const { grupaId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const clanstvo = await getMembership(grupaId);

  // Postavke su iskljucivo adminove. Obicnom clanu se ponasa kao da ne postoje.
  if (clanstvo?.role !== "admin" || clanstvo.status !== "active") notFound();

  const { data: grupa } = await supabase
    .from("groups")
    .select("id, name, default_capacity, invite_code")
    .eq("id", grupaId)
    .maybeSingle();

  if (!grupa) notFound();

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pozivnica
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Pošalji ovaj link u WhatsApp. Tko ga otvori šalje zahtjev, a ti ga
          odobravaš u tabu <strong>Članovi</strong>.
        </p>

        <LinkPozivnice
          link={`${await baznaAdresa()}/grupe/pridruzi/${grupa.invite_code}`}
          nazivGrupe={grupa.name}
        />

        <form action={obnoviKodPozivnice} className="mt-4">
          <input type="hidden" name="grupaId" value={grupaId} />
          <button className="text-sm text-slate-500 underline underline-offset-4">
            Izdaj novi link
          </button>
          <p className="mt-1 text-sm text-slate-500">
            Stari link odmah prestaje raditi. Koristi ako je procurio izvan društva.
          </p>
        </form>
      </section>

      <section className="border-t border-slate-200 pt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Grupa
        </h2>

        <form action={spremiPostavke} className="space-y-5">
          <input type="hidden" name="grupaId" value={grupaId} />

          <div className="space-y-2">
            <label htmlFor="naziv" className="block text-sm font-medium text-slate-700">
              Naziv
            </label>
            <input
              id="naziv"
              name="naziv"
              defaultValue={grupa.name}
              required
              minLength={2}
              maxLength={60}
              className="w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base
                         focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="kvota" className="block text-sm font-medium text-slate-700">
              Zadani broj igrača po terminu
            </label>
            <input
              id="kvota"
              name="kvota"
              type="number"
              inputMode="numeric"
              defaultValue={grupa.default_capacity}
              min={2}
              max={30}
              required
              className="w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base
                         focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20"
            />
            <p className="text-sm text-slate-500">
              Prijedlog za nove termine. Svaki termin može imati svoj broj.
            </p>
          </div>

          <button
            type="submit"
            className="h-12 rounded-lg bg-marka px-6 text-sm font-semibold text-white
                       transition active:scale-[0.98]"
          >
            Spremi
          </button>
        </form>
      </section>
    </div>
  );
}
