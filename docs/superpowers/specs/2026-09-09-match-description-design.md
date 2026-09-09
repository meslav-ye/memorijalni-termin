# Match description (YouTube / notes after match)

Date: 2026-09-09  
Status: approved

## Goal

Admins can attach a free-text **description** to a finished match (termin) at any time — typically a YouTube recording link — editable whenever, shown on the summary (sažetak) page. Separate from pre-match `notes` (napomena).

## Decisions

| Topic | Choice |
|---|---|
| Field | New `matches.description text null` (not reuse `notes`) |
| Who edits | Group admins only |
| Where shown | Sažetak only |
| Format | Plain text; `http(s)://` URLs auto-linked |
| Empty | Members see nothing; admin always sees edit form |
| Share text | Description not included |

## Data

- Migration: `alter table matches add column description text;`
- Existing RLS covers it: members read matches; admins update matches.
- Types: add `description` to `matches` Row / Insert / Update in `lib/database.types.ts`.
- No backfill.

## Behaviour

- Server action `updateMatchDescription`: active admin of the group; match `group_id` matches; status `zavrsen`; trim; empty → `null`; max length 2000.
- Sažetak loads `description`.
- Members: render text with auto-linked URLs (`target="_blank"`, `rel="noopener noreferrer"`). React text nodes for non-URL parts (no raw HTML / `dangerouslySetInnerHTML`).
- Admin: textarea + Spremi below the page header, above results / rating explainer.
- `notes` unchanged.

## Tests

- Unit tests for URL segmentation / linkify helper (escape not needed if React text; cover multiple URLs, none, trailing punctuation).
- Manual: admin saves YT URL → member clicks link; non-admin cannot save; clear description → member sees nothing.

## Out of scope

- Description on termin page or group match list
- Markdown
- Dedicated YouTube URL column / embed player
- Calendar / share integration
