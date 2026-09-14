-- Popunjači: neregistrirani igrači na terminu (bez statistike / ratinga).

create table match_fillers (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid        not null references matches on delete cascade,
  display_name text        not null,
  added_at     timestamptz not null default now(),
  constraint match_fillers_name_nonempty check (char_length(trim(display_name)) >= 1)
);

create index match_fillers_match_idx on match_fillers (match_id);

-- Lineup: podržava i registrirane i popunjače.
alter table match_lineup add column id uuid default gen_random_uuid();
update match_lineup set id = gen_random_uuid() where id is null;
alter table match_lineup alter column id set not null;

alter table match_lineup add column filler_id uuid references match_fillers on delete cascade;
alter table match_lineup add column display_name text;
alter table match_lineup add column is_guest boolean not null default false;

alter table match_lineup alter column user_id drop not null;

alter table match_lineup drop constraint match_lineup_pkey;
alter table match_lineup add primary key (id);

create unique index match_lineup_game_user_key
  on match_lineup (game_id, user_id)
  where user_id is not null;

create unique index match_lineup_game_filler_key
  on match_lineup (game_id, filler_id)
  where filler_id is not null;

alter table match_lineup add constraint match_lineup_identity check (
  (
    is_guest
    and user_id is null
    and filler_id is not null
    and display_name is not null
    and char_length(trim(display_name)) >= 1
  )
  or (
    not is_guest
    and user_id is not null
    and filler_id is null
  )
);

alter table match_fillers enable row level security;

create policy "popunjaci: citaj" on match_fillers
  for select using (is_group_member(match_group(match_id)));

create policy "popunjaci: admin pise" on match_fillers
  for all using (is_group_admin(match_group(match_id)))
  with check (is_group_admin(match_group(match_id)));
