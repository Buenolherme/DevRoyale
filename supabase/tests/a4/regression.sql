begin;
set local statement_timeout = '20s';
set local lock_timeout = '3s';

create function pg_temp.check_true(ok boolean, description text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', description; end if; end;
$$;
create function pg_temp.call_as(actor uuid, statement text) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claim.sub', coalesce(actor::text,''), true);
 set local role authenticated;
 execute statement;
 reset role;
exception when others then reset role; raise;
end;
$$;
create function pg_temp.expect_error(actor uuid, statement text, expected text) returns void language plpgsql as $$
declare actual text;
begin
 begin perform pg_temp.call_as(actor,statement); exception when sqlstate 'P0001' then actual:=sqlerrm; end;
 perform pg_temp.check_true(actual=expected,'expected error: '||expected||', got '||coalesce(actual,'none'));
end;
$$;

select pg_temp.check_true((select count(*)=2 and bool_and(not is_active) from public.multiplayer_challenges
 where slug in ('battle-v1-javascript-advanced-1','battle-v1-javascript-advanced-2')), 'both legacy challenges disabled');
select pg_temp.check_true((select count(*)=3 from public.multiplayer_challenges
 where language='javascript' and difficulty='advanced' and devroyale_private.challenge_is_available(id)), 'three advanced replacements');
select pg_temp.check_true((select count(*) filter(where is_public)=3 and count(*) filter(where not is_public)=28
 from devroyale_private.judge_suite_tests t join devroyale_private.judge_suites s on s.id=t.suite_id
 where s.challenge_id::text like 'a4000000-0000-4000-%'), '3 public and 28 non-example DEMO cases');
select pg_temp.check_true(not has_function_privilege('anon','public.cancel_unavailable_multiplayer_match(uuid)','execute'), 'anon cannot cancel');
select pg_temp.check_true(not has_table_privilege('authenticated','devroyale_private.multiplayer_challenge_tests','select'), 'private tests inaccessible');
select pg_temp.check_true(not has_function_privilege('authenticated','devroyale_private.challenge_is_available(uuid)','execute'), 'private helper inaccessible');
\echo PASS: replacement catalog, exact advanced pool, private test ACLs

do $$
declare old record; sub record; payload jsonb; actual text; before_score integer;
begin
 for old in select * from public.a4_test_legacy loop
  perform set_config('request.jwt.claim.sub','a4000000-0000-0000-0000-000000000001',true);
  payload := public.get_multiplayer_match_state(old.match_id);
  perform pg_temp.check_true((payload->>'unavailable')::boolean and payload->'challenge'->>'id'=old.challenge_id::text,
    'old match remains readable and reports unavailability');
  perform pg_temp.check_true(not (payload->'challenge' ? 'judgeConfig') and not (payload->'challenge' ? 'tests'), 'public state excludes private tests');
  select sum(rounds_won) into before_score from public.multiplayer_match_players where match_id=old.match_id;
  for sub in select * from public.multiplayer_submissions where match_id=old.match_id loop
    perform public.acquire_multiplayer_submission_lease_internal(sub.id,'a4000000-0000-0000-0000-000000000099',90);
    actual:=null;
    begin
      perform public.finalize_multiplayer_submission_internal(sub.id,'a4000000-0000-0000-0000-000000000099','accepted','forged cached result');
    exception when sqlstate 'P0001' then actual:=sqlerrm; end;
    perform pg_temp.check_true(actual='challenge_unavailable','old run/submit worker cannot finalize acceptance');
    perform pg_temp.check_true((select status='queued' from public.multiplayer_submissions where id=sub.id),'unsafe finalization fully rolled back');
  end loop;
  perform pg_temp.expect_error('a4000000-0000-0000-0000-000000000001',format('select public.surrender_multiplayer_match(%L)',old.match_id),'challenge_unavailable');
  perform pg_temp.expect_error('a4000000-0000-0000-0000-000000000003',format('select public.cancel_unavailable_multiplayer_match(%L)',old.match_id),'match_not_found');
  perform pg_temp.call_as('a4000000-0000-0000-0000-000000000002',format('select public.cancel_unavailable_multiplayer_match(%L)',old.match_id));
  perform pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.cancel_unavailable_multiplayer_match(%L)',old.match_id));
  perform pg_temp.check_true((select status='cancelled' and winner_id is null and finished_at is null from public.multiplayer_matches where id=old.match_id),'cancellation without winner, idempotent');
  perform pg_temp.check_true((select sum(rounds_won)=before_score and bool_and(status<>'surrendered') from public.multiplayer_match_players where match_id=old.match_id),'no score or surrender penalty');
  perform pg_temp.check_true(not exists(select 1 from public.room_members where room_id=old.room_id),'members released');
  perform pg_temp.check_true(not exists(select 1 from public.room_invites where room_id=old.room_id and status='pending'),'invites expired');
  perform pg_temp.check_true(not exists(select 1 from public.matchmaking_queue where matched_room_id=old.room_id),'matched tickets released');
  for sub in select * from public.multiplayer_submissions where match_id=old.match_id loop
    perform public.finalize_multiplayer_submission_internal(sub.id,'a4000000-0000-0000-0000-000000000099','internal_error','unavailable');
    perform pg_temp.check_true(not exists(select 1 from devroyale_private.multiplayer_submission_jobs where submission_id=sub.id),'pending job can be reconciled without a result');
  end loop;
 end loop;
end;
$$;
\echo PASS: legacy run/submit cached acceptances and surrender blocked; participant-only cancellation is idempotent, no winner/score

create function pg_temp.make_match(fmt public.match_format) returns uuid language plpgsql as $$
declare room uuid; battle uuid;
begin
 perform pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.create_multiplayer_room(''private'',''javascript'',''advanced'',%L)',fmt));
 select room_id into strict room from public.room_members where user_id='a4000000-0000-0000-0000-000000000001';
 perform pg_temp.call_as('a4000000-0000-0000-0000-000000000002',format('select public.join_room_by_code(%L)',(select code from public.rooms where id=room)));
 perform pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.set_room_ready(%L,true)',room));
 perform pg_temp.call_as('a4000000-0000-0000-0000-000000000002',format('select public.set_room_ready(%L,true)',room));
 perform pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.start_room_countdown(%L)',room));
 update public.rooms set countdown_started_at=now()-interval '4 seconds' where id=room;
 perform pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.activate_multiplayer_match(%L)',room));
 select id into strict battle from public.multiplayer_matches where room_id=room;
 return battle;
end;
$$;

create function pg_temp.finish_submission(battle uuid, actor uuid, mode public.multiplayer_submission_mode, outcome public.multiplayer_submission_status)
returns uuid language plpgsql as $$
declare sub public.multiplayer_submissions; round_id uuid; payload jsonb;
begin
 select id into strict round_id from public.multiplayer_rounds where match_id=battle and status='active';
 -- Advance fixture timestamps, never wait on real time or alter application limits.
 update public.multiplayer_submissions set created_at=now()-interval '3 seconds' where match_id=battle;
 select * into sub from public.create_multiplayer_submission_internal(actor,battle,round_id,gen_random_uuid(),mode,'synthetic source, evaluator exercised separately');
 payload:=public.get_multiplayer_judge_payload_internal(sub.id);
 perform pg_temp.check_true(jsonb_array_length(payload->'tests')=case when mode='run' then 1
   when payload->'judgeConfig'->>'functionName'='menorCusto' then 11 else 10 end,'run/public vs submit/private payload');
 perform public.acquire_multiplayer_submission_lease_internal(sub.id,'a4000000-0000-0000-0000-000000000099',90);
 perform public.finalize_multiplayer_submission_internal(sub.id,'a4000000-0000-0000-0000-000000000099',outcome,'synthetic evaluator outcome');
 -- A retry must not increment the score again.
 perform public.finalize_multiplayer_submission_internal(sub.id,'a4000000-0000-0000-0000-000000000099',outcome,'retry');
 return sub.id;
end;
$$;

do $$
declare fmt public.match_format; battle uuid; rounds integer; i integer; actor uuid; first_state jsonb; second_state jsonb;
begin
 foreach fmt in array array['bo1','bo3','bo5']::public.match_format[] loop
  battle:=pg_temp.make_match(fmt);
  perform pg_temp.expect_error('a4000000-0000-0000-0000-000000000001',format('select public.cancel_unavailable_multiplayer_match(%L)',battle),'match_cancellation_unavailable');
  rounds:=case fmt when 'bo1' then 1 when 'bo3' then 3 else 5 end;
  for i in 1..rounds loop
   perform set_config('request.jwt.claim.sub','a4000000-0000-0000-0000-000000000001',true);
   first_state:=public.get_multiplayer_match_state(battle);
   perform set_config('request.jwt.claim.sub','a4000000-0000-0000-0000-000000000002',true);
   second_state:=public.get_multiplayer_match_state(battle);
   perform pg_temp.check_true(first_state->'challenge'=second_state->'challenge' and not (first_state->>'unavailable')::boolean,'same available challenge for both players');
   perform pg_temp.finish_submission(battle,'a4000000-0000-0000-0000-000000000001','run','accepted');
   perform pg_temp.finish_submission(battle,'a4000000-0000-0000-0000-000000000001','submit','internal_error');
   perform pg_temp.check_true((select sum(rounds_won)=i-1 from public.multiplayer_match_players where match_id=battle),'run and judge outage never score');
   actor:=case when i%2=1 then 'a4000000-0000-0000-0000-000000000001'::uuid else 'a4000000-0000-0000-0000-000000000002'::uuid end;
   perform pg_temp.finish_submission(battle,actor,'submit','accepted');
   perform pg_temp.check_true((select sum(rounds_won)=i from public.multiplayer_match_players where match_id=battle),'exactly one score per winning round despite retries');
   if i<rounds then
    perform pg_temp.check_true((select status='between_rounds' from public.multiplayer_matches where id=battle),'series continues');
    update public.multiplayer_rounds set started_at=now()-interval '1 second' where match_id=battle and status='waiting';
    perform pg_temp.call_as(actor,format('select public.advance_multiplayer_round(%L)',battle));
   end if;
  end loop;
  perform pg_temp.check_true((select status='finished' and winner_id='a4000000-0000-0000-0000-000000000001' from public.multiplayer_matches where id=battle),'series winner unchanged');
  perform pg_temp.check_true((select count(distinct challenge_id)=least(rounds,3) from public.multiplayer_rounds where match_id=battle and round_number<=3),'no repeat until all three replacements used');
  perform pg_temp.check_true(not exists(select 1 from public.multiplayer_rounds r join public.multiplayer_challenges c on c.id=r.challenge_id
    where r.match_id=battle and (not c.is_active or c.difficulty<>'advanced' or c.language<>'javascript' or c.judge_config ? 'harness')),'no fallback or vulnerable challenge');
 end loop;
end;
$$;
\echo PASS: BO1/BO3/BO5 through real RPCs; same challenges, no early repeat, run/outage no score, finalize retries idempotent

-- Existing queue and room must fail clearly when their exact pool disappears.
select pg_temp.call_as('a4000000-0000-0000-0000-000000000001', 'select public.join_quick_match_queue(''javascript'',''advanced'')');
select pg_temp.call_as('a4000000-0000-0000-0000-000000000002', 'select public.create_multiplayer_room(''private'',''javascript'',''advanced'')');
savepoint pool_test;
update public.multiplayer_challenges set is_active=false where language='javascript' and difficulty='advanced';
select pg_temp.check_true(devroyale_private.select_multiplayer_challenge(gen_random_uuid(),'javascript','advanced') is null,'empty pool never falls back to easier difficulty');
select pg_temp.expect_error('a4000000-0000-0000-0000-000000000003', 'select public.join_quick_match_queue(''javascript'',''advanced'')','challenge_pool_unavailable');
select pg_temp.expect_error('a4000000-0000-0000-0000-000000000003', 'select public.create_multiplayer_room(''private'',''javascript'',''advanced'')','challenge_pool_unavailable');
select pg_temp.expect_error('a4000000-0000-0000-0000-000000000001',format('select public.poll_quick_match(%L)',ticket_id),'challenge_pool_unavailable') from public.matchmaking_queue where status='searching';
select pg_temp.check_true(not exists(select 1 from public.matchmaking_queue where user_id='a4000000-0000-0000-0000-000000000003' and status in ('searching','matched')),'no impossible ticket created');
select pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.cancel_quick_match(%L)',ticket_id)) from public.matchmaking_queue where status='searching';
select pg_temp.call_as('a4000000-0000-0000-0000-000000000002',format('select public.leave_room(%L)',room_id)) from public.room_members where user_id='a4000000-0000-0000-0000-000000000002';
rollback to pool_test;
select pg_temp.call_as('a4000000-0000-0000-0000-000000000002',format('select public.leave_room(%L)',room_id)) from public.room_members where user_id='a4000000-0000-0000-0000-000000000002';
select pg_temp.call_as('a4000000-0000-0000-0000-000000000002', 'select public.join_quick_match_queue(''javascript'',''advanced'')');
select pg_temp.check_true((select count(*)=2 and count(distinct matched_room_id)=1 from public.matchmaking_queue where status='matched'),'quick matchmaking still pairs exact advanced preferences');
\echo PASS: empty-pool create/join/poll rejected clearly, cancellation/leave still allowed, quick matching resumes without difficulty fallback

select pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.set_room_ready(%L,true)',room_id)) from public.room_members where user_id='a4000000-0000-0000-0000-000000000001';
savepoint ready_pool_test;
update public.multiplayer_challenges set is_active=false where language='javascript' and difficulty='advanced';
select pg_temp.expect_error('a4000000-0000-0000-0000-000000000002',format('select public.set_room_ready(%L,true)',room_id),'challenge_pool_unavailable') from public.room_members where user_id='a4000000-0000-0000-0000-000000000002';
select pg_temp.check_true((select not ready from public.room_members where user_id='a4000000-0000-0000-0000-000000000002'),'failed readiness is rolled back');
rollback to ready_pool_test;
select pg_temp.call_as('a4000000-0000-0000-0000-000000000002',format('select public.set_room_ready(%L,true)',room_id)) from public.room_members where user_id='a4000000-0000-0000-0000-000000000002';
update public.rooms set countdown_started_at=now()-interval '4 seconds' where status='starting';
savepoint activation_pool_test;
update public.multiplayer_challenges set is_active=false where language='javascript' and difficulty='advanced';
select pg_temp.expect_error('a4000000-0000-0000-0000-000000000001',format('select public.activate_multiplayer_match(%L)',room_id),'no_multiplayer_challenge') from public.room_members where user_id='a4000000-0000-0000-0000-000000000001';
select pg_temp.check_true(not exists(select 1 from public.multiplayer_matches m join public.rooms r on r.id=m.room_id where r.status='starting'),'empty activation creates no match');
rollback to activation_pool_test;
select pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.activate_multiplayer_match(%L)',room_id)) from public.room_members where user_id='a4000000-0000-0000-0000-000000000001';
select pg_temp.check_true((select match_format='bo1' and difficulty='advanced' from public.multiplayer_matches where status='active'),'quick activation keeps official BO1 and advanced difficulty');

do $$
declare battle uuid; round_id uuid; mode public.multiplayer_submission_mode; actual text;
begin
 select id into strict battle from public.multiplayer_matches where status='active';
 select id into strict round_id from public.multiplayer_rounds where match_id=battle and status='active';
 update public.multiplayer_challenges set is_active=false where language='javascript' and difficulty='advanced';
 foreach mode in array array['run','submit']::public.multiplayer_submission_mode[] loop
  actual:=null;
  begin
   perform public.create_multiplayer_submission_internal('a4000000-0000-0000-0000-000000000001',battle,round_id,gen_random_uuid(),mode,'fixture');
  exception when sqlstate 'P0001' then actual:=sqlerrm; end;
  perform pg_temp.check_true(actual='challenge_unavailable','new run/submit denied after suspension');
 end loop;
 perform pg_temp.call_as('a4000000-0000-0000-0000-000000000001',format('select public.cancel_unavailable_multiplayer_match(%L)',battle));
 perform pg_temp.check_true((select sum(rounds_won)=0 from public.multiplayer_match_players where match_id=battle),'suspension during active match awards no points');
end;
$$;
\echo PASS: ready/countdown/activation roll back on empty pool; quick BO1 activates normally; new run/submit denied after suspension
rollback;
