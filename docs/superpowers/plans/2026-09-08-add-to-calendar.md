# Add to Calendar Implementation Plan

> **For agentic workers:** Use TDD; steps use checkbox syntax.

**Goal:** Let players add a sufficiently filled match to their personal calendar via `.ics` (and Google Calendar link), with a 2h reminder.

**Architecture:** Pure `lib/domain/calendar-event.ts` builds ICS + Google URL; client `AddToCalendar` downloads the file; match page shows the control when `fill.tone !== "low"` and match is not cancelled.

**Tech Stack:** TypeScript, Vitest, Next.js client component.

---

### Task 1: Domain ICS / Google URL (TDD)

**Files:**
- Create: `lib/domain/calendar-event.ts`
- Test: `tests/unit/calendar-event.test.ts`

- [ ] ICS with DTSTART/DTEND (90 min), VALARM −2h, escaped text, stable UID
- [ ] Google Calendar template URL
- [ ] Tests green

### Task 2: UI on match page

**Files:**
- Create: `app/grupe/[grupaId]/termin/[terminId]/AddToCalendar.tsx`
- Modify: `app/grupe/[grupaId]/termin/[terminId]/page.tsx`

- [ ] Show when enough/full and not `otkazan`
- [ ] Buttons: download `.ics` + open Google Calendar
- [ ] Fetch group name for event title
