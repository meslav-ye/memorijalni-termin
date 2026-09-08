-- Matches finished before global rating existed only have scope=group history.
-- Copy those rows to scope=global and refresh profiles (same timeline when a
-- player only had group Elo so far — the common case at launch).

insert into rating_history (match_id, user_id, scope, rating_before, rating_after)
select
  h.match_id,
  h.user_id,
  'global'::rating_scope,
  h.rating_before,
  h.rating_after
from rating_history h
where h.scope = 'group'
  and not exists (
    select 1
    from rating_history g
    where g.match_id = h.match_id
      and g.user_id = h.user_id
      and g.scope = 'global'
  );

with latest as (
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
  where rh.scope = 'global'
  order by rh.user_id, m.starts_at desc, m.id desc
)
update profiles p
set
  global_rating = latest.rating_after,
  global_matches_played = latest.played
from latest
where p.id = latest.user_id;
