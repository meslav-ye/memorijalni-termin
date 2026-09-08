# Records with Dates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dated single-game records for most goals, most G+A, and fewest goals conceded while in goal.

**Architecture:** Pure domain helpers in `lib/domain/records.ts`; `computeRecords` formats `StatRecord` with `Nadimak · date`; Statistika lists new titles.

**Tech Stack:** TypeScript, Vitest, existing `MatchForStats` / `formatShortDate`.

---

### Task 1: Domain helpers (TDD)

**Files:**
- Create: `lib/domain/records.ts`
- Test: `tests/unit/records.test.ts`

- [ ] Failing tests for best goals (+ date), best G+A, fewest conceded (any lineup keeper)
- [ ] Implement helpers
- [ ] Tests green

### Task 2: Wire into leaderboard + UI

**Files:**
- Modify: `lib/data/leaderboard.ts` (`computeRecords`, cache key)
- Modify: `app/grupe/[grupaId]/statistika/page.tsx` (title list)

- [ ] Use helpers; format `who` as nickname · date
- [ ] Bump cache key
- [ ] Add empty-slot titles on Statistika
- [ ] `pnpm test` + `pnpm typecheck`
