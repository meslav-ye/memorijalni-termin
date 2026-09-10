# Manual Match Activity Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each lineup player self-enter distance / max / avg speed on a finished termin; show season totals under **Najbolji (ukupno)**, single-termin peaks under **Rekordi**, and a km-only **Trčanje** list on Ljestvica.

**Architecture:** Store rows in `match_activity` (one per match+user). Pure domain helpers parse/validate and aggregate. `getLeaderboard` loads activities for the season window (admin client, same cache tag) and returns distance totals + activity records. Sažetak uses a server action + client form; Statistika/Ljestvica consume the extended leaderboard payload.

**Tech Stack:** Next.js 16, Supabase (Postgres + RLS), TypeScript, Vitest, existing `StatsLeaderCard` / `SeasonBar` / `leaderboardTag`.

**Spec:** `docs/superpowers/specs/2026-09-10-manual-activity-stats-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `supabase/migrations/20260910120000_match_activity.sql` | Table + RLS |
| `lib/database.types.ts` | Generated / updated types for `match_activity` |
| `lib/domain/activity.ts` | Parse, validate, sum distance, single-termin records |
| `tests/unit/activity.test.ts` | Unit tests for domain |
| `lib/data/leaderboard.ts` | Fetch activities; extend return; wire records; bump cache key |
| `app/grupe/[grupaId]/termin/actions.ts` | `saveMatchActivity` server action |
| `app/grupe/.../sazetak/ActivityForm.tsx` | Client form + team read-only list |
| `app/grupe/.../sazetak/page.tsx` | Load activity rows; render form when eligible |
| `components/brand/statsArt.ts` | `distance`, `maxSpeed`, `avgSpeed` paths |
| `app/grupe/.../statistika/page.tsx` | Rename section; km leader; 3 record cards |
| `app/grupe/.../ljestvica/page.tsx` | Trčanje list before Dolaznost |
| `docs/todo.md` | Point Strava idea at shipped manual entry (optional note) |

Art PNGs already exist under `public/brand/stats/`.

---

### Task 1: Domain — parse & validate (TDD)

**Files:**
- Create: `lib/domain/activity.ts`
- Create: `tests/unit/activity.test.ts`

- [ ] **Step 1: Write failing tests for parse/validate**

```ts
import { describe, expect, it } from "vitest";
import {
  parseActivityFields,
  validateActivityFields,
  type ActivityFields,
} from "@/lib/domain/activity";

describe("parseActivityFields", () => {
  it("parses comma decimals and empty as null", () => {
    expect(
      parseActivityFields({ distance: "6,2", maxSpeed: "", avgSpeed: "8.1" }),
    ).toEqual({ distanceKm: 6.2, maxSpeedKmh: null, avgSpeedKmh: 8.1 });
  });

  it("returns error token for non-numeric", () => {
    expect(parseActivityFields({ distance: "abc", maxSpeed: "", avgSpeed: "" })).toEqual({
      error: "Neispravan broj.",
    });
  });
});

describe("validateActivityFields", () => {
  it("allows partial fields", () => {
    expect(
      validateActivityFields({ distanceKm: 5, maxSpeedKmh: null, avgSpeedKmh: null }),
    ).toBeNull();
  });

  it("rejects avg > max when both set", () => {
    expect(
      validateActivityFields({ distanceKm: null, maxSpeedKmh: 10, avgSpeedKmh: 12 }),
    ).toMatch(/prosječna/i);
  });

  it("rejects over limit distance", () => {
    expect(
      validateActivityFields({ distanceKm: 51, maxSpeedKmh: null, avgSpeedKmh: null }),
    ).toMatch(/distanca/i);
  });

  it("treats all-null as clear (valid)", () => {
    expect(
      validateActivityFields({ distanceKm: null, maxSpeedKmh: null, avgSpeedKmh: null }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm test tests/unit/activity.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement parse/validate**

```ts
// lib/domain/activity.ts
export type ActivityFields = {
  distanceKm: number | null;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
};

const DISTANCE_MAX = 50;
const MAX_SPEED_MAX = 50;
const AVG_SPEED_MAX = 40;

function parseOne(raw: string): number | null | "bad" {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return "bad";
  return n;
}

export function parseActivityFields(input: {
  distance: string;
  maxSpeed: string;
  avgSpeed: string;
}): ActivityFields | { error: string } {
  const distanceKm = parseOne(input.distance);
  const maxSpeedKmh = parseOne(input.maxSpeed);
  const avgSpeedKmh = parseOne(input.avgSpeed);
  if (distanceKm === "bad" || maxSpeedKmh === "bad" || avgSpeedKmh === "bad") {
    return { error: "Neispravan broj." };
  }
  return { distanceKm, maxSpeedKmh, avgSpeedKmh };
}

export function validateActivityFields(f: ActivityFields): string | null {
  const check = (n: number | null, max: number, label: string) => {
    if (n === null) return null;
    if (n < 0) return `${label} ne smije biti negativna.`;
    if (n > max) return `${label} je nerealna (max ${max}).`;
    return null;
  };
  return (
    check(f.distanceKm, DISTANCE_MAX, "Distanca") ||
    check(f.maxSpeedKmh, MAX_SPEED_MAX, "Max brzina") ||
    check(f.avgSpeedKmh, AVG_SPEED_MAX, "Prosječna brzina") ||
    (f.maxSpeedKmh !== null &&
    f.avgSpeedKmh !== null &&
    f.avgSpeedKmh > f.maxSpeedKmh
      ? "Prosječna brzina ne smije biti veća od max brzine."
      : null)
  );
}

export function isEmptyActivity(f: ActivityFields): boolean {
  return f.distanceKm === null && f.maxSpeedKmh === null && f.avgSpeedKmh === null;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/unit/activity.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/domain/activity.ts tests/unit/activity.test.ts
git commit -m "feat(activity): parse and validate manual match activity fields"
```

---

### Task 2: Domain — sum distance + single-termin records (TDD)

**Files:**
- Modify: `lib/domain/activity.ts`
- Modify: `tests/unit/activity.test.ts`

- [ ] **Step 1: Write failing aggregation tests**

```ts
import {
  sumDistanceByUser,
  bestDistanceInSingleTermin,
  bestMaxSpeedInSingleTermin,
  bestAvgSpeedInSingleTermin,
  type ActivityEntry,
} from "@/lib/domain/activity";

const entries: ActivityEntry[] = [
  {
    matchId: "m1",
    userId: "ana",
    distanceKm: 6,
    maxSpeedKmh: 28,
    avgSpeedKmh: 8,
    startsAt: "2026-03-01T18:00:00Z",
  },
  {
    matchId: "m2",
    userId: "ana",
    distanceKm: 7,
    maxSpeedKmh: 25,
    avgSpeedKmh: 9.5,
    startsAt: "2026-03-08T18:00:00Z",
  },
  {
    matchId: "m2",
    userId: "bruno",
    distanceKm: 8.4,
    maxSpeedKmh: 31.2,
    avgSpeedKmh: 7,
    startsAt: "2026-03-08T18:00:00Z",
  },
];

describe("sumDistanceByUser", () => {
  it("sums distance and skips nulls", () => {
    expect(sumDistanceByUser(entries)).toEqual(
      expect.arrayContaining([
        { userId: "ana", distanceKm: 13 },
        { userId: "bruno", distanceKm: 8.4 },
      ]),
    );
  });
});

describe("single-termin records", () => {
  it("best distance is bruno 8.4 on m2", () => {
    expect(bestDistanceInSingleTermin(entries)).toEqual({
      value: 8.4,
      userId: "bruno",
      startsAt: "2026-03-08T18:00:00Z",
    });
  });

  it("best max speed is bruno 31.2", () => {
    expect(bestMaxSpeedInSingleTermin(entries)?.value).toBe(31.2);
  });

  it("best avg speed is ana 9.5", () => {
    expect(bestAvgSpeedInSingleTermin(entries)?.value).toBe(9.5);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement aggregations**

```ts
export type ActivityEntry = {
  matchId: string;
  userId: string;
  distanceKm: number | null;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
  startsAt: string | null;
};

export type ActivityRecord = {
  value: number;
  userId: string;
  startsAt: string | null;
};

export function sumDistanceByUser(
  entries: ActivityEntry[],
): { userId: string; distanceKm: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.distanceKm === null) continue;
    map.set(e.userId, (map.get(e.userId) ?? 0) + e.distanceKm);
  }
  return [...map.entries()].map(([userId, distanceKm]) => ({
    userId,
    distanceKm: Math.round(distanceKm * 100) / 100,
  }));
}

function bestBy(
  entries: ActivityEntry[],
  pick: (e: ActivityEntry) => number | null,
): ActivityRecord | null {
  let best: ActivityRecord | null = null;
  for (const e of entries) {
    const v = pick(e);
    if (v === null) continue;
    if (!best || v > best.value) {
      best = { value: v, userId: e.userId, startsAt: e.startsAt };
    }
  }
  return best;
}

export const bestDistanceInSingleTermin = (entries: ActivityEntry[]) =>
  bestBy(entries, (e) => e.distanceKm);
export const bestMaxSpeedInSingleTermin = (entries: ActivityEntry[]) =>
  bestBy(entries, (e) => e.maxSpeedKmh);
export const bestAvgSpeedInSingleTermin = (entries: ActivityEntry[]) =>
  bestBy(entries, (e) => e.avgSpeedKmh);
```

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/domain/activity.ts tests/unit/activity.test.ts
git commit -m "feat(activity): sum distance and single-termin activity records"
```

---

### Task 3: Migration + DB types

**Files:**
- Create: `supabase/migrations/20260910120000_match_activity.sql`
- Modify: `lib/database.types.ts` (via `pnpm db:types` after local reset, or hand-edit if remote-only)

- [ ] **Step 1: Write migration**

```sql
-- Manual per-termin running stats (self-entered). One row per player per termin.

create table match_activity (
  match_id         uuid not null references matches on delete cascade,
  user_id          uuid not null references profiles on delete cascade,
  distance_km      numeric,
  max_speed_kmh    numeric,
  avg_speed_kmh    numeric,
  updated_at       timestamptz not null default now(),
  primary key (match_id, user_id),
  constraint match_activity_distance_nonneg check (distance_km is null or distance_km >= 0),
  constraint match_activity_max_nonneg check (max_speed_kmh is null or max_speed_kmh >= 0),
  constraint match_activity_avg_nonneg check (avg_speed_kmh is null or avg_speed_kmh >= 0)
);

create index match_activity_match_idx on match_activity (match_id);
create index match_activity_user_idx on match_activity (user_id);

alter table match_activity enable row level security;

-- Group members can read activity for matches in their group.
create policy "aktivnost: citaj clanovi"
  on match_activity for select
  using (is_group_member(match_group(match_id)));

-- Only self; only finished match; only if in any game lineup for that termin.
create policy "aktivnost: upsert svoj"
  on match_activity for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = match_id and m.status = 'zavrsen'
    )
    and exists (
      select 1 from match_lineup l
      where l.match_id = match_activity.match_id
        and l.user_id = auth.uid()
    )
  );

create policy "aktivnost: update svoj"
  on match_activity for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = match_id and m.status = 'zavrsen'
    )
    and exists (
      select 1 from match_lineup l
      where l.match_id = match_activity.match_id
        and l.user_id = auth.uid()
    )
  );

create policy "aktivnost: delete svoj"
  on match_activity for delete
  using (user_id = auth.uid());
```

- [ ] **Step 2: Apply locally and regenerate types**

Run: `pnpm db:reset`  
(or `supabase db reset && pnpm db:types` if `db:reset` unavailable)

Expected: migration applies; `lib/database.types.ts` contains `match_activity`.

If you cannot reset: hand-add the `match_activity` table block to `lib/database.types.ts` mirroring other tables (`Row` / `Insert` / `Update` / FKs).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260910120000_match_activity.sql lib/database.types.ts
git commit -m "feat(db): add match_activity table with RLS for self-entry"
```

---

### Task 4: Wire activities into `getLeaderboard`

**Files:**
- Modify: `lib/data/leaderboard.ts`

- [ ] **Step 1: Extend `LeaderboardData`**

```ts
export type DistanceLeaderRow = { userId: string; nickname: string; distanceKm: number };

export type LeaderboardData = {
  rows: LeaderboardRow[];
  seasons: { id: string; name: string }[];
  matchesPlayed: number;
  sessionsPlayed: number;
  records: StatRecord[];
  /** Season totals for Trčanje / Najbolji km — sorted desc by km then nickname. */
  distanceLeaders: DistanceLeaderRow[];
};
```

- [ ] **Step 2: In `computeLeaderboard`, after `matchIds` known, fetch activities**

Inside the branch that has matches (and also return `distanceLeaders: []` on empty early returns):

```ts
const { data: activityRows } = await supabase
  .from("match_activity")
  .select("match_id, user_id, distance_km, max_speed_kmh, avg_speed_kmh")
  .in("match_id", matchIds);

const activityEntries: ActivityEntry[] = (activityRows ?? []).map((r) => ({
  matchId: r.match_id,
  userId: r.user_id,
  distanceKm: r.distance_km === null ? null : Number(r.distance_km),
  maxSpeedKmh: r.max_speed_kmh === null ? null : Number(r.max_speed_kmh),
  avgSpeedKmh: r.avg_speed_kmh === null ? null : Number(r.avg_speed_kmh),
  startsAt: startsByMatch.get(r.match_id) ?? null,
}));
```

- [ ] **Step 3: Extend `computeRecords` to accept `activityEntries` and append**

```ts
function appendActivityRecords(
  records: StatRecord[],
  entries: ActivityEntry[],
  nickname: (id: string) => string,
) {
  const whoWithDate = (userId: string, startsAt: string | null) => {
    const date = startsAt ? formatShortDate(startsAt) : "—";
    return `${nickname(userId)} · ${date}`;
  };
  const dist = bestDistanceInSingleTermin(entries);
  if (dist) {
    records.push({
      title: "Najviše kilometara na terminu",
      value: `${dist.value} km`,
      who: whoWithDate(dist.userId, dist.startsAt),
    });
  }
  const maxS = bestMaxSpeedInSingleTermin(entries);
  if (maxS) {
    records.push({
      title: "Najveća max brzina",
      value: `${maxS.value} km/h`,
      who: whoWithDate(maxS.userId, maxS.startsAt),
    });
  }
  const avgS = bestAvgSpeedInSingleTermin(entries);
  if (avgS) {
    records.push({
      title: "Najveća prosj. brzina",
      value: `${avgS.value} km/h`,
      who: whoWithDate(avgS.userId, avgS.startsAt),
    });
  }
}
```

Build `distanceLeaders` from `sumDistanceByUser` + nicknames, sort by km desc then `localeCompare(..., "hr")`.

- [ ] **Step 4: Bump cache key** from `v10-goal-diminishing` to `v11-match-activity`

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`  
Fix any call sites that destructure `LeaderboardData` if needed (pages will use new fields in later tasks; empty array default on early returns is enough).

- [ ] **Step 6: Commit**

```bash
git add lib/data/leaderboard.ts
git commit -m "feat(leaderboard): include match activity distance and records"
```

---

### Task 5: Server action `saveMatchActivity`

**Files:**
- Modify: `app/grupe/[grupaId]/termin/actions.ts`

- [ ] **Step 1: Add action**

```ts
export type ActivityFormState = { error?: string; message?: string };

export async function saveMatchActivity(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const groupId = String(formData.get("groupId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const ctx = await membership(groupId);
  if (!ctx) return { error: "Nisi prijavljen." };

  const parsed = parseActivityFields({
    distance: String(formData.get("distance") ?? ""),
    maxSpeed: String(formData.get("maxSpeed") ?? ""),
    avgSpeed: String(formData.get("avgSpeed") ?? ""),
  });
  if ("error" in parsed) return { error: parsed.error };

  const invalid = validateActivityFields(parsed);
  if (invalid) return { error: invalid };

  const { data: match } = await ctx.supabase
    .from("matches")
    .select("id, status, group_id")
    .eq("id", matchId)
    .eq("group_id", groupId)
    .maybeSingle();
  if (!match || match.status !== "zavrsen") {
    return { error: "Termin nije završen." };
  }

  const { data: lineupRow } = await ctx.supabase
    .from("match_lineup")
    .select("user_id")
    .eq("match_id", matchId)
    .eq("user_id", ctx.user.id)
    .limit(1)
    .maybeSingle();
  if (!lineupRow) return { error: "Nisi bio u ekipi na ovom terminu." };

  if (isEmptyActivity(parsed)) {
    await ctx.supabase
      .from("match_activity")
      .delete()
      .eq("match_id", matchId)
      .eq("user_id", ctx.user.id);
  } else {
    const { error } = await ctx.supabase.from("match_activity").upsert({
      match_id: matchId,
      user_id: ctx.user.id,
      distance_km: parsed.distanceKm,
      max_speed_kmh: parsed.maxSpeedKmh,
      avg_speed_kmh: parsed.avgSpeedKmh,
      updated_at: new Date().toISOString(),
    });
    if (error) return { error: "Spremanje nije uspjelo." };
  }

  updateTag(leaderboardTag(groupId));
  revalidatePath(`/grupe/${groupId}/termin/${matchId}/sazetak`);
  revalidatePath(`/grupe/${groupId}/statistika`);
  revalidatePath(`/grupe/${groupId}/ljestvica`);
  return { message: "Spremljeno." };
}
```

Import `parseActivityFields`, `validateActivityFields`, `isEmptyActivity` from `@/lib/domain/activity` and ensure `updateTag` / `leaderboardTag` already imported (they are).

- [ ] **Step 2: Commit**

```bash
git add app/grupe/[grupaId]/termin/actions.ts
git commit -m "feat(termin): server action to save match activity"
```

---

### Task 6: Sažetak UI — form + team list

**Files:**
- Create: `app/grupe/[grupaId]/termin/[terminId]/sazetak/ActivityForm.tsx`
- Modify: `app/grupe/[grupaId]/termin/[terminId]/sazetak/page.tsx`

- [ ] **Step 1: Create `ActivityForm` client component**

Pattern: `useActionState(saveMatchActivity, {})`, three number-ish text inputs (`inputMode="decimal"`), labels in Croatian, `SubmitButton`. Below form (or sibling section driven by props): read-only list `players: { userId, nickname, distanceKm, maxSpeedKmh, avgSpeedKmh }[]` formatted as `6.2 km · max 28.5 · avg 8.1` with `—` for missing fields.

Only show the editable form when `canEdit` prop is true (current user in lineup). Always show the team list when `players.length > 0`.

- [ ] **Step 2: On `sazetak/page.tsx`**

After loading lineup user ids:

1. Fetch `match_activity` for `terminId`.
2. `canEdit = allUserIds.includes(user.id)`.
3. Render `<ActivityForm ... />` near the bottom (after scoreboard / before or after description — prefer after main results, before Share if Share is top; otherwise after MatchDescription). Spec: on sažetak for finished match.

Pass defaults from current user's activity row.

- [ ] **Step 3: Manual smoke** — open finished termin as lineup player, save km only, see list update; as non-lineup member see list only.

- [ ] **Step 4: Commit**

```bash
git add app/grupe/[grupaId]/termin/[terminId]/sazetak/
git commit -m "feat(sazetak): form to enter distance and speeds"
```

---

### Task 7: Statistika — rename section + km leader + records

**Files:**
- Modify: `components/brand/statsArt.ts`
- Modify: `app/grupe/[grupaId]/statistika/page.tsx`

- [ ] **Step 1: Extend `STATS_ART`**

```ts
export const STATS_ART = {
  // ...existing
  distance: "/brand/stats/stats-distance.png",
  maxSpeed: "/brand/stats/stats-max-speed.png",
  avgSpeed: "/brand/stats/stats-avg-speed.png",
} as const;
```

- [ ] **Step 2: Rename `<h3>Vodeći</h3>` → `Najbolji (ukupno)`**

- [ ] **Step 3: Add leader card for distance**

```ts
const topDistance =
  distanceLeaders[0] && distanceLeaders[0].distanceKm > 0
    ? {
        userId: distanceLeaders[0].userId,
        nickname: distanceLeaders[0].nickname,
        value: distanceLeaders[0].distanceKm,
      }
    : null;

// Inside Najbolji grid, after attendance or at end:
<StatsLeaderCard
  imageSrc={STATS_ART.distance}
  title="Najviše kilometara"
  value={topDistance ? String(topDistance.value) : "—"}
  who={topDistance?.nickname ?? ""}
  href={topDistance ? playerHref(grupaId, topDistance.userId) : null}
  suffix="km"
/>
```

Destructure `distanceLeaders` from `getLeaderboard`.

- [ ] **Step 4: Extend `recordCards`**

```ts
{ title: "Najviše kilometara na terminu", imageSrc: STATS_ART.distance },
{ title: "Najveća max brzina", imageSrc: STATS_ART.maxSpeed },
{ title: "Najveća prosj. brzina", imageSrc: STATS_ART.avgSpeed },
```

(Append after existing record titles; `computeRecords` already pushes matching titles when data exists.)

- [ ] **Step 5: Commit**

```bash
git add components/brand/statsArt.ts app/grupe/[grupaId]/statistika/page.tsx
git commit -m "feat(statistika): activity leaders rename and records"
```

---

### Task 8: Ljestvica — Trčanje list before Dolaznost

**Files:**
- Modify: `app/grupe/[grupaId]/ljestvica/page.tsx`

- [ ] **Step 1: Destructure `distanceLeaders` from `getLeaderboard`**

- [ ] **Step 2: Insert section before Dolaznost**

```tsx
<section className="mt-8">
  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
    Trčanje
  </h3>
  {distanceLeaders.length === 0 ? (
    <p className="text-sm text-slate-500">Još nema unesenih kilometara.</p>
  ) : (
    <ul className="space-y-1">
      {distanceLeaders.map((r) => {
        const isYou = r.userId === user.id;
        return (
          <li
            key={r.userId}
            className={
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm " +
              (isYou
                ? "border-marka/30 bg-marka/5"
                : "border-slate-200 bg-white")
            }
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {r.nickname}
              {isYou && (
                <span className="ml-1.5 text-[0.65rem] font-bold uppercase text-marka-svijetla">
                  Ti
                </span>
              )}
            </span>
            <span className="font-semibold tabular-nums">{r.distanceKm} km</span>
          </li>
        );
      })}
    </ul>
  )}
</section>
```

No max/avg in the row.

- [ ] **Step 3: Commit**

```bash
git add app/grupe/[grupaId]/ljestvica/page.tsx
git commit -m "feat(ljestvica): Trčanje distance list before attendance"
```

---

### Task 9: Docs touch-up + final verify

**Files:**
- Modify: `docs/todo.md` (Strava item — note manual entry shipped / preferred first step)
- Optionally: `docs/ux-zadaci.md` UX-23 label if it still says only „Vodeći”

- [ ] **Step 1: Short note under Strava todo** that manual `match_activity` is the hobby path; Strava remains deferred / self-only if ever done.

- [ ] **Step 2: Run full checks**

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: all green.

- [ ] **Step 3: Commit docs if changed**

```bash
git add docs/todo.md
git commit -m "docs: note manual activity entry ahead of Strava"
```

---

## Spec coverage checklist

| Spec item | Task |
|---|---|
| `match_activity` + RLS self-only / finished / lineup | 3 |
| Parse + validate + empty deletes | 1, 5 |
| Sažetak form + team list | 6 |
| Najbolji (ukupno) rename + km card | 7 |
| Rekordi km/max/avg na terminu | 2, 4, 7 |
| Ljestvica Trčanje km only before Dolaznost | 8 |
| Brand art paths | 7 (files already in repo) |
| No Elo / teams / Strava | out of scope — not implemented |
| Cache invalidation on save | 5 (`updateTag`) |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-10-manual-activity-stats.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
