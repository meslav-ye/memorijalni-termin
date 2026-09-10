"use client";

import { useActionState } from "react";
import { saveMatchActivity, type ActivityFormState } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { softControlClassName } from "@/components/ui/softControl";

type ActivityDefaults = {
  distanceKm: number | null;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
};

type ActivityPlayer = {
  userId: string;
  nickname: string;
  distanceKm: number | null;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
};

const EMPTY: ActivityFormState = {};

function fmtField(n: number | null): string {
  return n === null ? "—" : String(n);
}

function formatActivityLine(p: ActivityPlayer): string {
  return `${fmtField(p.distanceKm)} km · max ${fmtField(p.maxSpeedKmh)} · avg ${fmtField(p.avgSpeedKmh)}`;
}

function defaultInput(n: number | null): string {
  return n === null ? "" : String(n);
}

export function ActivityForm({
  grupaId,
  terminId,
  canEdit,
  defaults,
  players,
}: {
  grupaId: string;
  terminId: string;
  canEdit: boolean;
  defaults: ActivityDefaults | null;
  players: ActivityPlayer[];
}) {
  const [state, action] = useActionState(saveMatchActivity, EMPTY);

  return (
    <div className="mt-8 space-y-6">
      {canEdit && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Moji trkački podaci
          </h3>
          <form action={action} className="mt-3 space-y-3">
            <input type="hidden" name="groupId" value={grupaId} />
            <input type="hidden" name="matchId" value={terminId} />

            <div className="space-y-2">
              <label htmlFor="distance" className="block text-sm font-medium text-slate-700">
                Distanca (km)
              </label>
              <input
                id="distance"
                name="distance"
                inputMode="decimal"
                defaultValue={defaultInput(defaults?.distanceKm ?? null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="maxSpeed" className="block text-sm font-medium text-slate-700">
                Max brzina (km/h)
              </label>
              <input
                id="maxSpeed"
                name="maxSpeed"
                inputMode="decimal"
                defaultValue={defaultInput(defaults?.maxSpeedKmh ?? null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="avgSpeed" className="block text-sm font-medium text-slate-700">
                Prosj. brzina (km/h)
              </label>
              <input
                id="avgSpeed"
                name="avgSpeed"
                inputMode="decimal"
                defaultValue={defaultInput(defaults?.avgSpeedKmh ?? null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="min-w-0 flex-1">
                {state.error && (
                  <p role="alert" className="text-sm font-medium text-red-600">
                    {state.error}
                  </p>
                )}
                {state.message && !state.error && (
                  <p role="status" className="text-sm font-medium text-emerald-700">
                    {state.message}
                  </p>
                )}
              </div>
              <SubmitButton pendingLabel="Spremam…" className={softControlClassName}>
                Spremi
              </SubmitButton>
            </div>
          </form>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Unosi ekipe
        </h3>
        {players.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            Nema igrača u ekipi.
          </p>
        ) : (
          <ul className="space-y-1">
            {players.map((p) => (
              <li
                key={p.userId}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <p className="font-medium text-slate-800">{p.nickname}</p>
                <p className="mt-0.5 tabular-nums text-slate-500">
                  {formatActivityLine(p)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
