# Sažetak rating breakdown expand — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** On sažetak, tap a registered player to expand itemised Elo + contribution under their card (one open at a time).

**Architecture:** Extend `ContributionRow` with point fields; `ratingBreakdownLines` builds UI rows; client wrapper owns accordion across both team columns.

**Tech Stack:** Next.js App Router, React client component, Vitest, existing contribution/Elo domain.

**Spec:** `docs/superpowers/specs/2026-09-15-sazetak-rating-breakdown-expand-design.md`

---

## File map

| File | Role |
|---|---|
| `lib/domain/contribution.ts` | Add point fields; fill during compute |
| `lib/domain/rating-breakdown.ts` | `ratingBreakdownLines` |
| `tests/unit/contribution.test.ts` | Assert fields sum to raw |
| `tests/unit/rating-breakdown.test.ts` | Line builder behaviour |
| `app/.../sazetak/TeamsRatingExpand.tsx` | Client accordion (new) |
| `app/.../sazetak/page.tsx` | Recompute contrib; pass data; use wrapper |

---

### Task 1: Contribution point fields

- [x] Extend `ContributionRow` with `goalPoints`, `assistPoints`, `ownGoalPoints`, `keeperPoints`, `teamConcededPoints`
- [x] Set them in `computeContributions` (same increments as `raw`)
- [x] Update tests / `row()` helpers; assert sum ≡ raw

### Task 2: Breakdown lines helper

- [x] Add `ratingBreakdownLines({ eloDelta, contrib, delta })`
- [x] Unit tests: zeros hidden; clamp when raw≠clamped; Elo+Ukupno always

### Task 3: Sažetak UI

- [x] Recompute contributions per game; attach `eloDelta` + contrib (or lines) to players
- [x] Client `TeamsRatingExpand` with shared `expandedId`
- [x] Wire into `page.tsx` replacing dual `TeamColumn`

### Task 4: Verify

- [x] `npx vitest run tests/unit/contribution.test.ts tests/unit/rating-breakdown.test.ts`
