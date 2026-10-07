begin;

-- Harden the worker lease so a stale worker cannot resume or overwrite
-- a submission after another worker has acquired it.
create or replace function public.mark_multiplayer_submission_running_internal(
  p_submission_id uuid,
  p_provider text,
  p_provider_token text,
  p_test_position smallint,
  p_worker_id uuid,
  p_lease_seconds integer default 90
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_submission public.multiplayer_submissions;
  target_job devroyale_private.multiplayer_submission_jobs;
begin
  if p_test_position <= 0
     or p_worker_id is null
     or p_lease_seconds not between 30 and 300 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_submission_worker_state';
  end if;

  -- Keep the same lock order used by acquire/reconciliation:
  -- submission first, job second.
  select * into target_submission
  from public.multiplayer_submissions
  where id = p_submission_id
  for update;

  if not found or target_submission.status not in ('queued', 'running') then
    return;
  end if;

  select * into target_job
  from devroyale_private.multiplayer_submission_jobs
  where submission_id = p_submission_id
  for update;

  if not found
     or target_job.locked_by is distinct from p_worker_id
     or target_job.locked_until is null
     or target_job.locked_until <= now() then
    raise exception using
      errcode = 'P0001',
      message = 'submission_lease_lost';
  end if;

  update public.multiplayer_submissions
  set status = 'running',
      judging_started_at = coalesce(judging_started_at, now())
  where id = p_submission_id
    and status in ('queued', 'running');

  update devroyale_private.multiplayer_submission_jobs
  set provider = p_provider,
      provider_token = p_provider_token,
      test_position = p_test_position,
      locked_until = now() + make_interval(secs => p_lease_seconds),
      last_error = null
  where submission_id = p_submission_id
    and locked_by = p_worker_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'submission_lease_lost';
  end if;
end;
$$;

-- Remove the legacy finalizer that did not require worker ownership.
drop function if exists public.finalize_multiplayer_submission_internal(
  uuid,
  public.multiplayer_submission_status,
  text,
  text,
  numeric,
  integer
);

-- Finalization now requires the same worker that owns a live lease.
create function public.finalize_multiplayer_submission_internal(
  p_submission_id uuid,
  p_worker_id uuid,
  p_status public.multiplayer_submission_status,
  p_public_message text,
  p_stdout text default null,
  p_execution_time numeric default null,
  p_memory_used integer default null
)
returns public.multiplayer_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_submission public.multiplayer_submissions;
  target_job devroyale_private.multiplayer_submission_jobs;
  target_match public.multiplayer_matches;
  target_round public.multiplayer_rounds;
  player_score smallint;
  wins_required smallint;
  next_round_number smallint;
  next_challenge_id uuid;
begin
  if p_worker_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_submission_worker_state';
  end if;

  if p_status in ('queued', 'running') then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_final_submission_status';
  end if;

  select * into target_submission
  from public.multiplayer_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'submission_not_found';
  end if;

  -- Already-finalized submissions remain idempotent and are not mutated.
  if target_submission.status not in ('queued', 'running') then
    return target_submission;
  end if;

  select * into target_job
  from devroyale_private.multiplayer_submission_jobs
  where submission_id = p_submission_id
  for update;

  if not found
     or target_job.locked_by is distinct from p_worker_id
     or target_job.locked_until is null
     or target_job.locked_until <= now() then
    raise exception using
      errcode = 'P0001',
      message = 'submission_lease_lost';
  end if;

  update public.multiplayer_submissions
  set status = p_status,
      judged_at = now(),
      execution_time = p_execution_time,
      memory_used = p_memory_used,
      public_message = left(coalesce(p_public_message, ''), 500),
      stdout = left(coalesce(p_stdout, ''), 8192)
  where id = p_submission_id
  returning * into target_submission;

  delete from devroyale_private.multiplayer_submission_jobs
  where submission_id = p_submission_id
    and locked_by = p_worker_id;

  if p_status <> 'accepted' or target_submission.mode <> 'submit' then
    return target_submission;
  end if;

  select * into target_match
  from public.multiplayer_matches
  where id = target_submission.match_id
  for update;

  select * into target_round
  from public.multiplayer_rounds
  where id = target_submission.round_id
  for update;

  if target_match.status <> 'active'
     or target_round.status <> 'active'
     or target_round.round_number <> target_match.current_round then
    return target_submission;
  end if;

  update public.multiplayer_rounds
  set status = 'finished',
      winner_id = target_submission.user_id,
      finished_at = now()
  where id = target_round.id;

  update public.multiplayer_match_players
  set rounds_won = rounds_won + 1
  where match_id = target_match.id
    and user_id = target_submission.user_id
  returning rounds_won into player_score;

  wins_required := case target_match.match_format
    when 'bo1' then 1
    when 'bo3' then 2
    when 'bo5' then 3
  end;

  if player_score >= wins_required then
    update public.multiplayer_match_players
    set status = 'finished'
    where match_id = target_match.id
      and status <> 'surrendered';

    update public.multiplayer_matches
    set status = 'finished',
        winner_id = target_submission.user_id,
        finished_at = now()
    where id = target_match.id;

    update public.rooms
    set status = 'finished',
        closed_at = now()
    where id = target_match.room_id;

    update public.room_invites
    set status = 'expired'
    where room_id = target_match.room_id
      and status = 'pending';

    delete from public.room_members
    where room_id = target_match.room_id;

    return target_submission;
  end if;

  next_round_number := target_match.current_round + 1;

  next_challenge_id := devroyale_private.select_multiplayer_challenge(
    target_match.id,
    target_match.language,
    target_match.difficulty
  );

  if next_challenge_id is null then
    update public.multiplayer_matches
    set status = 'abandoned',
        cancelled_at = now()
    where id = target_match.id;

    update public.rooms
    set status = 'cancelled',
        closed_at = now()
    where id = target_match.room_id;

    delete from public.room_members
    where room_id = target_match.room_id;

    return target_submission;
  end if;

  insert into public.multiplayer_rounds (
    match_id,
    round_number,
    challenge_id,
    status,
    started_at
  ) values (
    target_match.id,
    next_round_number,
    next_challenge_id,
    'waiting',
    now() + interval '3 seconds'
  );

  update public.multiplayer_matches
  set status = 'between_rounds',
      current_round = next_round_number
  where id = target_match.id;

  return target_submission;
end;
$$;

revoke all on function public.mark_multiplayer_submission_running_internal(
  uuid,
  text,
  text,
  smallint,
  uuid,
  integer
)
from public, anon, authenticated;

grant execute on function public.mark_multiplayer_submission_running_internal(
  uuid,
  text,
  text,
  smallint,
  uuid,
  integer
)
to service_role;

revoke all on function public.finalize_multiplayer_submission_internal(
  uuid,
  uuid,
  public.multiplayer_submission_status,
  text,
  text,
  numeric,
  integer
)
from public, anon, authenticated;

grant execute on function public.finalize_multiplayer_submission_internal(
  uuid,
  uuid,
  public.multiplayer_submission_status,
  text,
  text,
  numeric,
  integer
)
to service_role;

commit;
