"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type GroupState = {
  error?: string;
  message?: string;
};

/** A season is a calendar year. Created lazily the first time it is needed. */
async function ensureSeason(groupId: string, year: number) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("seasons")
    .select("id")
    .eq("group_id", groupId)
    .eq("name", String(year))
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await admin
    .from("seasons")
    .insert({
      group_id: groupId,
      name: String(year),
      starts_on: `${year}-01-01`,
      ends_on: `${year}-12-31`,
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

export async function createGroup(
  _previous: GroupState,
  formData: FormData,
): Promise<GroupState> {
  const name = String(formData.get("naziv") ?? "").trim();
  const capacity = Number(formData.get("kvota") ?? 10);

  if (name.length < 2) return { error: "Naziv grupe mora imati barem 2 znaka." };
  if (name.length > 60) return { error: "Naziv grupe je predugačak." };
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 30) {
    return { error: "Broj igrača po terminu mora biti između 2 i 30." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nisi prijavljen." };

  // Creating a group requires explicit permission. Check before insert so the
  // user gets a clear explanation instead of a generic database error.
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("can_create_groups")
    .eq("id", user.id)
    .maybeSingle();

  if (!myProfile?.can_create_groups) {
    return {
      error:
        "Tvoj račun još nema dopuštenje za otvaranje grupa. Ako te je netko pozvao u postojeću grupu, otvori link pozivnice koji si dobio.",
    };
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, default_capacity: capacity, created_by: user.id })
    .select("id")
    .single();

  if (error || !group) {
    return { error: "Grupa nije kreirana. Pokušaj ponovno." };
  }

  // Founder immediately becomes active admin — otherwise nobody can approve
  // the first join request. Uses the "founder inserts as admin" RLS rule.
  const { error: membershipError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "admin",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (membershipError) {
    // A group with no admin is unusable — better to clean up.
    await createAdminClient().from("groups").delete().eq("id", group.id);
    return { error: "Grupa nije kreirana. Pokušaj ponovno." };
  }

  const admin = createAdminClient();
  await admin
    .from("player_ratings")
    .insert({ group_id: group.id, user_id: user.id });

  await ensureSeason(group.id, new Date().getFullYear());

  redirect(`/grupe/${group.id}`);
}

/**
 * First argument is bound via `.bind(null, code)` in the component, so the
 * remaining two match the signature useActionState expects: (state, formData).
 */
export async function requestJoin(
  invite_code: string,
  _previous: GroupState,
  _formData: FormData,
): Promise<GroupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/prijava?povratak=/grupe/pridruzi/${invite_code}`);

  // Look up the code with the service role: RLS does not let non-members
  // read the group, and without that they could not even request to join.
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id")
    .eq("invite_code", invite_code)
    .maybeSingle();

  if (!group) return { error: "Pozivnica nije važeća." };

  const { data: existing } = await admin
    .from("group_members")
    .select("status")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "active") redirect(`/grupe/${group.id}`);
  if (existing?.status === "pending") {
    return { message: "Zahtjev je već poslan. Čeka se odobrenje admina." };
  }

  const { error } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "member",
    status: "pending",
  });

  if (error) return { error: "Slanje zahtjeva nije uspjelo. Pokušaj ponovno." };

  revalidatePath("/grupe");
  return { message: "Zahtjev je poslan. Javit ćemo se kad te admin odobri." };
}
