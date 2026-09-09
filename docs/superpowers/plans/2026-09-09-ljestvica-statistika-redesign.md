# Ljestvica & Statistika Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Ljestvica and Statistika with shared season chrome, a “Ti” strip, you-highlights, touch-friendly column legend, linked Vodeći cards, and monoline football icons replacing emoji — same metrics.

**Architecture:** Extract pure season-active helpers (unit-tested) and shared UI (`SeasonBar`, `YouStrip`, `StatsIcons`). Both pages keep `getLeaderboard` as the data source; pass `currentUserId` into table/lists for highlight. No Elo or loader contract changes.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4 (`marka` tokens), Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-09-ljestvica-statistika-redesign-design.md`](../specs/2026-09-09-ljestvica-statistika-redesign-design.md)

---

## File map

| File | Role |
|---|---|
| Create `lib/domain/season-chips.ts` | Pure helpers: which season chip is active |
| Create `tests/unit/season-chips.test.ts` | TDD for UX-13 |
| Create `components/brand/StatsIcons.tsx` | Monoline icons (scorer, assist, ga, rating, attendance, keeper) |
| Create `components/group/SeasonBar.tsx` | Season chips + Sve vrijeme |
| Create `components/group/YouStrip.tsx` | Compact “Ti” row |
| Create `components/group/StatsLeaderCard.tsx` | Vodeći card with icon + linked name |
| Modify `app/grupe/[grupaId]/ljestvica/page.tsx` | Shared chrome, legend, Dolaznost highlight |
| Modify `app/grupe/[grupaId]/ljestvica/LeaderboardTable.tsx` | `currentUserId`, keeper icon, optional legend prop or sibling |
| Modify `app/grupe/[grupaId]/statistika/page.tsx` | Shared chrome, new cards, icons, links |
| Modify `docs/ux-zadaci.md` | Mark UX-13/22/23/24 done only after shipped (optional note in PR) |

---

### Task 1: Season chip active helper (TDD) — UX-13

**Files:**
- Create: `lib/domain/season-chips.ts`
- Test: `tests/unit/season-chips.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { isSeasonChipActive } from "@/lib/domain/season-chips";

describe("isSeasonChipActive", () => {
  const latest = "season-new";

  it("marks only the latest season when query has no sezona", () => {
    expect(
      isSeasonChipActive({ chipId: "season-new", requestedSeason: null, latestSeasonId: latest }),
    ).toBe(true);
    expect(
      isSeasonChipActive({ chipId: "season-old", requestedSeason: null, latestSeasonId: latest }),
    ).toBe(false);
    expect(
      isSeasonChipActive({ chipId: "sve", requestedSeason: null, latestSeasonId: latest }),
    ).toBe(false);
  });

  it("marks the requested season id", () => {
    expect(
      isSeasonChipActive({
        chipId: "season-old",
        requestedSeason: "season-old",
        latestSeasonId: latest,
      }),
    ).toBe(true);
    expect(
      isSeasonChipActive({
        chipId: "season-new",
        requestedSeason: "season-old",
        latestSeasonId: latest,
      }),
    ).toBe(false);
  });

  it("marks sve when requestedSeason is sve", () => {
    expect(
      isSeasonChipActive({ chipId: "sve", requestedSeason: "sve", latestSeasonId: latest }),
    ).toBe(true);
    expect(
      isSeasonChipActive({ chipId: "season-new", requestedSeason: "sve", latestSeasonId: latest }),
    ).toBe(false);
  });

  it("marks nothing for a season chip when there is no latest and no request", () => {
    expect(
      isSeasonChipActive({ chipId: "season-x", requestedSeason: null, latestSeasonId: null }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm exec vitest run tests/unit/season-chips.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
/**
 * Which season chip should look selected.
 * Default view (no ?sezona=) shows the newest season — only that chip is active.
 */
export function isSeasonChipActive(opts: {
  /** Season uuid, or `"sve"` for all-time chip */
  chipId: string;
  /** Raw `?sezona=` value, or null if absent */
  requestedSeason: string | null;
  latestSeasonId: string | null;
}): boolean {
  const { chipId, requestedSeason, latestSeasonId } = opts;

  if (chipId === "sve") return requestedSeason === "sve";

  if (requestedSeason === "sve") return false;

  if (requestedSeason != null) return chipId === requestedSeason;

  // No query → newest season is the implicit selection
  return latestSeasonId != null && chipId === latestSeasonId;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm exec vitest run tests/unit/season-chips.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/domain/season-chips.ts tests/unit/season-chips.test.ts
git commit -m "feat: fix season chip active state helper"
```

---

### Task 2: StatsIcons monoline set

**Files:**
- Create: `components/brand/StatsIcons.tsx`

- [ ] **Step 1: Create icon components**

Each icon: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.75}`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `className` prop, `aria-hidden` by default.

Export:

```tsx
type IconProps = { className?: string };

export function IconScorer({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 9V4M12 4l-2 2M12 4l2 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconAssist({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="6" cy="12" r="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12c2-4 6-4 8 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconGoalsAssists({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="12" r="5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M17 8v8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconRating({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 18V11M12 18V6M18 18v-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconAttendance({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 9h16M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconKeeper({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* Simple glove outline */}
      <path
        d="M8 11V7.5a1.5 1.5 0 0 1 3 0V11M11 11V6.5a1.5 1.5 0 0 1 3 0V11M14 11V8a1.5 1.5 0 0 1 3 0v5.5c0 3-2 5.5-5 5.5h-1c-2.5 0-4-1.5-4-4V11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

Tune paths visually in Story-less check: render once on a throwaway page or in browser during Task 5 — geometry may be adjusted slightly but keep monoline / `currentColor`.

- [ ] **Step 2: Commit**

```bash
git add components/brand/StatsIcons.tsx
git commit -m "feat(brand): add monoline stats icons"
```

---

### Task 3: SeasonBar + YouStrip

**Files:**
- Create: `components/group/SeasonBar.tsx`
- Create: `components/group/YouStrip.tsx`

- [ ] **Step 1: `SeasonBar.tsx`**

```tsx
import Link from "next/link";
import { isSeasonChipActive } from "@/lib/domain/season-chips";

type Season = { id: string; name: string };

type Props = {
  grupaId: string;
  /** Base path without query: `/grupe/${id}/ljestvica` or `.../statistika` */
  basePath: string;
  seasons: Season[];
  requestedSeason: string | null;
  latestSeasonId: string | null;
};

export function SeasonBar({
  grupaId: _grupaId,
  basePath,
  seasons,
  requestedSeason,
  latestSeasonId,
}: Props) {
  const chipClass = (active: boolean) =>
    "h-9 rounded-lg border px-3 text-sm font-medium leading-9 transition " +
    (active
      ? "border-marka bg-marka text-white"
      : "border-slate-300 bg-white text-slate-700");

  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((s) => {
        const active = isSeasonChipActive({
          chipId: s.id,
          requestedSeason,
          latestSeasonId,
        });
        return (
          <Link
            key={s.id}
            href={`${basePath}?sezona=${s.id}`}
            className={chipClass(active)}
            aria-current={active ? "page" : undefined}
          >
            {s.name}
          </Link>
        );
      })}
      <Link
        href={`${basePath}?sezona=sve`}
        className={chipClass(
          isSeasonChipActive({
            chipId: "sve",
            requestedSeason,
            latestSeasonId,
          }),
        )}
        aria-current={requestedSeason === "sve" ? "page" : undefined}
      >
        Sve vrijeme
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: `YouStrip.tsx`**

```tsx
import Link from "next/link";

type Props = {
  grupaId: string;
  userId: string;
  nickname: string;
  /** e.g. "3. · 1042 Rtg" or "5 G · 2 A · 8 U" */
  statsLine: string;
};

export function YouStrip({ grupaId, userId, nickname, statsLine }: Props) {
  return (
    <Link
      href={`/grupe/${grupaId}/igrac/${userId}`}
      className="mt-3 flex items-center gap-3 rounded-lg border border-marka/25 bg-marka/5 px-3 py-2.5 transition active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-marka">
          {nickname}
          <span className="ml-2 text-xs font-bold uppercase tracking-wide text-marka-svijetla">
            Ti
          </span>
        </p>
        <p className="text-xs tabular-nums text-slate-600">{statsLine}</p>
      </div>
      <span className="text-slate-400" aria-hidden>
        →
      </span>
    </Link>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/group/SeasonBar.tsx components/group/YouStrip.tsx
git commit -m "feat(group): add SeasonBar and YouStrip"
```

---

### Task 4: Wire Ljestvica — chrome, legend, you highlight, keeper icon

**Files:**
- Modify: `app/grupe/[grupaId]/ljestvica/page.tsx`
- Modify: `app/grupe/[grupaId]/ljestvica/LeaderboardTable.tsx`

- [ ] **Step 1: Update `LeaderboardTable` props**

Add `currentUserId?: string | null`.

In the row map:

- Row class: if `r.userId === currentUserId`, add `bg-marka/5` (keep existing top-3 tint unless conflict — prefer you-highlight over top-3 when both).
- After nickname, if current user: `<span className="ml-1 text-[0.65rem] font-bold uppercase text-marka-svijetla">Ti</span>`
- Replace `🧤` with `<IconKeeper className="inline-block h-3.5 w-3.5 text-marka" />` (import from StatsIcons).

- [ ] **Step 2: Refactor `ljestvica/page.tsx`**

1. Import `SeasonBar`, `YouStrip`, `isSeasonChipActive` not needed on page if SeasonBar owns it.
2. Compute `latestSeasonId` once via existing `latestSeason(grupaId)` (already used as `seasonToShow` default).
3. Replace inline season links with:

```tsx
<SeasonBar
  grupaId={grupaId}
  basePath={`/grupe/${grupaId}/ljestvica`}
  seasons={seasons}
  requestedSeason={requestedSeason}
  latestSeasonId={await latestSeason(grupaId) /* or reuse variable */}
/>
```

Avoid double `latestSeason` fetch: already have `seasonToShow`; also load `latest = await latestSeason(...)` once into a const used for both `seasonToShow` default and SeasonBar.

4. Keep context line (matchesPlayed banner).
5. Build `me = rows.find((r) => r.userId === user.id)`.
6. If `me` and `matchesPlayed`-independent (spec: show if row exists):  

```tsx
{me && (
  <YouStrip
    grupaId={grupaId}
    userId={me.userId}
    nickname={me.nickname}
    statsLine={`${/* 1-based rank in default order */} · ${Math.round(me.rating)} Rtg`}
  />
)}
```

Rank: index in `defaultLeaderboardOrder` / current default sort of `rows` as returned by `getLeaderboard` (already rating-sorted) — `rows.findIndex + 1`.

7. Legend above table:

```tsx
<p className="mb-2 text-xs text-slate-500">
  G golovi · A asistencije · U utakmice · % pobjede · Rtg Elo
</p>
```

8. `<LeaderboardTable … currentUserId={user.id} />`
9. Dolaznost `<li>`: if `r.userId === user.id`, add `border-marka/30 bg-marka/5` and a small “Ti” label; link nickname optional (nice-to-have — skip unless easy).

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/grupe/[grupaId]/ljestvica/page.tsx app/grupe/[grupaId]/ljestvica/LeaderboardTable.tsx
git commit -m "feat(ljestvica): shared chrome, legend, and you highlight"
```

---

### Task 5: Wire Statistika — chrome, icons, linked leaders

**Files:**
- Create: `components/group/StatsLeaderCard.tsx`
- Modify: `app/grupe/[grupaId]/statistika/page.tsx`

- [ ] **Step 1: `StatsLeaderCard.tsx`**

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  value: string;
  who: string;
  /** When set, nickname links to player page */
  href?: string | null;
  suffix?: string;
};

export function StatsLeaderCard({ icon, title, value, who, href, suffix }: Props) {
  const empty = who === "";

  const whoEl = empty ? (
    <span className="text-slate-400">još nitko</span>
  ) : href ? (
    <Link href={href} className="font-medium text-marka underline-offset-2 hover:underline">
      {who}
    </Link>
  ) : (
    <span className="font-medium text-slate-700">{who}</span>
  );

  return (
    <div
      className={
        "rounded-lg border p-4 " +
        (empty ? "border-dashed border-slate-300 bg-white" : "border-slate-200 bg-white")
      }
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-marka [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {title}
      </p>
      <p
        className={
          "mt-2 text-2xl font-bold tabular-nums " + (empty ? "text-slate-300" : "text-slate-900")
        }
      >
        {value}
        {suffix && !empty && (
          <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span>
        )}
      </p>
      <p className="mt-1 text-sm">{whoEl}</p>
    </div>
  );
}
```

- [ ] **Step 2: Update `leader()` helper to return `userId`**

```ts
function leader(
  rows: LeaderboardRow[],
  key: (r: LeaderboardRow) => number,
): { userId: string; nickname: string; value: number } | null {
  const best = [...rows].sort(
    (a, b) => key(b) - key(a) || a.nickname.localeCompare(b.nickname, "hr"),
  )[0];
  if (!best || key(best) <= 0) return null;
  return { userId: best.userId, nickname: best.nickname, value: key(best) };
}
```

Update `bestKeeperByGoalsAgainst` consumers: if it only returns nickname, resolve `userId` from rows by nickname or extend keeper helper in this page by finding the row.

Check `lib/domain/keepers.ts` — if return type has `userId`, use it; else:

```ts
const topKeeperRow = topKeeper
  ? rows.find((r) => r.nickname === topKeeper.nickname) // prefer match by userId if available
  : null;
```

Prefer extending local find: `rows` already have stats — re-find keeper leader with full row if needed.

- [ ] **Step 3: Replace season UI with SeasonBar; add YouStrip**

Same pattern as Ljestvica. Stats line for me: `${me.goals} G · ${me.assists} A · ${me.matches} U`.

- [ ] **Step 4: Replace `LeaderCard` usages with `StatsLeaderCard`**

Map icons:

| Title | Icon |
|---|---|
| Najbolji strijelac | `<IconScorer />` |
| Asistencije | `<IconAssist />` |
| Golovi + asistencije | `<IconGoalsAssists />` |
| Rating | `<IconRating />` |
| Dolaznost | `<IconAttendance />` |
| Golman (GA/utakmica) | `<IconKeeper />` |

`href={top ? `/grupe/${grupaId}/igrac/${top.userId}` : null}`  
`who={top?.nickname ?? ""}`

Remove emoji from section headings (Rekordi / Golmani). Golmani `<h3>`:

```tsx
<h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500">
  <IconKeeper className="h-4 w-4 text-marka" />
  Golmani
</h3>
```

Highlight keeper list row when `r.userId === user.id`.

For Rekordi cards that mirror scorer/GA/etc., pass the matching icon into whatever record UI exists (read current page — reuse StatsLeaderCard or add icon to existing record rows).

- [ ] **Step 5: Quiet Ukupno**

Reduce heavy card chrome if present: prefer simple grid of label + big number with `border-l-2 border-marka` accent instead of four equal noisy cards — keep same four numbers.

- [ ] **Step 6: Typecheck + tests**

Run: `pnpm typecheck && pnpm test`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/group/StatsLeaderCard.tsx app/grupe/[grupaId]/statistika/page.tsx
git commit -m "feat(statistika): icons, linked leaders, and shared chrome"
```

---

### Task 6: Definition of done + UX backlog note

**Files:**
- Modify: `docs/ux-zadaci.md` (optional — strike or note UX-13/22/23/24 as covered by this redesign once on production; until then leave items with pointer to this plan)

- [ ] **Step 1: Manual checklist**

1. `/grupe/.../ljestvica` with multiple seasons, no query → only newest chip selected  
2. `?sezona=sve` → only Sve vrijeme selected  
3. Ti strip appears for yourself; row highlighted in table + Dolaznost  
4. Legend visible without hover  
5. Statistika Vodeći: icons present; names navigate to igrač  
6. No 🧤 / section emoji left  

- [ ] **Step 2: Final verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`

- [ ] **Step 3: Commit docs only if you edited ux-zadaci**

```bash
git add docs/ux-zadaci.md
git commit -m "docs: note UX-13/22/23/24 covered by stats redesign"
```

---

## Spec coverage

| Spec item | Task |
|---|---|
| Season chip UX-13 | 1, 3, 4, 5 |
| Ti strip | 3, 4, 5 |
| Legend UX-22 | 4 |
| Table/Dolaznost you UX-24 | 4 |
| Linked Vodeći UX-23 | 5 |
| Monoline icons | 2, 4, 5 |
| Shared season component | 3 |
| Same metrics / getLeaderboard | 4, 5 (no loader change) |
| Quiet Ukupno | 5 |

---

## Out of scope

- New metrics, Elo changes, merging tabs  
- Live screen / other tabs  
- Dark mode / full app redesign  
