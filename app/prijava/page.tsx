import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ObrazacPrijave } from "./ObrazacPrijave";

export default async function StranicaPrijave() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tko je vec prijavljen nema sto traziti na ekranu prijave.
  if (user) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Memorijalni termin</h1>
        <p className="mt-2 text-slate-600">
          Prijavi se da vidiš termine svoje grupe.
        </p>
      </header>

      <ObrazacPrijave />

      <p className="mt-10 text-center text-xs text-slate-400">
        Prijavom pristaješ da spremamo tvoje ime, nadimak i email — samo za rad aplikacije.
      </p>
    </main>
  );
}
