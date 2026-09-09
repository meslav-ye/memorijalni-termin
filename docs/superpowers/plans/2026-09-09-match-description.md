# Match description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-editable free-text description on finished matches, shown on sažetak with auto-linked URLs.

**Architecture:** New nullable `matches.description` column; `linkifySegments` pure helper + small UI on sažetak; server action `updateMatchDescription` using existing membership/admin checks. Existing RLS already allows admin match updates.

**Tech Stack:** Next.js App Router, Supabase, Vitest

---

### Task 1: Migration + types

**Files:**
- Create: `supabase/migrations/20260909160000_match_description.sql`
- Modify: `lib/database.types.ts` (matches Row/Insert/Update)

- [ ] Add `description text` column
- [ ] Add `description` to generated types

### Task 2: linkify helper (TDD)

**Files:**
- Create: `lib/domain/linkify.ts`
- Create: `tests/unit/linkify.test.ts`

- [ ] Failing tests for segments (text / link), multi-URL, trailing punctuation
- [ ] Implement `linkifySegments`
- [ ] Tests pass

### Task 3: Server action

**Files:**
- Modify: `app/grupe/[grupaId]/termin/actions.ts`

- [ ] `updateMatchDescription` — admin, zavrsen, trim/null, max 2000, revalidate sazetak

### Task 4: Sažetak UI

**Files:**
- Create: `components/termin/LinkifiedText.tsx` (optional thin wrapper)
- Create: `app/grupe/[grupaId]/termin/[terminId]/sazetak/DescriptionEditor.tsx` or inline form
- Modify: `app/grupe/[grupaId]/termin/[terminId]/sazetak/page.tsx`

- [ ] Select `description`
- [ ] Member view + admin form under header
- [ ] Verify unit tests still pass
