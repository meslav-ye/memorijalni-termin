"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  defaultLeaderboardOrder,
  nextSortState,
  sortLeaderboardRows,
  type SortDir,
  type SortKey,
} from "@/lib/domain/leaderboard-sort";

export type LeaderboardTableRow = {
  userId: string;
  nickname: string;
  isGoalkeeper: boolean;
  goals: number;
  assists: number;
  ownGoals: number;
  matches: number;
  goalsPerMatch: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  rating: number;
};

type Props = {
  grupaId: string;
  rows: LeaderboardTableRow[];
};

function SortHeader({
  label,
  title,
  sortKey,
  activeKey,
  dir,
  align = "right",
  className = "",
  onSort,
}: {
  label: string;
  title?: string;
  sortKey: SortKey;
  activeKey: SortKey | null;
  dir: SortDir;
  align?: "left" | "right";
  className?: string;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const marker = active ? (dir === "desc" ? " ▼" : " ▲") : "";

  return (
    <th
      className={
        `${align === "left" ? "text-left" : "text-right"} font-semibold ` + className
      }
      title={title}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        data-no-loading
        onClick={() => onSort(sortKey)}
        className={
          "inline-flex w-full items-center gap-0.5 px-2 py-2 text-xs uppercase " +
          (align === "left" ? "justify-start px-3" : "justify-end") +
          " text-slate-500 transition hover:text-slate-800 " +
          (active ? "text-slate-800" : "")
        }
      >
        <span>{label}</span>
        <span className="inline-block w-3 text-[0.65rem] tabular-nums" aria-hidden>
          {marker.trim() || "\u00a0"}
        </span>
      </button>
    </th>
  );
}

export function LeaderboardTable({ grupaId, rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const ordered = useMemo(() => {
    if (!sortKey) return defaultLeaderboardOrder(rows);
    return sortLeaderboardRows(rows, sortKey, sortDir);
  }, [rows, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    const next = nextSortState(sortKey, sortDir, key);
    setSortKey(next.key);
    setSortDir(next.dir);
  };

  const pct = (x: number) => `${Math.round(x * 100)}%`;

  const rowClass = (rank: number) => {
    if (rank === 1) return "bg-amber-50"; // zlato
    if (rank === 2) return "bg-slate-100"; // srebro
    if (rank === 3) return "bg-orange-50"; // bronca
    return "";
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <SortHeader
              label="Igrač"
              sortKey="nickname"
              activeKey={sortKey}
              dir={sortDir}
              align="left"
              onSort={onSort}
            />
            <SortHeader
              label="G"
              title="Golovi"
              sortKey="goals"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="A"
              title="Asistencije"
              sortKey="assists"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="AG"
              title="Autogolovi"
              sortKey="ownGoals"
              activeKey={sortKey}
              dir={sortDir}
              className="hidden sm:table-cell"
              onSort={onSort}
            />
            <SortHeader
              label="U"
              title="Odigrane utakmice"
              sortKey="matches"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="G/U"
              title="Golova po utakmici"
              sortKey="goalsPerMatch"
              activeKey={sortKey}
              dir={sortDir}
              className="hidden sm:table-cell"
              onSort={onSort}
            />
            <SortHeader
              label="P-N-P"
              title="Pobjede-Neriješeno-Porazi"
              sortKey="record"
              activeKey={sortKey}
              dir={sortDir}
              className="hidden md:table-cell"
              onSort={onSort}
            />
            <SortHeader
              label="%"
              title="Postotak pobjeda"
              sortKey="winRate"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Rating"
              sortKey="rating"
              activeKey={sortKey}
              dir={sortDir}
              className="px-1"
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody>
          {ordered.map((r, index) => {
            const rank = index + 1;
            return (
              <tr
                key={r.userId}
                className={
                  "border-b border-slate-100 last:border-0 " + rowClass(rank)
                }
              >
                <td className="px-3 py-2">
                  <span className="inline-flex min-w-0 items-baseline gap-2">
                    <span
                      className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-slate-900"
                      aria-label={`Mjesto ${rank}`}
                    >
                      {rank}.
                    </span>
                    <Link
                      href={`/grupe/${grupaId}/igrac/${r.userId}?from=ljestvica`}
                      className="min-w-0 font-medium underline-offset-4 hover:underline"
                    >
                      {r.nickname}
                    </Link>
                    {r.isGoalkeeper && <span title="Igra golmana">🧤</span>}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">{r.goals}</td>
                <td className="px-2 py-2 text-right tabular-nums">{r.assists}</td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-400 sm:table-cell">
                  {r.ownGoals || ""}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-500">{r.matches}</td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-500 sm:table-cell">
                  {r.goalsPerMatch.toFixed(2)}
                </td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-500 md:table-cell">
                  {r.wins}-{r.draws}-{r.losses}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-500">
                  {pct(r.winRate)}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.rating}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
