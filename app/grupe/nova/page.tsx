import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewGroupForm } from "./NewGroupForm";

export default async function NewGroupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prijava");

  // Without permission this screen does not open — otherwise the user would
  // fill the form and only learn at the end that they are not allowed.
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("can_create_groups")
    .eq("id", user.id)
    .maybeSingle();

  if (!myProfile?.can_create_groups) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
      <Link href="/grupe" className="text-sm text-slate-500 underline underline-offset-4">
        ← Natrag
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-2xl font-bold tracking-tight">Nova grupa</h1>
        <p className="mt-2 text-slate-600">
          Ti si njezin admin. Nakon toga dobiješ link koji šalješ ekipi.
        </p>
      </header>

      <NewGroupForm />
    </main>
  );
}
