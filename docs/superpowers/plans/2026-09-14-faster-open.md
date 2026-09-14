# Faster open — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cold open and in-app navigation faster via JWT proxy fast-path, `/` rewrite + `mt_home` cookie, deferred series ensure, Suspense on Termini list, and prefetch on main links.

**Architecture:** Keep Supabase Auth refresh in `proxy.ts`, but call `getUser()` only when the session is missing or near expiry (`expires_at` within 90s). Resolve `/` with rewrite (same request) for signed-in destinations. Materialise recurring matches with Next.js `after()` so list SELECTs are not blocked. Stream match list under Suspense; prefetch group tabs and match cards.

**Tech Stack:** Next.js 16.3.4 (`after` from `next/server`) · Supabase SSR 0.12 · React 19 · Vitest

**Spec:** [`docs/superpowers/specs/2026-09-14-faster-open-design.md`](../specs/2026-09-14-faster-open-design.md)

**Commits:** Propose `git add` + message; do **not** auto-commit unless Mislav asks (project rule).

---

## Feasibility validation (spec → codebase)

| Spec § | Verdict | Evidence |
|--------|---------|----------|
| 1 JWT fast-path | OK | Use `getSession()` (cookie-local) + pure `isExpiresAtFresh(expires_at)`; only then `getUser()`. Avoids reimplementing chunked `base64url` cookies. |
| 2 `/` rewrite + cookie | OK with fix | `NextResponse.rewrite` exists. **Do not set cookies in group layout RSC** (same failure mode as `lib/supabase/server.ts` try/catch). Set/clear `mt_home` in `proxy.ts`. Cookie path must verify nickname **and** active membership. |
| 3 defer series | OK | `after` exported from `next/server` in Next 16.3.4. |
| 4 Suspense list | OK | Layout already loads group chrome; page can wrap async child. |
| 5 prefetch | OK | `GroupTabs` already uses `Link` (prefetch on by default). MatchCard + Ekipe `BusyLink` need explicit `prefetch`. |
| Non-goals | OK | No server-action Auth changes. |

---

## File map

| File | Role |
|------|------|
| `lib/auth/session-fresh.ts` | Pure `isExpiresAtFresh(expiresAtSec, nowMs?, skewSec?)` |
| `tests/unit/session-fresh.test.ts` | Unit tests for freshness helper |
| `lib/auth/home-cookie.ts` | `MT_HOME_COOKIE`, parse/validate `/grupe/{uuid}`, cookie options |
| `tests/unit/home-cookie.test.ts` | Parse/reject bad cookie values |
| `proxy.ts` | Freshness gate, `/` resolve + rewrite/redirect, set/clear `mt_home` |
| `lib/data/matches.ts` | `after(() => ensure…)` before SELECTs (no await ensure) |
| `app/grupe/[grupaId]/page.tsx` | Extract async list + Suspense skeleton |
| `app/grupe/[grupaId]/termin/[terminId]/page.tsx` | `BusyLink prefetch` for Ekipe |
| Spec markdown | Already corrected for proxy cookie ownership |

---

### Task 1: Session freshness helper (TDD)

**Files:**
- Create: `lib/auth/session-fresh.ts`
- Create: `tests/unit/session-fresh.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { isExpiresAtFresh } from "@/lib/auth/session-fresh";

describe("isExpiresAtFresh", () => {
  const now = 1_000_000_000_000; // ms

  it("is fresh when exp is more than skew seconds ahead", () => {
    const expSec = Math.floor(now / 1000) + 120;
    expect(isExpiresAtFresh(expSec, now, 90)).toBe(true);
  });

  it("is not fresh when within skew window", () => {
    const expSec = Math.floor(now / 1000) + 60;
    expect(isExpiresAtFresh(expSec, now, 90)).toBe(false);
  });

  it("is not fresh when already expired", () => {
    const expSec = Math.floor(now / 1000) - 10;
    expect(isExpiresAtFresh(expSec, now, 90)).toBe(false);
  });

  it("is not fresh when expiresAt is nullish", () => {
    expect(isExpiresAtFresh(null, now, 90)).toBe(false);
    expect(isExpiresAtFresh(undefined, now, 90)).toBe(false);
  });
});
```

- [ ] **Step 2: Validate — test fails**

Run: `pnpm exec vitest run tests/unit/session-fresh.test.ts`

Expected: FAIL (module / export missing)

- [ ] **Step 3: Implement**

```ts
/** True when session expires_at (unix seconds) is more than `skewSec` in the future. */
export function isExpiresAtFresh(
  expiresAtSec: number | null | undefined,
  nowMs: number = Date.now(),
  skewSec: number = 90,
): boolean {
  if (expiresAtSec == null || !Number.isFinite(expiresAtSec)) return false;
  return expiresAtSec * 1000 > nowMs + skewSec * 1000;
}
```

- [ ] **Step 4: Validate — test passes**

Run: `pnpm exec vitest run tests/unit/session-fresh.test.ts`

Expected: PASS (4 tests)

- [ ] **Step 5: Propose commit**

```bash
git add lib/auth/session-fresh.ts tests/unit/session-fresh.test.ts
# proposed: test: add session expires_at freshness helper
```

---

### Task 2: `mt_home` cookie helpers (TDD)

**Files:**
- Create: `lib/auth/home-cookie.ts`
- Create: `tests/unit/home-cookie.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  MT_HOME_COOKIE,
  parseMtHomeGroupId,
  mtHomeCookieOptions,
} from "@/lib/auth/home-cookie";

describe("parseMtHomeGroupId", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("accepts /grupe/{uuid}", () => {
    expect(parseMtHomeGroupId(`/grupe/${id}`)).toBe(id);
  });

  it("rejects non-group paths and garbage", () => {
    expect(parseMtHomeGroupId("/grupe")).toBeNull();
    expect(parseMtHomeGroupId(`/grupe/${id}/termin/x`)).toBeNull();
    expect(parseMtHomeGroupId("/prijava")).toBeNull();
    expect(parseMtHomeGroupId("")).toBeNull();
    expect(parseMtHomeGroupId(undefined)).toBeNull();
  });
});

describe("mtHomeCookieOptions", () => {
  it("is httpOnly Lax path=/ with ~30d maxAge", () => {
    const o = mtHomeCookieOptions();
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe("lax");
    expect(o.path).toBe("/");
    expect(o.maxAge).toBe(60 * 60 * 24 * 30);
  });
});

describe("MT_HOME_COOKIE", () => {
  it("has a stable name", () => {
    expect(MT_HOME_COOKIE).toBe("mt_home");
  });
});
```

- [ ] **Step 2: Validate — test fails**

Run: `pnpm exec vitest run tests/unit/home-cookie.test.ts`

Expected: FAIL (missing module)

- [ ] **Step 3: Implement**

```ts
export const MT_HOME_COOKIE = "mt_home";

const GROUP_PATH =
  /^\/grupe\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function parseMtHomeGroupId(
  value: string | undefined | null,
): string | null {
  if (!value) return null;
  const m = value.trim().match(GROUP_PATH);
  return m?.[1] ?? null;
}

export function mtHomePath(groupId: string): string {
  return `/grupe/${groupId}`;
}

export function mtHomeCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

/** Pathname `/grupe/{uuid}` or `/grupe/{uuid}/...` → group id */
export function groupIdFromPathname(pathname: string): string | null {
  const m = pathname.match(
    /^\/grupe\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i,
  );
  return m?.[1] ?? null;
}
```

- [ ] **Step 4: Validate — tests pass**

Run: `pnpm exec vitest run tests/unit/home-cookie.test.ts`

Expected: PASS

- [ ] **Step 5: Propose commit**

```bash
git add lib/auth/home-cookie.ts tests/unit/home-cookie.test.ts
# proposed: feat: add mt_home cookie parse helpers
```

---

### Task 3: Proxy JWT gate + `/` rewrite + `mt_home`

**Files:**
- Modify: `proxy.ts` (full replace of session + `/` handling)

- [ ] **Step 1: Implement proxy changes**

Replace the auth + `/` block with this shape (keep matcher/`createServerClient` cookie wiring):

```ts
import { isExpiresAtFresh } from "@/lib/auth/session-fresh";
import {
  MT_HOME_COOKIE,
  groupIdFromPathname,
  mtHomeCookieOptions,
  mtHomePath,
  parseMtHomeGroupId,
} from "@/lib/auth/home-cookie";

// inside proxy(), after creating supabase:

const {
  data: { session },
} = await supabase.auth.getSession();

let userId = session?.user?.id ?? null;

if (!isExpiresAtFresh(session?.expires_at)) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  userId = user?.id ?? null;
}

// After building `response` (next or entry):
const pathGroupId = groupIdFromPathname(request.nextUrl.pathname);
if (userId && pathGroupId) {
  response.cookies.set(MT_HOME_COOKIE, mtHomePath(pathGroupId), mtHomeCookieOptions());
}

if (request.nextUrl.pathname === "/") {
  const dest = await resolveHomeDestination(supabase, userId, request);
  if (dest === "/prijava" || dest === "/profil") {
    const redirect = NextResponse.redirect(new URL(dest, request.url));
    copyCookies(response, redirect);
    return redirect;
  }
  const rewrite = NextResponse.rewrite(new URL(dest, request.url));
  copyCookies(response, rewrite);
  if (dest.startsWith("/grupe/")) {
    const gid = parseMtHomeGroupId(dest);
    if (gid) rewrite.cookies.set(MT_HOME_COOKIE, dest, mtHomeCookieOptions());
  }
  return rewrite;
}

return response;

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
}
```

`resolveHomeDestination` updates:

```ts
async function resolveHomeDestination(
  supabase: ReturnType<typeof createServerClient>,
  userId: string | null,
  request: NextRequest,
): Promise<string> {
  if (!userId) return "/prijava";

  const cookieGroupId = parseMtHomeGroupId(
    request.cookies.get(MT_HOME_COOKIE)?.value,
  );

  if (cookieGroupId) {
    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("nickname").eq("id", userId).maybeSingle(),
      supabase
        .from("group_members")
        .select("status")
        .eq("user_id", userId)
        .eq("group_id", cookieGroupId)
        .maybeSingle(),
    ]);
    if (!profile?.nickname) return "/profil";
    if (membership?.status === "active") return mtHomePath(cookieGroupId);
    // stale cookie — fall through (caller may overwrite cookie later)
  }

  // existing full profile + memberships logic → /profil | /grupe/{id} | /grupe
  // ...
}
```

- [ ] **Step 2: Validate — typecheck**

Run: `pnpm typecheck`

Expected: exit 0 (no type errors in `proxy.ts` / new imports)

- [ ] **Step 3: Validate — unit suite still green**

Run: `pnpm test`

Expected: all unit tests PASS

- [ ] **Step 4: Validate — manual proxy behaviour (dev)**

Run: `pnpm dev`, signed in, open DevTools Network:

1. Visit `/grupe/{id}` once → Response Set-Cookie includes `mt_home`.
2. Hard-open `/` with fresh session → **one** document request; response is 200 (rewrite), not 302 to group; HTML contains group name / Termini.
3. With near-expired session (or delete access by waiting / clearing only after forcing `getUser` path): confirm Auth `/user` still called when stale.
4. Signed out `/` → 302 `/prijava`.
5. User without nickname → 302 `/profil`.

- [ ] **Step 5: Propose commit**

```bash
git add proxy.ts lib/auth/
# proposed: perf: skip fresh getUser in proxy and rewrite / to home group
```

---

### Task 4: Defer series ensure with `after()`

**Files:**
- Modify: `lib/data/matches.ts`

- [ ] **Step 1: Change `getMatches` start**

Replace:

```ts
await ensureUpcomingSeriesOccurrences(groupId);
```

with:

```ts
import { after } from "next/server";

// inside getMatches, before SELECTs:
after(() => {
  void ensureUpcomingSeriesOccurrences(groupId).catch((err) => {
    console.error("ensureUpcomingSeriesOccurrences", err);
  });
});
```

Do **not** await ensure before SELECTs.

- [ ] **Step 2: Validate — typecheck**

Run: `pnpm typecheck`

Expected: PASS (`after` resolves from `next/server`)

- [ ] **Step 3: Validate — behaviour**

1. Open Termini for a group with an active series inside the 6-day window where next occurrence is missing.
2. First load may omit the new row; reload within a few seconds should show it (ensure ran in `after`).
3. Confirm list still loads when there is **no** series (empty `match_series`) — no error.

- [ ] **Step 4: Propose commit**

```bash
git add lib/data/matches.ts
# proposed: perf: materialise series occurrences after match list responds
```

---

### Task 5: Suspense around Termini list

**Files:**
- Modify: `app/grupe/[grupaId]/page.tsx`

- [ ] **Step 1: Split async list**

Keep admin “Novi termin” outside Suspense (needs `getMembership` only). Wrap lists:

```tsx
import { Suspense } from "react";

// in page:
return (
  <div className="space-y-8">
    {admin && ( /* Novi termin link — unchanged */ )}
    <Suspense fallback={<MatchListSkeleton />}>
      <MatchLists grupaId={grupaId} userId={user.id} />
    </Suspense>
  </div>
);

async function MatchLists({
  grupaId,
  userId,
}: {
  grupaId: string;
  userId: string;
}) {
  const { upcoming, past } = await getMatches(grupaId, userId);
  // existing upcoming + past JSX using MatchCard
}

function MatchListSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="h-24 rounded-lg border border-slate-200 bg-white" />
      <div className="h-24 rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
```

- [ ] **Step 2: Validate — perceived stream**

Run: `pnpm dev`, throttle Network to Slow 3G, open `/grupe/{id}` (or `/` rewrite).

Expected: group title + tabs visible **before** match cards finish; skeleton shows in list area.

- [ ] **Step 3: Propose commit**

```bash
git add app/grupe/[grupaId]/page.tsx
# proposed: perf: stream termini list under Suspense
```

---

### Task 6: Prefetch Ekipe (+ confirm tabs)

**Files:**
- Modify: `app/grupe/[grupaId]/termin/[terminId]/page.tsx` — `BusyLink` for Ekipe
- Verify: `app/grupe/[grupaId]/Tabs.tsx` — no `prefetch={false}` (already default true)
- Modify: `app/grupe/[grupaId]/page.tsx` — MatchCard `<Link>` already defaults prefetch true; leave as-is (validate only)

- [ ] **Step 1: Enable Ekipe prefetch**

```tsx
<BusyLink
  prefetch
  href={`/grupe/${grupaId}/termin/${terminId}/ekipe`}
  ...
>
```

Leave any link to uživo with default `prefetch={false}` on BusyLink.

- [ ] **Step 2: Validate — Network prefetch**

1. Open termin detail; confirm a prefetch request for `/ekipe` (RSC) appears without clicking.
2. Click group tabs Statistika / Ljestvica — navigations feel warm (prefetched).
3. Click Ekipe — pending indicator may be shorter/skippier (acceptable per spec).

- [ ] **Step 3: Propose commit**

```bash
git add app/grupe/[grupaId]/termin/[terminId]/page.tsx
# proposed: perf: prefetch ekipe route from termin detail
```

---

### Task 7: End-to-end validation checklist

- [ ] **Step 1: Automated**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: all green.

- [ ] **Step 2: Cold open (A)**

| Check | Pass? |
|-------|-------|
| Signed-in, one group, fresh JWT: `/` is **rewrite** (single document), Termini HTML | |
| Network: no Supabase Auth `/user` from **proxy** on that request (RSC `getUser` may still appear) | |
| `mt_home` set after visiting a group | |
| Stale `mt_home` for group you left → falls back to `/grupe` or other group, no crash | |
| Logged out `/` → `/prijava` | |
| No nickname → `/profil` | |

- [ ] **Step 3: In-app (B)**

| Check | Pass? |
|-------|-------|
| Tab switches with fresh JWT: proxy skips `getUser` | |
| Match cards / tabs prefetch visible in Network | |
| Ekipe prefetches; uživo does not (unless separately linked with BusyLink default) | |
| Group shell paints before match list under throttle | |

- [ ] **Step 4: Series defer**

| Check | Pass? |
|-------|-------|
| Termini list loads when series empty | |
| Missing next occurrence appears on **reload** after first open | |

- [ ] **Step 5: Update spec status**

In `docs/superpowers/specs/2026-09-14-faster-open-design.md` set `**Status:** implemented` after all checks pass.

- [ ] **Step 6: Propose final commit(s)** if anything left uncommitted (spec status + leftovers)

---

## Spec coverage (plan self-review)

| Spec requirement | Task |
|------------------|------|
| JWT / expires fast-path | 1, 3 |
| `/` rewrite for signed-in destinations | 3 |
| Redirect `/prijava`, `/profil` | 3 |
| `mt_home` + nickname + membership | 2, 3 (proxy, not layout) |
| Defer `ensureUpcomingSeriesOccurrences` via `after` | 4 |
| Suspense match list | 5 |
| Prefetch tabs / cards / Ekipe | 6 |
| Success criteria / verification | 7 |
| Non-goals untouched | implicit |

**Placeholder scan:** none intentional.

**Type consistency:** `isExpiresAtFresh`, `MT_HOME_COOKIE`, `parseMtHomeGroupId`, `mtHomePath`, `groupIdFromPathname`, `mtHomeCookieOptions` used consistently across tasks.
