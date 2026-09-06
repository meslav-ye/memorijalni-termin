import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dohvatiDostupneMetode } from "@/lib/auth-postavke";
import { ObrazacPrijave } from "./ObrazacPrijave";

const PORUKE_GRESAKA: Record<string, string> = {
  veza: "Prijava nije dovršena. Link je možda istekao — pokušaj ponovno.",
  google: "Prijava Googleom nije uspjela.",
};

/** Razlozi koje vraca /auth/callback, prevedeni u nesto citljivo. */
const RAZLOZI: Record<string, string> = {
  bez_koda: "Nismo dobili kod za prijavu — preusmjeravanje je izgubilo parametre.",
  zamjena: "Kod je stigao, ali ga nismo mogli zamijeniti za sesiju.",
  access_denied: "Prijava je odbijena na Google strani.",
};

export default async function StranicaPrijave({
  searchParams,
}: PageProps<"/prijava">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tko je vec prijavljen nema sto traziti na ekranu prijave.
  if (user) redirect("/");

  const parametri = await searchParams;
  const kodGreske = typeof parametri.greska === "string" ? parametri.greska : null;
  const greskaIzUrla = kodGreske ? (PORUKE_GRESAKA[kodGreske] ?? PORUKE_GRESAKA.veza) : null;

  const razlog = typeof parametri.razlog === "string" ? parametri.razlog : null;
  const detalj = typeof parametri.detalj === "string" ? parametri.detalj : null;

  const metode = await dohvatiDostupneMetode();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Memorijalni termin</h1>
        <p className="mt-2 text-slate-600">Prijavi se da vidiš termine svoje grupe.</p>
      </header>

      {greskaIzUrla && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p className="font-medium">{greskaIzUrla}</p>

          {(razlog || detalj) && (
            <p className="mt-2 text-xs text-red-600">
              {razlog && (RAZLOZI[razlog] ?? `Razlog: ${razlog}`)}
              {detalj && <span className="mt-1 block font-mono break-all">{detalj}</span>}
            </p>
          )}
        </div>
      )}

      <ObrazacPrijave googleDostupan={metode.google} />

      <p className="mt-10 text-center text-xs text-slate-400">
        Prijavom pristaješ da spremamo tvoje ime, nadimak i email — samo za rad aplikacije.
      </p>
    </main>
  );
}
