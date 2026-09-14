-- Guest (popunjač) goals/assists: count toward score, not stats/rating.

alter table match_events
  add column scorer_filler_id uuid references match_fillers on delete set null,
  add column assist_filler_id uuid references match_fillers on delete set null;

-- Replace old "must have profile scorer" check.
alter table match_events drop constraint gol_ima_strijelca;
alter table match_events add constraint gol_ima_strijelca check (
  (
    type in ('goal', 'own_goal')
    and team is not null
    and (
      (scorer_id is not null and scorer_filler_id is null)
      or (scorer_id is null and scorer_filler_id is not null)
    )
  )
  or type not in ('goal', 'own_goal')
);

alter table match_events drop constraint asistent_nije_strijelac;
alter table match_events add constraint asistent_nije_strijelac check (
  (assist_id is null or assist_id is distinct from scorer_id)
  and (assist_filler_id is null or assist_filler_id is distinct from scorer_filler_id)
  and not (assist_id is not null and assist_filler_id is not null)
);

alter table match_events drop constraint autogol_bez_asistencije;
alter table match_events add constraint autogol_bez_asistencije check (
  type <> 'own_goal'
  or (assist_id is null and assist_filler_id is null)
);
