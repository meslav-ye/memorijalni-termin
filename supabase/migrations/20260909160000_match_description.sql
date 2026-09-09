-- Free-text description on a termin (e.g. YouTube recording link).
-- Separate from notes (pre-match napomena). Editable by admins anytime;
-- shown on the finished-match summary page.

alter table matches
  add column description text;
