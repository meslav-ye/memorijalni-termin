-- Row Level Security. Sva prava se provode U BAZI, ne u sucelju.
--
-- KLJUCNO: pomocne funkcije MORAJU biti `security definer`. Bez toga pravilo
-- na group_members koje cita group_members ulazi u beskonacnu rekurziju i
-- Postgres vrati "infinite recursion detected in policy for relation".

create or replace function public.is_group_member(g uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = g and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_group_admin(g uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = g and user_id = auth.uid()
      and status = 'active' and role = 'admin'
  );
$$;

create or replace function public.is_in_lineup(m uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from match_lineup where match_id = m and user_id = auth.uid()
  );
$$;

create or replace function public.match_group(m uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select group_id from matches where id = m;
$$;

alter table profiles       enable row level security;
alter table groups         enable row level security;
alter table group_members  enable row level security;
alter table locations      enable row level security;
alter table seasons        enable row level security;
alter table matches        enable row level security;
alter table match_signups  enable row level security;
alter table match_lineup   enable row level security;
alter table match_events   enable row level security;
alter table player_ratings enable row level security;
alter table rating_history enable row level security;

-- ---------- PROFILI ----------
create policy "profil: citaj svoj" on profiles
  for select using (id = auth.uid());

-- Vidis profile samo onih s kojima dijelis barem jednu grupu.
create policy "profil: citaj suigrace" on profiles
  for select using (
    exists (
      select 1
      from group_members mine
      join group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid() and mine.status = 'active'
        and theirs.user_id = profiles.id and theirs.status = 'active'
    )
  );

create policy "profil: uredi samo svoj" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- GRUPE ----------
create policy "grupa: citaj ako si clan" on groups
  for select using (is_group_member(id));

create policy "grupa: svatko smije kreirati" on groups
  for insert with check (created_by = auth.uid());

create policy "grupa: uredjuje admin" on groups
  for update using (is_group_admin(id)) with check (is_group_admin(id));

-- ---------- CLANSTVO ----------
create policy "clanstvo: citaj clanove svoje grupe" on group_members
  for select using (is_group_member(group_id) or user_id = auth.uid());

-- Preko pozivnice se salje ZAHTJEV. Sam sebe se ne moze odobriti niti postaviti adminom.
create policy "clanstvo: posalji zahtjev za sebe" on group_members
  for insert with check (user_id = auth.uid() and status = 'pending' and role = 'member');

create policy "clanstvo: admin mijenja" on group_members
  for update using (is_group_admin(group_id)) with check (is_group_admin(group_id));

create policy "clanstvo: admin brise" on group_members
  for delete using (is_group_admin(group_id));

-- ---------- LOKACIJE I SEZONE ----------
create policy "lokacije: citaj" on locations
  for select using (is_group_member(group_id));

create policy "lokacije: admin pise" on locations
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

create policy "sezone: citaj" on seasons
  for select using (is_group_member(group_id));

create policy "sezone: admin pise" on seasons
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

-- ---------- TERMINI ----------
create policy "termin: citaj" on matches
  for select using (is_group_member(group_id));

create policy "termin: admin kreira" on matches
  for insert with check (is_group_admin(group_id));

create policy "termin: admin uredjuje" on matches
  for update using (is_group_admin(group_id)) with check (is_group_admin(group_id));

-- Pokretanje, pauza i zavrsetak smije svatko tko je u postavi tog termina.
create policy "termin: clan iz postave pokrece i zaustavlja" on matches
  for update using (is_group_member(group_id) and is_in_lineup(id))
  with check (is_group_member(group_id) and is_in_lineup(id));

create policy "termin: admin brise" on matches
  for delete using (is_group_admin(group_id));

-- ---------- PRIJAVE ----------
create policy "prijave: citaj" on match_signups
  for select using (is_group_member(match_group(match_id)));

create policy "prijave: prijavi samo sebe" on match_signups
  for insert with check (user_id = auth.uid() and is_group_member(match_group(match_id)));

create policy "prijave: mijenjaj svoju ili kao admin" on match_signups
  for update using (user_id = auth.uid() or is_group_admin(match_group(match_id)))
  with check (user_id = auth.uid() or is_group_admin(match_group(match_id)));

create policy "prijave: brisi svoju ili kao admin" on match_signups
  for delete using (user_id = auth.uid() or is_group_admin(match_group(match_id)));

-- ---------- POSTAVA ----------
-- Ekipe smije slagati bilo koji clan grupe, ne samo admin.
create policy "postava: svaki clan slaze" on match_lineup
  for all using (is_group_member(match_group(match_id)))
  with check (is_group_member(match_group(match_id)));

-- ---------- DOGADJAJI ----------
create policy "dogadjaji: citaj" on match_events
  for select using (is_group_member(match_group(match_id)));

-- Unositi smije samo onaj tko je U POSTAVI i samo DOK TERMIN TRAJE.
create policy "dogadjaji: unosi tko je u postavi dok termin traje" on match_events
  for insert with check (
    created_by = auth.uid()
    and is_in_lineup(match_id)
    and exists (select 1 from matches m where m.id = match_id and m.status = 'u_tijeku')
  );

-- Ispravka: dok termin traje smije svatko iz postave; nakon zavrsetka samo admin, i to 24h.
create policy "dogadjaji: ispravi dok traje ili admin 24h" on match_events
  for update using (
    (is_in_lineup(match_id)
      and exists (select 1 from matches m where m.id = match_id and m.status = 'u_tijeku'))
    or
    (is_group_admin(match_group(match_id))
      and exists (
        select 1 from matches m
        where m.id = match_id
          and m.ended_at is not null
          and m.ended_at > now() - interval '24 hours'
      ))
  );

-- ---------- RATING ----------
-- Namjerno NEMA insert/update pravila: rating se upisuje iskljucivo iz server
-- actiona sa secret kljucem. Nitko iz preglednika ne smije dirati svoj rating.
create policy "rating: citaj" on player_ratings
  for select using (is_group_member(group_id));

create policy "rating: povijest citaj" on rating_history
  for select using (is_group_member(match_group(match_id)));
