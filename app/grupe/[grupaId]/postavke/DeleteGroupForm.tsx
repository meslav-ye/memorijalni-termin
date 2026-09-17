"use client";

import { SubmitButton } from "@/components/SubmitButton";
import { deleteGroup } from "./actions";

export function DeleteGroupForm({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  return (
    <form
      action={deleteGroup}
      onSubmit={(event) => {
        if (
          !confirm(
            `Obriši grupu „${groupName}“? Trajno se brišu svi termini, statistika i članovi.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <SubmitButton
        pendingLabel="Brišem…"
        className="flex h-12 w-full items-center justify-center rounded-lg border-2
                   border-red-600 bg-white text-sm font-semibold text-red-700
                   transition active:scale-[0.98] disabled:opacity-70"
      >
        Obriši grupu
      </SubmitButton>
    </form>
  );
}
