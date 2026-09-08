-- Admin may insert a signup for another active group member.
-- Self-signup stays on "prijave: prijavi samo sebe"; policies OR together.

create policy "prijave: admin prijavi clana"
  on match_signups
  for insert
  with check (
    is_group_admin(match_group(match_id))
    and exists (
      select 1
      from group_members gm
      where gm.group_id = match_group(match_id)
        and gm.user_id = user_id
        and gm.status = 'active'
    )
  );
