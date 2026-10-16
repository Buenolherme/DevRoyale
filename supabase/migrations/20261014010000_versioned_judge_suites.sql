begin;

-- Structure and classification only. This migration creates NO competitive data.
create table devroyale_private.judge_policy (
  singleton boolean primary key default true check (singleton),
  environment text not null default 'production' check (environment in ('local', 'production')),
  mode text not null default 'competitive' check (mode in ('demo', 'competitive')),
  check (environment = 'local' or mode = 'competitive')
);
insert into devroyale_private.judge_policy default values;

create table devroyale_private.judge_suites (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.multiplayer_challenges(id) on delete restrict,
  version integer not null check (version > 0),
  kind text not null check (kind in ('demo', 'competitive')),
  provenance text not null check (provenance in ('historical_exposed', 'public_demo', 'private_provisioning')),
  state text not null default 'draft' check (state in ('draft', 'active', 'retired', 'revoked')),
  validation_type public.multiplayer_validation_type not null,
  judge_config jsonb not null check (jsonb_typeof(judge_config) = 'object'),
  created_at timestamptz not null default now(),
  sealed_at timestamptz,
  unique (challenge_id, kind, version),
  check ((kind = 'competitive' and provenance = 'private_provisioning')
      or (kind = 'demo' and provenance in ('historical_exposed', 'public_demo'))),
  check (state <> 'active' or sealed_at is not null)
);
create unique index judge_suites_one_active on devroyale_private.judge_suites(challenge_id, kind)
  where state = 'active';

create table devroyale_private.judge_suite_tests (
  suite_id uuid not null references devroyale_private.judge_suites(id) on delete restrict,
  is_public boolean not null,
  ordinal smallint not null check (ordinal > 0),
  input jsonb not null check (jsonb_typeof(input) = 'object'),
  expected jsonb,
  validator_config jsonb not null default '{}'::jsonb check (jsonb_typeof(validator_config) = 'object'),
  weight smallint not null default 1 check (weight > 0),
  primary key (suite_id, is_public, ordinal)
);

-- Keep suite identity out of the public tables/API. Both players and every retry
-- use the same binding; the current active version is consulted only at creation.
create table devroyale_private.multiplayer_round_suites (
  round_id uuid primary key references public.multiplayer_rounds(id) on delete cascade,
  suite_id uuid not null references devroyale_private.judge_suites(id) on delete restrict
);
create index multiplayer_round_suites_suite_idx on devroyale_private.multiplayer_round_suites(suite_id);

-- Previously published material is retained as EXPOSED historical demo data.
-- It is never upgraded to competitive. Do not edit already-applied migrations.
comment on table devroyale_private.multiplayer_challenge_tests is
  'Published historical test data, compromised confidentiality. Not the authoritative judge source; retained for history.';
insert into devroyale_private.judge_suites
  (challenge_id, version, kind, provenance, state, validation_type, judge_config, sealed_at)
select c.id, 1, 'demo', 'historical_exposed', 'retired', c.validation_type, c.judge_config, now()
from public.multiplayer_challenges c
where exists(select 1 from devroyale_private.multiplayer_challenge_tests t where t.challenge_id = c.id);
insert into devroyale_private.judge_suite_tests (suite_id, is_public, ordinal, input, expected, validator_config, weight)
select s.id, t.is_public, t.ordinal, t.input, t.expected, t.validator_config, t.weight
from devroyale_private.multiplayer_challenge_tests t
join devroyale_private.judge_suites s on s.challenge_id = t.challenge_id and s.provenance = 'historical_exposed';
insert into devroyale_private.multiplayer_round_suites(round_id, suite_id)
select r.id, s.id from public.multiplayer_rounds r
join devroyale_private.judge_suites s on s.challenge_id = r.challenge_id and s.provenance = 'historical_exposed';

alter table devroyale_private.judge_policy enable row level security;
alter table devroyale_private.judge_suites enable row level security;
alter table devroyale_private.judge_suite_tests enable row level security;
alter table devroyale_private.multiplayer_round_suites enable row level security;
revoke all on table devroyale_private.judge_policy, devroyale_private.judge_suites,
  devroyale_private.judge_suite_tests, devroyale_private.multiplayer_round_suites
  from public, anon, authenticated, service_role;

create function devroyale_private.guard_judge_suite() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and (new.state <> 'draft' or new.sealed_at is not null) then
    raise exception using errcode = 'P0001', message = 'suite_must_start_draft';
  end if;
  if tg_op = 'UPDATE' then
    if (new.id, new.challenge_id, new.version, new.kind, new.provenance)
       is distinct from (old.id, old.challenge_id, old.version, old.kind, old.provenance)
       or (old.sealed_at is not null and
           (to_jsonb(new) - 'state') is distinct from (to_jsonb(old) - 'state')) then
      raise exception using errcode = 'P0001', message = 'suite_immutable';
    end if;
    if new.state <> old.state and not (
      (old.state = 'draft' and new.state in ('active', 'revoked')) or
      (old.state = 'active' and new.state in ('retired', 'revoked')) or
      (old.state = 'retired' and new.state in ('active', 'revoked'))
    ) then raise exception using errcode = 'P0001', message = 'suite_state_invalid'; end if;
  end if;
  if new.state = 'active' then
    if new.judge_config ? 'harness'
       or not exists(select 1 from devroyale_private.judge_suite_tests t where t.suite_id = new.id and t.is_public)
       or not exists(select 1 from devroyale_private.judge_suite_tests t where t.suite_id = new.id and not t.is_public)
       or exists (
         select 1 from devroyale_private.judge_suite_tests t where t.suite_id = new.id and t.is_public
         and not exists (
           select 1 from public.multiplayer_challenges c,
             lateral jsonb_array_elements(c.public_examples) e
           where c.id = new.challenge_id and e->'input' = t.input
             and coalesce(e->'expected', e->'output', 'null'::jsonb) = coalesce(t.expected, 'null'::jsonb)
         )
       ) or (new.kind = 'competitive' and exists (
         select 1 from devroyale_private.judge_suite_tests t
         join devroyale_private.judge_suites demo on demo.challenge_id = new.challenge_id and demo.kind = 'demo'
         join devroyale_private.judge_suite_tests exposed on exposed.suite_id = demo.id
         where t.suite_id = new.id and not t.is_public and t.input = exposed.input
           and t.expected is not distinct from exposed.expected and t.validator_config = exposed.validator_config
       )) then raise exception using errcode = 'P0001', message = 'suite_not_valid'; end if;
    new.sealed_at := coalesce(new.sealed_at, now());
  end if;
  return new;
end;
$$;
create trigger judge_suites_guard before insert or update on devroyale_private.judge_suites
for each row execute function devroyale_private.guard_judge_suite();

create function devroyale_private.guard_judge_suite_tests() returns trigger
language plpgsql set search_path = '' as $$
declare target devroyale_private.judge_suites;
begin
  if tg_op = 'UPDATE' and new.suite_id <> old.suite_id then
    raise exception using errcode = 'P0001', message = 'suite_immutable';
  end if;
  -- Serialize editing against activation/revocation. Active/retired versions are immutable.
  select * into target from devroyale_private.judge_suites
    where id = case when tg_op = 'DELETE' then old.suite_id else new.suite_id end for update;
  if not found or target.state <> 'draft' or target.sealed_at is not null then
    raise exception using errcode = 'P0001', message = 'suite_immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger judge_suite_tests_guard before insert or update or delete on devroyale_private.judge_suite_tests
for each row execute function devroyale_private.guard_judge_suite_tests();

-- Structural entry point for a future PRIVATE provisioner. No grants to API/worker
-- roles: only an explicitly authorized database operator may publish a version.
create function devroyale_private.activate_judge_suite(p_suite_id uuid) returns void
language plpgsql set search_path = '' as $$
declare target devroyale_private.judge_suites;
begin
  select * into target from devroyale_private.judge_suites where id = p_suite_id;
  if not found then raise exception using errcode = 'P0001', message = 'suite_not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('judge-suite:' || target.challenge_id::text || ':' || target.kind, 0));
  perform s.id from devroyale_private.judge_suites s
    where s.challenge_id = target.challenge_id and s.kind = target.kind and (s.id = p_suite_id or s.state = 'active')
    order by s.id for update;
  select * into target from devroyale_private.judge_suites where id = p_suite_id;
  if target.state = 'active' then return; end if;
  if target.state = 'revoked' then raise exception using errcode = 'P0001', message = 'suite_state_invalid'; end if;
  update devroyale_private.judge_suites set state = 'retired'
    where challenge_id = target.challenge_id and kind = target.kind and state = 'active';
  update devroyale_private.judge_suites set state = 'active' where id = p_suite_id;
end;
$$;

create function devroyale_private.judge_mode() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select case when environment = 'production' then 'competitive' else mode end
    from devroyale_private.judge_policy where singleton), 'competitive');
$$;
create or replace function devroyale_private.challenge_is_available(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.multiplayer_challenges c
    join devroyale_private.judge_suites s on s.challenge_id = c.id
    where c.id = p_id and c.is_active and not (c.judge_config ? 'harness')
      and s.kind = devroyale_private.judge_mode() and s.state = 'active'
      and s.sealed_at is not null and not (s.judge_config ? 'harness')
  );
$$;
create function devroyale_private.round_suite_is_available(p_round_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from devroyale_private.multiplayer_round_suites b
    join devroyale_private.judge_suites s on s.id = b.suite_id
    join public.multiplayer_rounds r on r.id = b.round_id and r.challenge_id = s.challenge_id
    join public.multiplayer_challenges c on c.id = r.challenge_id
    where b.round_id = p_round_id and c.is_active and not (c.judge_config ? 'harness')
      and s.kind = devroyale_private.judge_mode() and s.state in ('active', 'retired')
      and s.sealed_at is not null and not (s.judge_config ? 'harness')
  );
$$;
create or replace function devroyale_private.match_has_unavailable_challenge(p_match_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.multiplayer_rounds r where r.match_id = p_match_id
    and not devroyale_private.round_suite_is_available(r.id));
$$;

create function devroyale_private.lock_match_suites(p_match_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare selected_mode text; suite record;
begin
  select mode into selected_mode from devroyale_private.judge_policy where singleton for share;
  selected_mode := coalesce(selected_mode, 'competitive');
  -- Serialize acceptance against revocation/mode changes, retaining the lock until
  -- the entire finalization commits. Read the locked row again after any wait.
  for suite in select s.* from devroyale_private.judge_suites s
    where s.id in (select b.suite_id from devroyale_private.multiplayer_round_suites b
      join public.multiplayer_rounds r on r.id = b.round_id where r.match_id = p_match_id)
    order by s.id for share loop
    if suite.kind <> selected_mode or suite.state not in ('active', 'retired') then
      raise exception using errcode = 'P0001', message = 'challenge_unavailable';
    end if;
  end loop;
end;
$$;

create or replace function devroyale_private.guard_round_challenge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.status in ('waiting', 'active', 'finished') then
    perform devroyale_private.lock_match_suites(new.match_id);
  end if;
  if tg_op = 'UPDATE' and (new.id, new.match_id, new.challenge_id, new.round_number)
     is distinct from (old.id, old.match_id, old.challenge_id, old.round_number) then
    raise exception using errcode = 'P0001', message = 'round_suite_immutable';
  end if;
  if new.status in ('waiting', 'active', 'finished') and (
    (tg_op = 'INSERT' and not devroyale_private.challenge_is_available(new.challenge_id))
    or (tg_op = 'UPDATE' and not devroyale_private.round_suite_is_available(new.id))
    or devroyale_private.match_has_unavailable_challenge(new.match_id)
    or not exists(select 1 from public.multiplayer_matches m join public.multiplayer_challenges c on c.id = new.challenge_id
      where m.id = new.match_id and m.language = c.language and m.difficulty = c.difficulty)
  ) then raise exception using errcode = 'P0001', message = 'challenge_unavailable'; end if;
  return new;
end;
$$;
create function devroyale_private.pin_round_suite() returns trigger
language plpgsql security definer set search_path = '' as $$
declare selected_suite uuid; selected_mode text;
begin
  select mode into selected_mode from devroyale_private.judge_policy where singleton for share;
  select s.id into selected_suite from devroyale_private.judge_suites s
    where s.challenge_id = new.challenge_id and s.kind = coalesce(selected_mode, 'competitive')
      and s.state = 'active' and s.sealed_at is not null and not (s.judge_config ? 'harness')
    for share;
  if selected_suite is null then raise exception using errcode = 'P0001', message = 'challenge_unavailable'; end if;
  insert into devroyale_private.multiplayer_round_suites(round_id, suite_id) values (new.id, selected_suite);
  return new;
end;
$$;
create trigger multiplayer_rounds_pin_suite after insert on public.multiplayer_rounds
for each row execute function devroyale_private.pin_round_suite();
create function devroyale_private.guard_round_suite_binding() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception using errcode = 'P0001', message = 'round_suite_immutable'; end;
$$;
create trigger multiplayer_round_suites_immutable before update on devroyale_private.multiplayer_round_suites
for each row execute function devroyale_private.guard_round_suite_binding();

create or replace function devroyale_private.guard_submission_challenge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status = 'accepted' then
    perform devroyale_private.lock_match_suites(new.match_id);
  end if;
  if (tg_op = 'INSERT' or new.status = 'accepted')
     and devroyale_private.match_has_unavailable_challenge(new.match_id) then
    raise exception using errcode = 'P0001', message = 'challenge_unavailable';
  end if;
  if new.mode = 'submit' then
    -- Enforce at persistence too, including old workers. No raw output, diagnostics
    -- or fine-grained resource measurements from reserved cases reach the client.
    new.stdout := null; new.execution_time := null; new.memory_used := null;
    new.public_message := case new.status
      when 'accepted' then 'Solução aceita.' when 'wrong_answer' then 'Alguns testes ainda falharam.'
      when 'compile_error' then 'Não foi possível compilar sua solução.'
      when 'runtime_error' then 'Sua solução encontrou um erro durante os testes.'
      when 'time_limit' then 'Sua solução excedeu o limite de tempo.'
      when 'validation_error' then 'Sua solução não pôde ser validada.'
      when 'internal_error' then 'O avaliador da Arena está temporariamente indisponível.'
      else 'Solução recebida para avaliação.' end;
  end if;
  return new;
end;
$$;

create or replace function devroyale_private.guard_match_result() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'finished' then
    perform devroyale_private.lock_match_suites(new.id);
    if devroyale_private.match_has_unavailable_challenge(new.id) then
      raise exception using errcode = 'P0001', message = 'challenge_unavailable';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.record_multiplayer_submission_job_error_internal(
  p_submission_id uuid, p_worker_id uuid, p_last_error text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  update devroyale_private.multiplayer_submission_jobs
    set last_error = 'judge_worker_failed', locked_by = null, locked_until = now() + interval '30 seconds'
    where submission_id = p_submission_id and locked_by = p_worker_id;
end;
$$;

create or replace function public.get_multiplayer_judge_payload_internal(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_submission public.multiplayer_submissions;
  target_match public.multiplayer_matches;
  target_round public.multiplayer_rounds;
  target_challenge public.multiplayer_challenges;
  tests_json jsonb;
  target_suite devroyale_private.judge_suites;
begin
  select * into target_submission
  from public.multiplayer_submissions
  where id = p_submission_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;

  select * into target_match from public.multiplayer_matches
  where id = target_submission.match_id;
  select * into target_round from public.multiplayer_rounds
  where id = target_submission.round_id;
  select * into target_challenge from public.multiplayer_challenges
  where id = target_round.challenge_id and is_active;

  if target_challenge.id is null then
    raise exception using errcode = 'P0001', message = 'challenge_not_found';
  end if;

  if not devroyale_private.round_suite_is_available(target_round.id)
     or devroyale_private.match_has_unavailable_challenge(target_match.id) then
    raise exception using errcode = 'P0001', message = 'challenge_unavailable';
  end if;
  select s.* into strict target_suite from devroyale_private.multiplayer_round_suites b
    join devroyale_private.judge_suites s on s.id = b.suite_id where b.round_id = target_round.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'input', tests.input,
        'expected', tests.expected,
        'validatorConfig', tests.validator_config,
        'weight', tests.weight
      ) order by tests.is_public desc, tests.ordinal
    ),
    '[]'::jsonb
  ) into tests_json
  from devroyale_private.judge_suite_tests as tests
  where tests.suite_id = target_suite.id
    and (
      (target_submission.mode = 'run' and tests.is_public)
      or target_submission.mode = 'submit'
    );

  return jsonb_build_object(
    'submissionId', target_submission.id,
    'matchId', target_submission.match_id,
    'roundId', target_submission.round_id,
    'userId', target_submission.user_id,
    'mode', target_submission.mode,
    'sourceCode', target_submission.source_code,
    'language', target_match.language,
    'difficulty', target_match.difficulty,
    'suiteId', target_suite.id,
    'suiteVersion', target_suite.version,
    'validationType', target_suite.validation_type,
    'judgeConfig', target_suite.judge_config,
    'tests', tests_json
  );
end;
$$;



create or replace function public.get_multiplayer_match_state(
  p_match_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.multiplayer_matches;
  target_room public.rooms;
  target_round public.multiplayer_rounds;
  target_previous_round public.multiplayer_rounds;
  target_challenge public.multiplayer_challenges;
  players_json jsonb;
  own_submission_json jsonb;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if p_match_id is null then
    select matches.* into target_match
    from public.multiplayer_matches as matches
    join public.multiplayer_match_players as players
      on players.match_id = matches.id
    where players.user_id = current_user_id
      and matches.status in ('preparing', 'active', 'between_rounds')
    order by matches.created_at desc
    limit 1;
  else
    select * into target_match
    from public.multiplayer_matches
    where id = p_match_id
      and devroyale_private.is_match_participant(id, current_user_id);
  end if;

  if not found then
    return null;
  end if;

  select * into target_room
  from public.rooms
  where id = target_match.room_id;

  select * into target_round
  from public.multiplayer_rounds
  where match_id = target_match.id
    and round_number = target_match.current_round;

  select * into target_previous_round
  from public.multiplayer_rounds
  where match_id = target_match.id
    and round_number = target_match.current_round - 1;

  select * into target_challenge
  from public.multiplayer_challenges
  where id = target_round.challenge_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', players.user_id,
        'roundsWon', players.rounds_won,
        'status', players.status,
        'joinedAt', players.joined_at,
        'username', profiles.username,
        'displayName', profiles.display_name,
        'avatarUrl', profiles.avatar_url
      ) order by players.joined_at, players.user_id
    ),
    '[]'::jsonb
  ) into players_json
  from public.multiplayer_match_players as players
  join public.profiles on profiles.id = players.user_id
  where players.match_id = target_match.id;

  select jsonb_build_object(
    'id', submissions.id,
    'requestId', submissions.client_request_id,
    'mode', submissions.mode,
    'status', submissions.status,
    'createdAt', submissions.created_at,
    'judgingStartedAt', submissions.judging_started_at,
    'judgedAt', submissions.judged_at,
    'executionTime', submissions.execution_time,
    'memoryUsed', submissions.memory_used,
    'message', submissions.public_message,
    'stdout', submissions.stdout
  ) into own_submission_json
  from public.multiplayer_submissions as submissions
  where submissions.round_id = target_round.id
    and submissions.user_id = current_user_id
  order by submissions.created_at desc
  limit 1;

  return jsonb_build_object(
    'match', jsonb_build_object(
      'id', target_match.id,
      'roomId', target_match.room_id,
      'roomKind', target_room.room_kind,
      'status', target_match.status,
      'language', target_match.language,
      'difficulty', target_match.difficulty,
      'matchFormat', target_match.match_format,
      'currentRound', target_match.current_round,
      'winnerId', target_match.winner_id,
      'startedAt', target_match.started_at,
      'finishedAt', target_match.finished_at,
      'cancelledAt', target_match.cancelled_at
    ),
    'evaluationMode', coalesce((select s.kind from devroyale_private.multiplayer_round_suites b
      join devroyale_private.judge_suites s on s.id = b.suite_id where b.round_id = target_round.id), devroyale_private.judge_mode()),
    'unavailable', devroyale_private.match_has_unavailable_challenge(target_match.id),
    'players', players_json,
    'round', jsonb_build_object(
      'id', target_round.id,
      'roundNumber', target_round.round_number,
      'status', target_round.status,
      'winnerId', target_round.winner_id,
      'startedAt', target_round.started_at,
      'finishedAt', target_round.finished_at
    ),
    'previousRound', case
      when target_previous_round.id is null then null
      else jsonb_build_object(
        'id', target_previous_round.id,
        'roundNumber', target_previous_round.round_number,
        'status', target_previous_round.status,
        'winnerId', target_previous_round.winner_id,
        'startedAt', target_previous_round.started_at,
        'finishedAt', target_previous_round.finished_at
      )
    end,
    'challenge', jsonb_build_object(
      'id', target_challenge.id,
      'slug', target_challenge.slug,
      'title', target_challenge.title,
      'statement', target_challenge.statement,
      'instructions', target_challenge.instructions,
      'starterCode', target_challenge.starter_code,
      'publicExamples', target_challenge.public_examples,
      'validationType', target_challenge.validation_type
    ),
    'ownLatestSubmission', own_submission_json
  );
end;
$$;


revoke all on function devroyale_private.guard_judge_suite() from public, anon, authenticated, service_role;
revoke all on function devroyale_private.guard_judge_suite_tests() from public, anon, authenticated, service_role;
revoke all on function devroyale_private.activate_judge_suite(uuid) from public, anon, authenticated, service_role;
revoke all on function devroyale_private.judge_mode() from public, anon, authenticated, service_role;
revoke all on function devroyale_private.round_suite_is_available(uuid) from public, anon, authenticated, service_role;
revoke all on function devroyale_private.pin_round_suite() from public, anon, authenticated, service_role;
revoke all on function devroyale_private.guard_round_suite_binding() from public, anon, authenticated, service_role;
revoke all on function devroyale_private.lock_match_suites(uuid) from public, anon, authenticated, service_role;

commit;
