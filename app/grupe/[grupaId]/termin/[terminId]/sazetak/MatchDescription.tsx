import { updateMatchDescription } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { LinkifiedText } from "@/components/termin/LinkifiedText";

export function MatchDescription({
  grupaId,
  terminId,
  description,
  admin,
}: {
  grupaId: string;
  terminId: string;
  description: string | null;
  admin: boolean;
}) {
  const trimmed = description?.trim() || null;

  if (!admin) {
    if (!trimmed) return null;
    return (
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-wrap">
        <LinkifiedText text={trimmed} />
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
      <form action={updateMatchDescription} className="space-y-3">
        <input type="hidden" name="groupId" value={grupaId} />
        <input type="hidden" name="matchId" value={terminId} />
        <label htmlFor="opis" className="block text-sm font-medium text-slate-700">
          Opis
        </label>
        <textarea
          id="opis"
          name="opis"
          rows={3}
          maxLength={2000}
          defaultValue={trimmed ?? ""}
          placeholder="npr. Snimka: https://youtu.be/…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            URL-ovi postaju klikabilni nakon spremanja.
          </p>
          <SubmitButton pendingLabel="Spremam…">Spremi</SubmitButton>
        </div>
      </form>
      {trimmed && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-700 whitespace-pre-wrap">
          <LinkifiedText text={trimmed} />
        </p>
      )}
    </section>
  );
}
