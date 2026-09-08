-- Team display names (labels only). team_side enum A/B stays the identity.
-- Nullable empty = fall back to "Ekipa A" / "Ekipa B" in the UI.
alter table matches
  add column team_a_name text,
  add column team_b_name text;

alter table matches
  add constraint matches_team_a_name_len check (team_a_name is null or char_length(team_a_name) <= 14),
  add constraint matches_team_b_name_len check (team_b_name is null or char_length(team_b_name) <= 14);

comment on column matches.team_a_name is 'Optional display label for team A; null means Ekipa A';
comment on column matches.team_b_name is 'Optional display label for team B; null means Ekipa B';
