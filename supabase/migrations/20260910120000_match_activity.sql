-- Manual per-termin running stats (self-entered). One row per player per termin.

create table match_activity (
  match_id         uuid not null references matches on delete cascade,
  user_id          uuid not null references profiles on delete cascade,
  distance_km      numeric,
  max_speed_kmh    numeric,
  avg_speed_kmh    numeric,
  updated_at       timestamptz not null default now(),
  primary key (match_id, user_id),
  constraint match_activity_distance_nonneg check (distance_km is null or distance_km >= 0),
  constraint match_activity_max_nonneg check (max_speed_kmh is null or max_speed_kmh >= 0),
  constraint match_activity_avg_nonneg check (avg_speed_kmh is null or avg_speed_kmh >= 0)
);

create index match_activity_match_idx on match_activity (match_id);
create index match_activity_user_idx on match_activity (user_id);

alter table match_activity enable row level security;

create policy "aktivnost: citaj clanovi"
  on match_activity for select
  using (is_group_member(match_group(match_id)));

create policy "aktivnost: upsert svoj"
  on match_activity for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = match_id and m.status = 'zavrsen'
    )
    and exists (
      select 1 from match_lineup l
      where l.match_id = match_activity.match_id
        and l.user_id = auth.uid()
    )
  );

create policy "aktivnost: update svoj"
  on match_activity for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = match_id and m.status = 'zavrsen'
    )
    and exists (
      select 1 from match_lineup l
      where l.match_id = match_activity.match_id
        and l.user_id = auth.uid()
    )
  );

create policy "aktivnost: delete svoj"
  on match_activity for delete
  using (user_id = auth.uid());
