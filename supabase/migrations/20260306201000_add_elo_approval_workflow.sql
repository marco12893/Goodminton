alter table public.club_players
alter column elo_initial set default 1000,
alter column elo_current set default 1000;

update public.club_players
set
  elo_initial = 1000,
  elo_current = 1000
where total_matches = 0
  and elo_initial = 1200
  and elo_current = 1200;

create or replace function public.process_match_approval(target_match_id uuid, reviewer_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k_factor constant numeric := 32;
  match_record public.matches%rowtype;
  participant_record record;
  team1_avg numeric;
  team2_avg numeric;
  team1_count integer;
  team2_count integer;
  expected_team1 numeric;
  team1_delta integer;
  team2_delta integer;
  winner_team smallint;
  player_delta integer;
  player_elo_before integer;
  player_elo_after integer;
begin
  select *
  into match_record
  from public.matches
  where id = target_match_id
  for update;

  if not found then
    raise exception 'Match not found.';
  end if;

  if match_record.status <> 'pending' then
    raise exception 'Only pending matches can be approved.';
  end if;

  select avg(cp.elo_current)::numeric, count(*)
  into team1_avg, team1_count
  from public.match_participants mp
  join public.club_players cp on cp.id = mp.club_player_id
  where mp.match_id = target_match_id
    and mp.team = 1;

  select avg(cp.elo_current)::numeric, count(*)
  into team2_avg, team2_count
  from public.match_participants mp
  join public.club_players cp on cp.id = mp.club_player_id
  where mp.match_id = target_match_id
    and mp.team = 2;

  if team1_count <> 2 or team2_count <> 2 then
    raise exception 'A doubles match must have exactly two players on each team.';
  end if;

  winner_team := case
    when match_record.team1_score > match_record.team2_score then 1
    else 2
  end;

  expected_team1 := 1 / (1 + power(10::numeric, (team2_avg - team1_avg) / 400));
  team1_delta := round(
    k_factor * (
      (case when winner_team = 1 then 1 else 0 end) - expected_team1
    )
  );
  team2_delta := -team1_delta;

  delete from public.elo_history
  where match_id = target_match_id;

  for participant_record in
    select
      mp.id as match_participant_id,
      mp.club_player_id,
      mp.team,
      cp.elo_current
    from public.match_participants mp
    join public.club_players cp on cp.id = mp.club_player_id
    where mp.match_id = target_match_id
    order by mp.team, mp.slot
  loop
    player_delta := case
      when participant_record.team = 1 then team1_delta
      else team2_delta
    end;
    player_elo_before := participant_record.elo_current;
    player_elo_after := participant_record.elo_current + player_delta;

    update public.match_participants
    set
      points_scored = case
        when participant_record.team = 1 then match_record.team1_score
        else match_record.team2_score
      end,
      points_allowed = case
        when participant_record.team = 1 then match_record.team2_score
        else match_record.team1_score
      end,
      elo_before = player_elo_before,
      elo_after = player_elo_after,
      elo_delta = player_delta
    where id = participant_record.match_participant_id;

    update public.club_players
    set
      elo_current = player_elo_after,
      total_matches = total_matches + 1,
      total_wins = total_wins + case when participant_record.team = winner_team then 1 else 0 end,
      total_losses = total_losses + case when participant_record.team = winner_team then 0 else 1 end
    where id = participant_record.club_player_id;

    insert into public.elo_history (
      club_player_id,
      match_id,
      recorded_on,
      elo_before,
      elo_after,
      elo_delta
    )
    values (
      participant_record.club_player_id,
      target_match_id,
      coalesce(match_record.played_at, timezone('utc', now())),
      player_elo_before,
      player_elo_after,
      player_delta
    );
  end loop;

  update public.matches
  set
    status = 'approved',
    reviewed_by = reviewer_user_id,
    reviewed_at = timezone('utc', now()),
    rejection_reason = null
  where id = target_match_id;
end;
$$;
