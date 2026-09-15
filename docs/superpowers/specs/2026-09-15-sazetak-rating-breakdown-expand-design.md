# Sažetak: expand rating breakdown per player

Date: 2026-09-15  
Status: approved  
Extends: `2026-09-08-rating-explanation-ui-design.md` (shared rules block + profile one-liner stay as-is)

## Goal

On the finished-termin summary (`/sazetak`), tapping a registered player expands a row under their card showing **why** their rating moved for that utakmica — team Elo plus each non-zero contribution component.

## Decisions (from brainstorm)

| Choice | Decision |
|---|---|
| Depth | Itemised lines (not the profile one-liner alone) |
| Placement | Inline under that player’s card (inside the team column) |
| Accordion | Only one player expanded at a time (across both teams) |
| Guests / no history | Not expandable |

## Behaviour

### When expandable

A player row is expandable iff:

- not a guest (`isGuest === false`), and
- `rating_history` exists for that `(game_id, user_id, scope=group)` so `delta` is known.

### Interaction

- Tap expandable row → open breakdown under the existing nickname / G·A·delta line.
- Tap the same row again → collapse.
- Tap another expandable row → previous closes, new opens (single open key = `lineupId` or `userId`+`gameId`).
- Chevron (or equivalent) hints that the row is interactive.

### Expanded content

Always show:

1. **Timski Elo** — `eloDelta = delta − contribution.clamped`
2. **Ukupno** — `delta` (same number already on the closed row)

Conditionally show a line when that component’s **points ≠ 0**:

| Label | Points source |
|---|---|
| Golovi (n) | sum of goal points for that player |
| Asistencije (n) | `assists × ASSIST_POINTS` |
| Autogolovi (n) | `ownGoals × OWN_GOAL_POINTS` |
| Golman (primljeno n) | `keeperConcededPoints(conceded)` if they stood in goal |
| Obrana ekipe | `teamConcededPoints` for outfield on that side |
| Ograničenje ±12 | `clamped − raw` when clamp changed the sum |

Order: Elo → contribution components (as above) → clamp (if any) → Ukupno.

Zero-point components are omitted (except Elo and Ukupno).

### Unchanged

- Shared details block „Kako se računa rating“ stays at the top of sažetak.
- Profile „Zadnje utakmice“ one-liner stays (`formatRatingBreakdown`).
- No new DB columns / tables.

## Architecture

### Domain (`lib/domain/contribution.ts`)

Extend `ContributionRow` with explicit point fields written during `computeContributions`:

- `goalPoints`, `assistPoints`, `ownGoalPoints`, `keeperPoints`, `teamConcededPoints`
- Keep existing counts (`goals`, `assists`, `ownGoals`, `conceded`) and `raw` / `clamped`
- Invariant: `raw === goalPoints + assistPoints + ownGoalPoints + keeperPoints + teamConcededPoints`
- Invariant: `clamped === clamp(raw)` (unchanged formula)

### Domain helper (`lib/domain/rating-breakdown.ts`)

Add something like `ratingBreakdownLines({ eloDelta, contrib, delta })` → ordered `{ label, points }[]` for the UI (hides zeros; always Elo + Ukupno). Keeps Croatian labels in one place; profile one-liner unchanged.

### Sažetak UI

- Recompute contributions per finished game (needed again for expand; was removed as unused).
- Pass per-player `eloDelta` + contribution row (or prebuilt lines) into the lineup UI.
- Replace static dual `TeamColumn` with a small client wrapper that owns `expandedId` and renders both columns so accordion is shared.
- Guests keep current non-interactive markup.

## Testing

- Unit: extended `ContributionRow` — component fields sum to `raw`; clamp behaviour unchanged for existing cases.
- Unit: `ratingBreakdownLines` — hides zeros; shows clamp only when `raw ≠ clamped`; Elo + Ukupno always present.
- Manual smoke: open sažetak with multi-game termin; expand player A, then B (A closes); guest not tappable.

## Out of scope

- Changing Elo or contribution formulas.
- Storing Elo/contribution split in `rating_history`.
- Expanding guests or players without history.
- Full-width panel under both teams (rejected in brainstorm).
