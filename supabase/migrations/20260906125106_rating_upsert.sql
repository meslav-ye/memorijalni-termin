-- Upis ratinga nakon zavrsenog termina.
--
-- Mora biti SQL funkcija, a ne upsert iz JavaScripta: matches_played se UVECAVA
-- za jedan, a to upsert ne zna bez prethodnog citanja (i bez utrke ako dvoje
-- istovremeno zavrsi termin).

create or replace function public.apply_rating(
  p_group uuid,
  p_user  uuid,
  p_rating int
) returns void
language sql
security definer
set search_path = public
as $$
  insert into player_ratings (group_id, user_id, rating, matches_played, updated_at)
  values (p_group, p_user, p_rating, 1, now())
  on conflict (group_id, user_id) do update
    set rating         = excluded.rating,
        matches_played = player_ratings.matches_played + 1,
        updated_at     = now();
$$;

-- Funkcija je security definer, pa je pravo poziva treba suziti:
-- zove se iskljucivo iz server actiona sa secret kljucem, nikad iz preglednika.
revoke execute on function public.apply_rating(uuid, uuid, int) from anon, authenticated;
