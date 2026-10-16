begin;

-- Atomic catalog replacement. Old rows remain for match history and foreign keys.
update public.multiplayer_challenges set is_active = false
where slug in ('battle-v1-javascript-advanced-1', 'battle-v1-javascript-advanced-2')
   or judge_config ? 'harness';

insert into public.multiplayer_challenges (id, slug, language, difficulty, title, statement, instructions, starter_code, public_examples, validation_type, judge_config, is_active)
select id, slug, language, difficulty, title, statement, instructions, starter_code, public_examples, validation_type, judge_config, is_active
from jsonb_to_recordset($catalog_a4$[{"language":"javascript","difficulty":"advanced","validation_type":"function_tests","is_active":true,"id":"a4000000-0000-4000-8000-000000000001","slug":"javascript-advanced-route-coupon","title":"Rota mínima com um trecho gratuito","statement":"Em um grafo dirigido, encontre o menor custo entre origem e destino. Você pode tornar gratuito no máximo um trecho da rota. Retorne -1 se não houver rota.","instructions":["Implemente menorCusto(n, arestas, origem, destino). Cada aresta é [u, v, custo].","Vértices de 0 a n-1; 1 <= n <= 80; até 400 arestas; custos inteiros de 0 a 1000000.","Podem existir ciclos, laços e arestas paralelas. O cupom é opcional e só pode ser usado uma vez.","Origem igual ao destino tem custo 0. Retorne somente o custo inteiro; qualquer algoritmo correto é aceito."],"starter_code":"function menorCusto(n, arestas, origem, destino) {\n  // Retorne o custo ótimo usando no máximo um cupom.\n}\n","judge_config":{"functionName":"menorCusto"},"public_examples":[{"input":{"args":[4,[[0,1,8],[1,3,3],[0,2,4],[2,3,9]],0,3]},"output":3}]},{"language":"javascript","difficulty":"advanced","validation_type":"function_tests","is_active":true,"id":"a4000000-0000-4000-8000-000000000002","slug":"javascript-advanced-weighted-schedule","title":"Agenda ótima com limite de trabalhos","statement":"Escolha até limite trabalhos sem sobreposição para maximizar o lucro total. Resolver apenas pelo maior lucro ou pelo término mais cedo não garante o ótimo.","instructions":["Implemente lucroMaximo(trabalhos, limite). Cada trabalho é [inicio, fim, lucro].","Até 80 trabalhos; 0 <= limite <= 50; tempos inteiros entre 0 e 1000, com inicio < fim; lucros inteiros entre 0 e 1000000.","Os trabalhos não estão necessariamente ordenados. Um trabalho pode começar exatamente quando outro termina.","Escolher nenhum trabalho é permitido. Retorne somente o lucro máximo inteiro."],"starter_code":"function lucroMaximo(trabalhos, limite) {\n  // Combine compatibilidade de intervalos e o limite de escolhas.\n}\n","judge_config":{"functionName":"lucroMaximo"},"public_examples":[{"input":{"args":[[[1,3,6],[3,5,6],[1,5,10]],2]},"output":12}]},{"language":"javascript","difficulty":"advanced","validation_type":"function_tests","is_active":true,"id":"a4000000-0000-4000-8000-000000000003","slug":"javascript-advanced-critical-path","title":"Prazo mínimo de um projeto com dependências","statement":"Calcule o prazo mínimo para terminar todas as tarefas com paralelismo ilimitado. Uma tarefa só começa após todas as suas dependências. Retorne -1 se houver qualquer ciclo.","instructions":["Implemente tempoProjeto(duracoes, dependencias). [u, v] significa que u deve terminar antes de v começar.","De 1 a 100 tarefas; durações inteiras entre 0 e 1000000; até 500 dependências, sem pares duplicados.","Tarefas sem dependências começam no instante 0. Componentes desconectados também devem terminar.","Detecte ciclos inclusive em componentes desconectados e laços [u,u]. Retorne o prazo inteiro ou -1."],"starter_code":"function tempoProjeto(duracoes, dependencias) {\n  // Considere caminhos críticos e ciclos em todo o projeto.\n}\n","judge_config":{"functionName":"tempoProjeto"},"public_examples":[{"input":{"args":[[3,5,2],[[0,2],[1,2]]]},"output":7}]}]$catalog_a4$::jsonb) as seed(
 id uuid, slug text, language public.room_language, difficulty public.room_difficulty, title text, statement text,
 instructions jsonb, starter_code text, public_examples jsonb, validation_type public.multiplayer_validation_type, judge_config jsonb, is_active boolean);

-- Public examples live in the catalog above. Demonstration cases are installed
-- separately by the explicit local seed; no competitive cases belong here.

create or replace function devroyale_private.challenge_is_available(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.multiplayer_challenges c
    where c.id = p_id and c.is_active and not (c.judge_config ? 'harness')
      and exists (select 1 from devroyale_private.multiplayer_challenge_tests t where t.challenge_id = c.id and t.is_public)
      and exists (select 1 from devroyale_private.multiplayer_challenge_tests t where t.challenge_id = c.id and not t.is_public)
  );
$$;

create or replace function devroyale_private.pool_is_available(
  p_language public.room_language, p_difficulty public.room_difficulty
)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.multiplayer_challenges c
    where c.language = p_language and c.difficulty = p_difficulty
      and devroyale_private.challenge_is_available(c.id));
$$;

create or replace function devroyale_private.match_has_unavailable_challenge(p_match_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  -- Include earlier rounds: a series already affected by an unsafe harness must
  -- not turn its old round advantage into a new match victory.
  select exists (select 1 from public.multiplayer_rounds r where r.match_id = p_match_id
    and not devroyale_private.challenge_is_available(r.challenge_id));
$$;

create or replace function devroyale_private.select_multiplayer_challenge(
  p_match_id uuid, p_language public.room_language, p_difficulty public.room_difficulty
)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.multiplayer_challenges c
  where c.language = p_language and c.difficulty = p_difficulty
    and devroyale_private.challenge_is_available(c.id)
  order by
    exists (select 1 from public.multiplayer_rounds r where r.match_id = p_match_id and r.challenge_id = c.id),
    md5(p_match_id::text || ':' || (select count(*)::text from public.multiplayer_rounds r where r.match_id = p_match_id) || ':' || c.id::text)
  limit 1;
$$;

create or replace function devroyale_private.guard_room_challenge_pool()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Leaving/cancelling an old room must remain possible when its pool disappears.
  if (tg_op = 'INSERT' or new.language <> old.language or new.difficulty <> old.difficulty
      or new.status in ('ready', 'starting', 'in_match'))
     and new.status not in ('finished', 'cancelled')
     and not devroyale_private.pool_is_available(new.language, new.difficulty) then
    raise exception using errcode = 'P0001', message = 'challenge_pool_unavailable';
  end if;
  return new;
end;
$$;
create trigger rooms_require_challenge_pool before insert or update on public.rooms
for each row execute function devroyale_private.guard_room_challenge_pool();

create or replace function devroyale_private.guard_queue_challenge_pool()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('searching', 'matched')
     and not devroyale_private.pool_is_available(new.language, new.difficulty) then
    raise exception using errcode = 'P0001', message = 'challenge_pool_unavailable';
  end if;
  return new;
end;
$$;
create trigger matchmaking_queue_require_challenge_pool before insert or update on public.matchmaking_queue
for each row execute function devroyale_private.guard_queue_challenge_pool();

create or replace function devroyale_private.guard_round_challenge()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('waiting', 'active', 'finished') and (
    not devroyale_private.challenge_is_available(new.challenge_id)
    or devroyale_private.match_has_unavailable_challenge(new.match_id)
    or not exists (select 1 from public.multiplayer_matches m
      join public.multiplayer_challenges c on c.id = new.challenge_id
      where m.id = new.match_id and m.language = c.language and m.difficulty = c.difficulty)
  ) then
    raise exception using errcode = 'P0001', message = 'challenge_unavailable';
  end if;
  return new;
end;
$$;
create trigger multiplayer_rounds_require_available_challenge before insert or update on public.multiplayer_rounds
for each row execute function devroyale_private.guard_round_challenge();

create or replace function devroyale_private.guard_submission_challenge()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- A stale Edge deployment or cached Judge0 token cannot finalize an unsafe run
  -- or submit as accepted. Raising rolls back the whole finalization, including score.
  if (tg_op = 'INSERT' or new.status = 'accepted')
     and devroyale_private.match_has_unavailable_challenge(new.match_id) then
    raise exception using errcode = 'P0001', message = 'challenge_unavailable';
  end if;
  return new;
end;
$$;
create trigger multiplayer_submissions_require_available_challenge before insert or update on public.multiplayer_submissions
for each row execute function devroyale_private.guard_submission_challenge();

create or replace function devroyale_private.guard_match_result()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'finished' and devroyale_private.match_has_unavailable_challenge(new.id) then
    raise exception using errcode = 'P0001', message = 'challenge_unavailable';
  end if;
  return new;
end;
$$;
create trigger multiplayer_matches_require_available_result before update on public.multiplayer_matches
for each row execute function devroyale_private.guard_match_result();

create or replace function public.cancel_unavailable_multiplayer_match(p_match_id uuid)
returns public.multiplayer_matches language plpgsql security definer set search_path = '' as $$
declare
  target_match public.multiplayer_matches;
begin
  select * into target_match from public.multiplayer_matches where id = p_match_id for update;
  if (select auth.uid()) is null or not found
     or not devroyale_private.is_match_participant(p_match_id, (select auth.uid())) then
    raise exception using errcode = 'P0001', message = 'match_not_found';
  end if;
  if target_match.status in ('finished', 'cancelled', 'abandoned') then return target_match; end if;
  if not devroyale_private.match_has_unavailable_challenge(p_match_id) then
    raise exception using errcode = 'P0001', message = 'match_cancellation_unavailable';
  end if;
  update public.multiplayer_rounds set status = 'cancelled'
    where match_id = p_match_id and status in ('waiting', 'active');
  update public.multiplayer_matches set status = 'cancelled', winner_id = null,
    finished_at = null, cancelled_at = now() where id = p_match_id returning * into target_match;
  update public.rooms set status = 'cancelled', countdown_started_at = null, closed_at = now()
    where id = target_match.room_id;
  update public.room_invites set status = 'expired' where room_id = target_match.room_id and status = 'pending';
  update public.matchmaking_queue set status = 'cancelled', matched_room_id = null, matched_at = null
    where matched_room_id = target_match.room_id and status = 'matched';
  delete from public.room_members where room_id = target_match.room_id;
  -- Historical rounds/counters are retained for audit; no winner, loser or new score.
  return target_match;
end;
$$;
revoke all on function public.cancel_unavailable_multiplayer_match(uuid) from public, anon;
grant execute on function public.cancel_unavailable_multiplayer_match(uuid) to authenticated;

revoke all on function devroyale_private.challenge_is_available(uuid) from public, anon, authenticated;
revoke all on function devroyale_private.pool_is_available(public.room_language, public.room_difficulty) from public, anon, authenticated;
revoke all on function devroyale_private.match_has_unavailable_challenge(uuid) from public, anon, authenticated;
revoke all on function devroyale_private.select_multiplayer_challenge(uuid, public.room_language, public.room_difficulty) from public, anon, authenticated;
revoke all on function devroyale_private.guard_room_challenge_pool() from public, anon, authenticated;
revoke all on function devroyale_private.guard_queue_challenge_pool() from public, anon, authenticated;
revoke all on function devroyale_private.guard_round_challenge() from public, anon, authenticated;
revoke all on function devroyale_private.guard_submission_challenge() from public, anon, authenticated;
revoke all on function devroyale_private.guard_match_result() from public, anon, authenticated;

-- Polling may return without writing a ticket when no opponent is present;
-- the queue write trigger alone cannot surface suspension in that path.
create or replace function public.poll_quick_match(p_ticket_id uuid)
returns public.matchmaking_queue language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  current_ticket public.matchmaking_queue;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));
  select * into current_ticket from public.matchmaking_queue
    where ticket_id = p_ticket_id and user_id = current_user_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'queue_ticket_not_found';
  end if;
  if current_ticket.status = 'searching'
     and current_ticket.heartbeat_at < now() - interval '30 seconds' then
    update public.matchmaking_queue set status = 'expired'
      where ticket_id = current_ticket.ticket_id returning * into current_ticket;
    return current_ticket;
  end if;
  if current_ticket.status in ('searching', 'matched')
     and not devroyale_private.pool_is_available(current_ticket.language, current_ticket.difficulty) then
    raise exception using errcode = 'P0001', message = 'challenge_pool_unavailable';
  end if;
  return devroyale_private.try_quick_match(current_ticket.ticket_id, current_user_id);
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

commit;
