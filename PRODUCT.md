# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are players and organizers in small closed Croatian recreational football circles (~15–40 people). They use the product on a phone, often standing outdoors by the pitch during a live match, and also before/after sessions to manage signups and look at standings.

## Product Purpose

Memorijalni termin organizes recreational **5v5** football matches end to end: groups, matches (termini), capacity + waitlist signups, team balancing, live pitch-side scoring (goals, assists, timer), and group statistics with automatic Elo ratings.

Success means a group can run a weekly session without spreadsheets or WhatsApp chaos: who is in, who is waiting, fair teams, a reliable live score, and a shared season record.

## Positioning

Invite-only hobby tool for friend groups — not a public sports social network, club admin suite, or coach product. The distinctive mechanism is the full cycle in one place, especially the **mobile-first live match screen** used one-handed outdoors, plus **automatic Elo** from results instead of manual player ratings.

Today it remains a hobby: invite link + admin approval. It may serve multiple friend groups over time, still invite-only, not open registration into groups.

## Operating Context

Typical flow: `Grupa → Termin → Prijave → Ekipe → Termin uživo → Statistika`. Invites travel via WhatsApp. Roles are admin and member. Live scoring can be entered by signed-up players on the bench, with realtime sync. Timezone for product behavior is Europe/Zagreb. Interface language is Croatian; code identifiers and DB columns are English (`match` for termin in code).

## Capabilities and Constraints

Confirmed capabilities: Google / magic link / email+password auth; groups with invite codes and admin approval; match capacity and waitlist fill; automatic team suggestions with manual correction; live timer and goal/assist entry; Elo leaderboard and group stats; installable web app (PWA / add to home screen).

Constraints: free-tier hobby hosting (Vercel Hobby, Supabase free); Apple Sign In deferred (paid Apple Developer membership); push notifications deferred; product is non-commercial hobby use. Phase 2+ ideas (e.g. Strava) are not product promises until shipped.

Undecided: final public product name (working name **Memorijalni termin** / short **Termin** is flexible and may change).

## Brand Commitments

No fixed brand name — the current name is a working label and may be redesigned. UI voice is plain Croatian, practical and short (especially nicknames on the live screen). Existing logo-derived theme color in the shipped app: `#0c300c`. Do not treat marketing claims, testimonials, or growth metrics as brand assets unless they are added as real evidence later.

## Evidence on Hand

Real sources of truth: `README.md`, `docs/superpowers/specs/2026-09-05-memorijalni-termin-design.md`, privacy copy in `app/privatnost/page.tsx`, and the running Next.js app under `app/`. PWA icons are referenced under `/icons/` in the manifest. There are no testimonials, press quotes, or benchmark claims — future work must not invent them.

## Product Principles

1. **Pitch-side first** — the live match experience on a phone outdoors drives UX decisions over desktop polish.
2. **Invite-only trust** — closed friend groups; no public group discovery or open join without admin approval.
3. **Automatic fairness** — teams and ratings come from rules and results (Elo), not subjective scoring of people.
4. **Honest hobby scope** — stay within free-tier and privacy promises; do not fake social proof or enterprise readiness.
5. **Croatian product surface** — what users read stays Croatian even when code stays English.
