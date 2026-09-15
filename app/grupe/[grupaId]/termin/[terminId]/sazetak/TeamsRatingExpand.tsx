"use client";

import { useState } from "react";
import type { Team } from "@/lib/domain/types";
import { teamHeadingClass, teamPanelClass } from "@/lib/domain/team-colors";
import type { RatingBreakdownLine } from "@/lib/domain/rating-breakdown";

export type ExpandPlayer = {
  lineupId: string;
  nickname: string;
  isGuest: boolean;
  team: Team;
  goals: number;
  assists: number;
  ownGoals: number;
  delta: number | null;
  /** Null when not expandable (guest / no rating history). */
  breakdown: RatingBreakdownLine[] | null;
};

export function TeamsRatingExpand({
  labelA,
  labelB,
  players,
  winner,
}: {
  labelA: string;
  labelB: string;
  players: ExpandPlayer[];
  winner: Team | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="mt-4 flex gap-3">
      <TeamColumn
        side="A"
        label={labelA}
        players={players}
        winner={winner}
        expandedId={expandedId}
        onToggle={toggle}
      />
      <TeamColumn
        side="B"
        label={labelB}
        players={players}
        winner={winner}
        expandedId={expandedId}
        onToggle={toggle}
      />
    </div>
  );
}

function TeamColumn({
  side,
  label,
  players,
  winner,
  expandedId,
  onToggle,
}: {
  side: Team;
  label: string;
  players: ExpandPlayer[];
  winner: Team | null;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  const members = players.filter((i) => i.team === side);
  const won = winner === side;
  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <div className="flex-1">
      <h3 className={"mb-2 truncate font-bold " + teamHeadingClass(side)}>
        {label}
        {won && <span className="ml-2 text-sm font-semibold text-emerald-700">✓</span>}
      </h3>
      <ul className="space-y-1">
        {members.map((i) => {
          const expandable = i.breakdown !== null;
          const open = expandable && expandedId === i.lineupId;

          const body = (
            <>
              <p className="flex items-start gap-1 break-words font-medium leading-snug">
                <span className="min-w-0 flex-1">
                  {i.nickname}
                  {i.isGuest && (
                    <span className="ml-1 text-xs font-normal uppercase text-slate-400">
                      · gost
                    </span>
                  )}
                </span>
                {expandable && (
                  <span
                    aria-hidden
                    className={
                      "shrink-0 text-slate-400 transition " + (open ? "rotate-180" : "")
                    }
                  >
                    ▾
                  </span>
                )}
              </p>
              {(i.goals > 0 ||
                i.assists > 0 ||
                i.ownGoals > 0 ||
                (!i.isGuest && i.delta !== null)) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {i.goals > 0 && <span className="text-slate-500">⚽{i.goals}</span>}
                  {i.assists > 0 && <span className="text-slate-400">🅰{i.assists}</span>}
                  {i.ownGoals > 0 && <span className="text-red-500">🥅{i.ownGoals}</span>}
                  {i.delta !== null && (
                    <span
                      className={
                        "ml-auto text-xs font-semibold tabular-nums " +
                        (i.delta > 0
                          ? "text-emerald-700"
                          : i.delta < 0
                            ? "text-red-600"
                            : "text-slate-400")
                      }
                    >
                      {fmt(i.delta)}
                    </span>
                  )}
                </div>
              )}
              {open && i.breakdown && (
                <ul className="mt-2 space-y-1 border-t border-black/10 pt-2 text-xs text-slate-700">
                  {i.breakdown.map((line) => (
                    <li
                      key={line.label}
                      className={
                        "flex justify-between gap-2 tabular-nums " +
                        (line.label === "Ukupno" ? "font-semibold" : "")
                      }
                    >
                      <span>{line.label}</span>
                      <span
                        className={
                          line.points > 0
                            ? "text-emerald-700"
                            : line.points < 0
                              ? "text-red-600"
                              : "text-slate-500"
                        }
                      >
                        {fmt(line.points)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          );

          return (
            <li key={i.lineupId}>
              {expandable ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onToggle(i.lineupId)}
                  className={
                    "w-full rounded-lg border px-2.5 py-2 text-left text-sm transition active:scale-[0.99] " +
                    teamPanelClass(side)
                  }
                >
                  {body}
                </button>
              ) : (
                <div
                  className={
                    "rounded-lg border px-2.5 py-2 text-sm " + teamPanelClass(side)
                  }
                >
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
