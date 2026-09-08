-- Weekly recurring series ("stalni termin"). Opt-in per series, not every match.
-- Occurrences are materialised lazily when the Termini list is opened.

create table match_series (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid        not null references groups on delete cascade,
  -- 0=Sunday … 6=Saturday, Zagreb local weekday.
  weekday       smallint    not null check (weekday between 0 and 6),
  time_local    text        not null check (time_local ~ '^[0-2][0-9]:[0-5][0-9]$'),
  location_id   uuid        references locations on delete set null,
  location_text text,
  capacity      int         not null default 10,
  min_players   int         not null default 10,
  notes         text,
  -- null = active; set when the series is paused (summer break). Existing
  -- match rows stay; only new occurrences stop being created.
  paused_at     timestamptz,
  created_by    uuid        not null references profiles on delete restrict,
  created_at    timestamptz not null default now(),

  constraint series_kvota_raspon check (capacity between 2 and 30),
  constraint series_min_raspon check (min_players between 2 and 30),
  constraint series_min_le_kvota check (min_players <= capacity),
  constraint series_lokacija_postoji check (location_id is not null or location_text is not null)
);

create index match_series_group_idx on match_series (group_id);

alter table matches
  add column series_id uuid references match_series on delete set null;

create index matches_series_idx on matches (series_id);

-- Prevents double-create when two visitors open Termini in the same second.
create unique index matches_series_starts_uidx
  on matches (series_id, starts_at)
  where series_id is not null;

alter table match_series enable row level security;

create policy "serija: citaj" on match_series
  for select using (is_group_member(group_id));

create policy "serija: admin pise" on match_series
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));
