# Rating Contribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mild individual rating contribution (goals/assists/OG/keeper bands) on top of team Elo for group and global ratings.

**Architecture:** Pure domain function `computeContributions` in `lib/domain/contribution.ts`; `settleRatings` loads lineup+events, applies clamped contrib to Elo updates; sazetak recomputes contrib for optional breakdown.

**Tech Stack:** TypeScript domain + Vitest; existing Supabase settle path.

---

### Task 1: Domain contribution (TDD)

**Files:**
- Create: `lib/domain/contribution.ts`
- Create: `tests/unit/contribution.test.ts`

- [ ] Failing tests for goal/assist/OG, keeper bands, clamp ±6, multi-keeper
- [ ] Implement `computeContributions` + `keeperConcededPoints`
- [ ] Tests green

### Task 2: Wire settleRatings

**Files:**
- Modify: `app/grupe/[grupaId]/termin/[terminId]/uzivo/actions.ts`

- [ ] Select `is_goalkeeper` on lineup; load goal/own_goal/keeper_change events
- [ ] Apply contrib to group/global updates before history + RPC

### Task 3: Summary breakdown

**Files:**
- Modify: `app/grupe/[grupaId]/termin/[terminId]/sazetak/page.tsx`

- [ ] Recompute contrib; show `Elo ±N · doprinos ±M` under delta when both known

### Task 4: Verify

- [ ] `pnpm test` + `pnpm typecheck`
- [ ] Commit
