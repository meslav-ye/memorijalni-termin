import { redirect } from "next/navigation";
import { SoftLink } from "@/components/ui/SoftLink";
import { softControlClassName } from "@/components/ui/softControl";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";
import { signOut } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prijava");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, is_goalkeeper, full_name")
    .eq("id", user.id)
    .single();

  const firstTime = !profile?.nickname;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
      {/* On first nickname setup there is nowhere to go back — the gate
          would send you here anyway until a nickname exists. */}
      {!firstTime && (
        <SoftLink href="/">← Natrag</SoftLink>
      )}

      <header className="mb-8 mt-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {firstTime ? "Još samo nadimak" : "Postavke profila"}
        </h1>
        <p className="mt-2 text-slate-600">
          {firstTime
            ? "Prije nego kreneš, kako te zovu na terenu?"
            : user.email}
        </p>
      </header>

      <ProfileForm
        nickname={profile?.nickname ?? ""}
        isGoalkeeper={profile?.is_goalkeeper ?? false}
      />

      {!firstTime && (
        <form action={signOut} className="mt-10 border-t border-slate-200 pt-6">
          <SubmitButton
            type="submit"
            pendingLabel="Odjavljujem…"
            className={softControlClassName}
          >
            Odjavi se
          </SubmitButton>
        </form>
      )}
    </main>
  );
}
