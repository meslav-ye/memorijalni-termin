-- Global Elo beside per-group player_ratings.
-- Same K as group rating; updated in the same finish-match transaction.

alter table profiles
  add column global_rating int not null default 1000,
  add column global_matches_played int not null default 0;

alter table profiles
  add constraint global_matches_nenegativni check (global_matches_played >= 0);

create type rating_scope as enum ('group', 'global');

alter table rating_history
  add column scope rating_scope not null default 'group';

alter table rating_history
  drop constraint if exists rating_history_match_id_user_id_key;

alter table rating_history
  add constraint rating_history_match_user_scope_key unique (match_id, user_id, scope);

create or replace function public.apply_global_rating(
  p_user uuid,
  p_rating int
) returns void
language sql
security definer
set search_path = public
as $$
  update profiles
  set global_rating = p_rating,
      global_matches_played = global_matches_played + 1
  where id = p_user;
$$;

revoke execute on function public.apply_global_rating(uuid, int) from public;
revoke execute on function public.apply_global_rating(uuid, int) from anon, authenticated;
grant  execute on function public.apply_global_rating(uuid, int) to service_role;
