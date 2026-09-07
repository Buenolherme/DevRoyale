-- DevRoyale V2.0E â€” roteiro manual de RLS e autoridade do judge.
-- Execute cada bloco separadamente em banco LOCAL/DE TESTE, depois de substituir
-- UUID_A, UUID_B, UUID_C, MATCH_ID e ROUND_ID. Blocos EXPECTED ERROR devem falhar.

-- C não participa: RPC segura retorna null e SELECTs diretos não retornam linhas.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_C', true);
select public.get_multiplayer_match_state('MATCH_ID'::uuid);
select * from public.multiplayer_matches where id = 'MATCH_ID'::uuid;
select * from public.multiplayer_match_players where match_id = 'MATCH_ID'::uuid;
select * from public.multiplayer_rounds where match_id = 'MATCH_ID'::uuid;
select * from public.multiplayer_submissions where match_id = 'MATCH_ID'::uuid;
rollback;

-- A enxerga somente as próprias submissions; a consulta não deve conter linhas de B.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
select id, user_id, mode, status, source_code
from public.multiplayer_submissions
where match_id = 'MATCH_ID'::uuid;
rollback;

-- UPDATE de resultado/winner/placar pelo browser é proibido. EXPECTED ERROR.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
update public.multiplayer_submissions set status = 'accepted' where match_id = 'MATCH_ID'::uuid;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
update public.multiplayer_rounds set winner_id = 'UUID_A'::uuid where id = 'ROUND_ID'::uuid;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
update public.multiplayer_matches set winner_id = 'UUID_A'::uuid where id = 'MATCH_ID'::uuid;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
update public.multiplayer_match_players
set rounds_won = 99
where match_id = 'MATCH_ID'::uuid and user_id = 'UUID_A'::uuid;
rollback;

-- INSERT direto e RPC interna de criação são service-role-only. EXPECTED ERROR.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
insert into public.multiplayer_submissions (
  client_request_id, match_id, round_id, user_id, mode, source_code
) values (
  gen_random_uuid(), 'MATCH_ID'::uuid, 'ROUND_ID'::uuid, 'UUID_A'::uuid, 'submit', 'print(1)'
);
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
select public.create_multiplayer_submission_internal(
  'UUID_A'::uuid,
  'MATCH_ID'::uuid,
  'ROUND_ID'::uuid,
  gen_random_uuid(),
  'submit',
  'print(1)'
);
rollback;

-- Hidden tests, expected e jobs externos são privados. EXPECTED ERROR.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
select judge_config from public.multiplayer_challenges;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
select * from devroyale_private.multiplayer_challenge_tests;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
select * from devroyale_private.multiplayer_submission_jobs;
rollback;

-- Finalização oficial é service-role-only. EXPECTED ERROR.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'UUID_A', true);
select public.finalize_multiplayer_submission_internal(
  'SUBMISSION_ID'::uuid,
  'accepted',
  'spoof',
  null,
  null,
  null
);
rollback;

-- Consultas administrativas para conferir invariantes depois dos testes A/B.
-- Execute como postgres/service role somente em ambiente local/de teste.
select m.id, m.room_id, m.status, m.match_format, m.current_round, m.winner_id,
       count(distinct p.user_id) as players
from public.multiplayer_matches as m
join public.multiplayer_match_players as p on p.match_id = m.id
where m.id = 'MATCH_ID'::uuid
group by m.id;

select r.round_number, r.challenge_id, r.status, r.winner_id, r.started_at, r.finished_at
from public.multiplayer_rounds as r
where r.match_id = 'MATCH_ID'::uuid
order by r.round_number;

select p.user_id, p.rounds_won, p.status
from public.multiplayer_match_players as p
where p.match_id = 'MATCH_ID'::uuid
order by p.joined_at;

-- Um round nunca pode ter dois winners e o placar não pode exceder rounds finalizados.
select
  count(*) filter (where status = 'finished') as finished_rounds,
  count(*) filter (where winner_id is not null) as rounds_with_winner,
  count(distinct challenge_id) as distinct_challenges
from public.multiplayer_rounds
where match_id = 'MATCH_ID'::uuid;
