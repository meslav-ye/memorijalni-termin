-- Dopuna profila za korisnike koji su se prijavili PRIJE nego je okidac postojao.
--
-- Konkretan slucaj: na produkciji se netko prijavio Googleom dok baza jos nije
-- imala nijednu nasu tablicu. Taj korisnik postoji u auth.users, ali nema redak
-- u profiles — pa aplikacija ne moze spremiti ni nadimak.
--
-- Napisano tako da se smije pokrenuti vise puta: `on conflict do nothing`
-- znaci da postojece profile ne dira.

insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
