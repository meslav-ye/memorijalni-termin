import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GumbZahtjev } from "./GumbZahtjev";

export default async function StranicaPridruzivanja({
  params,
}: PageProps<"/grupe/pridruzi/[kod]">) {
  const { kod } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/prijava?povratak=${encodeURIComponent(`/grupe/pridruzi/${kod}`)}`);

  // Onaj tko jos nije clan po RLS-u ne smije citati grupu — a mora vidjeti
  // barem njezin naziv da zna gdje se prijavljuje. Zato tajni kljuc, i to
  // iskljucivo za dohvat naziva.
  const admin = createAdminClient();
  const { data: grupa } = await admin
    .from("groups")
    .select("id, name")
    .eq("invite_code", kod)
    .maybeSingle();

  if (!grupa) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold">Pozivnica nije važeća</h1>
          <p className="mt-2 text-slate-600">
            Link je možda istekao ili je admin izdao novi. Zamoli ga za svježi.
          </p>
          <Link
            href="/grupe"
            className="mt-6 inline-block text-sm text-slate-500 underline underline-offset-4"
          >
            Idi na moje grupe
          </Link>
        </div>
      </main>
    );
  }

  const { data: clanstvo } = await admin
    .from("group_members")
    .select("status")
    .eq("group_id", grupa.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (clanstvo?.status === "active") redirect(`/grupe/${grupa.id}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Pozvan si u grupu</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{grupa.name}</h1>
      </div>

      <div className="mt-6">
        {clanstvo?.status === "pending" ? (
          <div className="rounded-lg border border-slate-200 bg-slate-100 p-4 text-center text-slate-600">
            Zahtjev je već poslan. Čeka se odobrenje admina.
          </div>
        ) : (
          <GumbZahtjev kod={kod} />
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Admin grupe mora odobriti tvoj zahtjev prije nego vidiš termine.
      </p>
    </main>
  );
}
