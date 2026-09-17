-- Brisanje grupe iz postavki. Mora biti SQL funkcija, ne dva odvojena
-- delete iz JavaScripta: matches.season_id je ON DELETE RESTRICT prema
-- seasons, a seasons cascade-aju s grupom. Ako Postgres prvo dirne sezone
-- dok termini jos postoje, brisanje pukne. U jednoj transakciji termini
-- idu prvi, pa grupa (clanovi, statistika, sezone).
--
-- security definer: child tablice (match_events, player_ratings, …)
-- nemaju DELETE politiku za admina, a FK cascade pod RLS-om bi tu stao.
-- Provjera is_group_admin je unutra; revoke s PUBLIC-a da se ne moze
-- zvati s anon kljucem.

create or replace function public.delete_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_group_admin(p_group) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.matches where group_id = p_group;
  delete from public.groups where id = p_group;
end;
$$;

revoke execute on function public.delete_group(uuid) from public;
revoke execute on function public.delete_group(uuid) from anon;
grant  execute on function public.delete_group(uuid) to authenticated;
