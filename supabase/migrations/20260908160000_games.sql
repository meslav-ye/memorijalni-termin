-- Multi-game per termin: a session (matches) can contain N games (utakmice).
-- Existing rows become game seq=1. Score/timer/team names live on games.

create type game_status as enum ('u_tijeku', 'zavrsena');

create table games (
  id                   uuid primary key default gen_random_uuid(),
  match_id             uuid         not null references matches on delete cascade,
  seq                  int          not null default 1,
  status               game_status  not null default 'u_tijeku',

  started_at           timestamptz,
  paused_at            timestamptz,
  total_paused_seconds int          not null default 0,
  ended_at             timestamptz,

  score_a              int          not null default 0,
  score_b              int          not null default 0,

  team_a_name          text,
  team_b_name          text,

  created_at           timestamptz  not null default now(),

  unique (match_id, seq),
  constraint games_seq_positive check (seq >= 1),
  constraint games_pauza_nenegativna check (total_paused_seconds >= 0),
  constraint games_rezultat_nenegativan check (score_a >= 0 and score_b >= 0),
  constraint games_kraj_iza_pocetka check (
    ended_at is null or started_at is null or ended_at >= started_at
  )
);

create index games_match_idx on games (match_id);

-- One game per existing termin (preserve history).
insert into games (
  match_id, seq, status,
  started_at, paused_at, total_paused_seconds, ended_at,
  score_a, score_b, team_a_name, team_b_name, created_at
)
select
  m.id,
  1,
  case when m.status = 'zavrsen' then 'zavrsena'::game_status else 'u_tijeku'::game_status end,
  m.started_at,
  m.paused_at,
  m.total_paused_seconds,
  m.ended_at,
  m.score_a,
  m.score_b,
  m.team_a_name,
  m.team_b_name,
  m.created_at
from matches m;

-- Point events / lineup / rating at games.
alter table match_events add column game_id uuid references games on delete cascade;
alter table match_lineup add column game_id uuid references games on delete cascade;
alter table rating_history add column game_id uuid references games on delete cascade;

update match_events e
set game_id = g.id
from games g
where g.match_id = e.match_id and g.seq = 1;

update match_lineup l
set game_id = g.id
from games g
where g.match_id = l.match_id and g.seq = 1;

update rating_history r
set game_id = g.id
from games g
where g.match_id = r.match_id and g.seq = 1;

-- Drop rows that could not be linked (should be none).
delete from match_events where game_id is null;
delete from match_lineup where game_id is null;
delete from rating_history where game_id is null;

alter table match_events alter column game_id set not null;
alter table match_lineup alter column game_id set not null;
alter table rating_history alter column game_id set not null;

-- Lineup uniqueness moves to game.
alter table match_lineup drop constraint match_lineup_pkey;
alter table match_lineup add primary key (game_id, user_id);

-- Rating history uniqueness moves to game.
alter table rating_history drop constraint if exists rating_history_match_user_scope_key;
alter table rating_history
  add constraint rating_history_game_user_scope_key unique (game_id, user_id, scope);

create index match_events_game_idx on match_events (game_id);
create index match_lineup_game_idx on match_lineup (game_id);
create index rating_history_game_idx on rating_history (game_id);

-- Keep match_id on events/lineup/rating for session joins & RLS helpers,
-- but writes must set game_id. Triggers keep match_id in sync.
create or replace function public.sync_game_match_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select match_id into new.match_id from games where id = new.game_id;
  return new;
end;
$$;

create trigger match_events_sync_match
  before insert or update of game_id on match_events
  for each row execute function public.sync_game_match_id();

create trigger match_lineup_sync_match
  before insert or update of game_id on match_lineup
  for each row execute function public.sync_game_match_id();

create trigger rating_history_sync_match
  before insert or update of game_id on rating_history
  for each row execute function public.sync_game_match_id();

-- Lineup membership for a session: any game of that match.
create or replace function public.is_in_lineup(m uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from match_lineup l
    join games g on g.id = l.game_id
    where g.match_id = m and l.user_id = auth.uid()
  );
$$;

-- Drop before removing matches.ended_at (old policy depended on that column).
drop policy if exists "dogadjaji: ispravi dok traje ili admin 24h" on match_events;

-- Drop game-owned columns from matches (session only now).
alter table matches
  drop column started_at,
  drop column paused_at,
  drop column total_paused_seconds,
  drop column ended_at,
  drop column score_a,
  drop column score_b,
  drop column team_a_name,
  drop column team_b_name;

-- Event edit window: while session is u_tijeku, lineup may edit;
-- after a game ends, admin has 24h on that game's events.
create policy "dogadjaji: ispravi dok traje ili admin 24h" on match_events
  for update using (
    (is_in_lineup(match_id)
      and exists (select 1 from matches m where m.id = match_id and m.status = 'u_tijeku'))
    or
    (is_group_admin(match_group(match_id))
      and exists (
        select 1 from games g
        where g.id = game_id
          and g.ended_at is not null
          and g.ended_at > now() - interval '24 hours'
      ))
  );

alter table games enable row level security;

create policy "utakmice: citaj" on games
  for select using (is_group_member(match_group(match_id)));

-- Same bar as lineup: any active member may create/update games for the session.
create policy "utakmice: clan pise" on games
  for all using (is_group_member(match_group(match_id)))
  with check (is_group_member(match_group(match_id)));
