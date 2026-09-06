-- Enumi i tablica profila.
-- Nazivi tablica i stupaca su na engleskom; vrijednosti enuma za stanje termina
-- namjerno su na hrvatskom jer se pojavljuju u sucelju i u razgovoru o aplikaciji.

create type member_role   as enum ('admin', 'member');
create type member_status as enum ('pending', 'active', 'removed');
create type match_status  as enum ('najavljen', 'zakljucan', 'u_tijeku', 'zavrsen', 'otkazan');
create type team_side     as enum ('A', 'B');
create type event_type    as enum ('goal', 'own_goal', 'keeper_change', 'pause', 'resume');

create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  full_name     text        not null default '',
  -- Nadimak se prikazuje na ekranu uzivo, gdje prostora ima malo.
  nickname      text        not null default '',
  avatar_url    text,
  -- Trajna oznaka "igram golmana". Po terminu se moze pregaziti u match_lineup.
  is_goalkeeper boolean     not null default false,
  created_at    timestamptz not null default now(),

  constraint nickname_duljina check (nickname = '' or char_length(nickname) between 2 and 12)
);

-- Profil se stvara automatski pri registraciji, da aplikacija nikad ne naleti
-- na prijavljenog korisnika bez pripadnog retka u profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
