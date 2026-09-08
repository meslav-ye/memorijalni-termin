import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ObrazacProfila } from "./ObrazacProfila";
import { signOut } from "./actions";

export default async function StranicaProfila() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prijava");

  const { data: profil } = await supabase
    .from("profiles")
    .select("nickname, is_goalkeeper, full_name")
    .eq("id", user.id)
    .single();

  const prviPut = !profil?.nickname;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
      {/* Pri prvom postavljanju nadimka nema kamo natrag — vratar bi te
          ionako vratio ovamo dok nadimak ne postoji. */}
      {!prviPut && (
        <Link href="/" className="text-sm text-slate-500 underline underline-offset-4">
          ← Natrag
        </Link>
      )}

      <header className="mb-8 mt-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {prviPut ? "Još samo nadimak" : "Tvoj profil"}
        </h1>
        <p className="mt-2 text-slate-600">
          {prviPut
            ? "Prije nego kreneš, kako te zovu na terenu?"
            : user.email}
        </p>
      </header>

      <ObrazacProfila
        nadimak={profil?.nickname ?? ""}
        golman={profil?.is_goalkeeper ?? false}
      />

      {!prviPut && (
        <form action={signOut} className="mt-10 border-t border-slate-200 pt-6">
          <button
            type="submit"
            className="text-sm font-medium text-slate-500 underline underline-offset-4"
          >
            Odjavi se
          </button>
        </form>
      )}
    </main>
  );
}
