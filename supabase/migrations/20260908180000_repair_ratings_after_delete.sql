-- Repair ratings left behind after deleting a finished termin
-- (history cascaded away, player_ratings / global Elo did not).

-- Group: no remaining group-scope history in this group → back to 1000.
with orphan_group as (
  select pr.group_id, pr.user_id
  from player_ratings pr
  where pr.matches_played > 0
    and not exists (
      select 1
      from rating_history rh
      join matches m on m.id = rh.match_id
      where rh.user_id = pr.user_id
        and rh.scope = 'group'
        and m.group_id = pr.group_id
    )
)
update player_ratings pr
set
  rating = 1000,
  matches_played = 0,
  updated_at = now()
from orphan_group o
where pr.group_id = o.group_id
  and pr.user_id = o.user_id;

-- Global: no remaining global history → back to 1000.
with orphan_global as (
  select p.id
  from profiles p
  where p.global_matches_played > 0
    and not exists (
      select 1
      from rating_history rh
      where rh.user_id = p.id
        and rh.scope = 'global'
    )
)
update profiles p
set
  global_rating = 1000,
  global_matches_played = 0
from orphan_global o
where p.id = o.id;

-- Re-sync from remaining history when counts drifted (history still exists).
with latest_group as (
  select distinct on (m.group_id, rh.user_id)
    m.group_id,
    rh.user_id,
    rh.rating_after,
    (
      select count(*)::int
      from rating_history c
      join matches cm on cm.id = c.match_id
      where c.user_id = rh.user_id
        and c.scope = 'group'
        and cm.group_id = m.group_id
    ) as played
  from rating_history rh
  join matches m on m.id = rh.match_id
  join games g on g.id = rh.game_id
  where rh.scope = 'group'
  order by m.group_id, rh.user_id, m.starts_at desc, g.seq desc
)
update player_ratings pr
set
  rating = latest_group.rating_after,
  matches_played = latest_group.played,
  updated_at = now()
from latest_group
where pr.group_id = latest_group.group_id
  and pr.user_id = latest_group.user_id;

with latest_global as (
  select distinct on (rh.user_id)
    rh.user_id,
    rh.rating_after,
    (
      select count(*)::int
      from rating_history c
      where c.user_id = rh.user_id and c.scope = 'global'
    ) as played
  from rating_history rh
  join matches m on m.id = rh.match_id
  join games g on g.id = rh.game_id
  where rh.scope = 'global'
  order by rh.user_id, m.starts_at desc, g.seq desc
)
update profiles p
set
  global_rating = latest_global.rating_after,
  global_matches_played = latest_global.played
from latest_global
where p.id = latest_global.user_id;
