-- PUBLIC SYNTHETIC FIXTURES, ONLY FOR THE DISPOSABLE TEST DATABASE.
-- Competitive-kind rows exercise permissions/versioning, never real contest data.
begin;
set local statement_timeout = '20s';
set local lock_timeout = '3s';
create function pg_temp.check_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end;
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
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
declare actual text;
begin
 begin execute statement; exception when sqlstate 'P0001' then actual:=sqlerrm; end;
 perform pg_temp.check_true(actual=expected,'expected sanitized error: '||expected);
end;
$$;
create function pg_temp.denied(statement text, actor_role text default 'authenticated') returns void language plpgsql as $$
declare denied boolean:=false;
begin
 execute format('set local role %I',actor_role);
 begin execute statement; exception when insufficient_privilege then denied:=true; end;
 reset role;
 perform pg_temp.check_true(denied,'restricted access: '||actor_role);
end;
$$;
insert into auth.users(id,raw_user_meta_data) values
 ('a4000000-0000-0000-0000-000000000001','{"username":"suite_host"}'),
 ('a4000000-0000-0000-0000-000000000002','{"username":"suite_guest"}');

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



select pg_temp.check_true(devroyale_private.judge_mode()='competitive','competitive is fail-closed default');
do $$
declare rejected boolean:=false;
begin
 begin update devroyale_private.judge_policy set mode='demo'; exception when check_violation then rejected:=true; end;
 perform pg_temp.check_true(rejected,'production configuration cannot enable demo mode');
end;
$$;
select pg_temp.check_true(not exists(select 1 from devroyale_private.judge_suites where kind='competitive'),'migrations/seed never install competitive data');
select pg_temp.check_true((select count(*)=53 from devroyale_private.judge_suites where kind='demo' and state='active'),'53 demo challenges reproducible');
select pg_temp.check_true(not exists(select 1 from public.multiplayer_challenges where devroyale_private.challenge_is_available(id)),'demo cannot qualify as competitive');
select pg_temp.check_true(devroyale_private.select_multiplayer_challenge(gen_random_uuid(),'javascript','advanced') is null,'no fallback');
select set_config('request.jwt.claim.sub','a4000000-0000-0000-0000-000000000001',true);
select pg_temp.expect_error('select public.create_multiplayer_room(''private'',''javascript'',''advanced'')','challenge_pool_unavailable');
select pg_temp.expect_error('select public.join_quick_match_queue(''javascript'',''advanced'')','challenge_pool_unavailable');
select pg_temp.check_true(not exists(select 1 from public.rooms) and not exists(select 1 from public.matchmaking_queue),'no impossible room/ticket created');
do $$
declare role_name text; table_name text;
begin
 foreach role_name in array array['anon','authenticated','service_role'] loop
  foreach table_name in array array['judge_policy','judge_suites','judge_suite_tests','multiplayer_round_suites'] loop
   perform pg_temp.denied(format('select * from devroyale_private.%I',table_name),role_name);
   perform pg_temp.denied(format('delete from devroyale_private.%I',table_name),role_name);
  end loop;
  perform pg_temp.denied('update devroyale_private.judge_policy set mode=''demo''',role_name);
  perform pg_temp.denied('select devroyale_private.activate_judge_suite(gen_random_uuid())',role_name);
 end loop;
 perform pg_temp.denied('select public.get_multiplayer_judge_payload_internal(gen_random_uuid())');
 perform pg_temp.denied('select devroyale_private.judge_mode()');
end;
$$;
select pg_temp.check_true((select bool_and(relrowsecurity) from pg_class where oid in (
 'devroyale_private.judge_policy'::regclass,'devroyale_private.judge_suites'::regclass,
 'devroyale_private.judge_suite_tests'::regclass,'devroyale_private.multiplayer_round_suites'::regclass)), 'private tables have RLS');
\echo PASS: competitive default rejects demos; no impossible matches; RLS/grants deny ordinary users and worker writes

do $$
declare battle uuid; public_state jsonb;
begin
 update devroyale_private.judge_policy set environment='local',mode='demo';
 battle:=pg_temp.make_match('bo1');
 public_state:=public.get_multiplayer_match_state(battle);
 perform pg_temp.check_true(public_state->>'evaluationMode'='demo','UI identifies demo mode');
 update devroyale_private.judge_policy set mode='competitive';
 perform pg_temp.check_true(devroyale_private.match_has_unavailable_challenge(battle),'demo cannot become competitive');
 perform pg_temp.expect_error(format('select public.surrender_multiplayer_match(%L)',battle),'challenge_unavailable');
 perform public.cancel_unavailable_multiplayer_match(battle);
 perform pg_temp.check_true((select winner_id is null and status='cancelled' from public.multiplayer_matches where id=battle),'scoreless cancellation');
end;
$$;
\echo PASS: explicit demo opt-in works; switching mode never upgrades an existing demo round
update devroyale_private.judge_policy set environment='production',mode='competitive';

do $$
declare exposed devroyale_private.judge_suites; copy_id uuid;
begin
 select * into strict exposed from devroyale_private.judge_suites
 where challenge_id='a4000000-0000-4000-8000-000000000001' and kind='demo';
 insert into devroyale_private.judge_suites(challenge_id,version,kind,provenance,validation_type,judge_config)
 values(exposed.challenge_id,1,'competitive','private_provisioning',exposed.validation_type,exposed.judge_config) returning id into copy_id;
 insert into devroyale_private.judge_suite_tests(suite_id,is_public,ordinal,input,expected,validator_config,weight)
 select copy_id,is_public,ordinal,input,expected,validator_config,weight from devroyale_private.judge_suite_tests where suite_id=exposed.id;
 perform pg_temp.expect_error(format('select devroyale_private.activate_judge_suite(%L)',copy_id),'suite_not_valid');
end;
$$;
\echo PASS: publicly disclosed demo cases cannot be copied into an active competitive suite

-- Synthetic function f(x)=x+1: every value below is intentionally PUBLIC.
insert into public.multiplayer_challenges
 (id,slug,language,difficulty,title,statement,public_examples,validation_type,judge_config,is_active)
values ('b4000000-0000-4000-8000-000000000001','suite-regression-fixture','javascript','advanced',
 'PUBLIC suite fixture','Test-only f(x)=x+1; never deploy as a real challenge.',
 '[{"input":{"args":[1]},"expected":2}]','function_tests','{"functionName":"fixture"}',true);
create function pg_temp.stage_suite(v integer) returns uuid language plpgsql as $$
declare suite uuid;
begin
 insert into devroyale_private.judge_suites(challenge_id,version,kind,provenance,validation_type,judge_config)
 values ('b4000000-0000-4000-8000-000000000001',v,'competitive','private_provisioning','function_tests','{"functionName":"fixture"}') returning id into suite;
 return suite;
end;
$$;
create function pg_temp.add_cases(suite uuid,v integer) returns void language plpgsql as $$
begin
 insert into devroyale_private.judge_suite_tests(suite_id,is_public,ordinal,input,expected) values
  (suite,true,1,'{"args":[1]}','2'),
  (suite,false,1,jsonb_build_object('args',jsonb_build_array(v+10)),to_jsonb(v+11));
end;
$$;
create function pg_temp.new_submission(battle uuid,mode public.multiplayer_submission_mode) returns uuid language plpgsql as $$
declare sub public.multiplayer_submissions; round_uuid uuid;
begin
 select r.id into strict round_uuid from public.multiplayer_rounds r where r.match_id=battle and r.status='active';
 update public.multiplayer_submissions set created_at=now()-interval '3 seconds' where match_id=battle;
 select * into sub from public.create_multiplayer_submission_internal('a4000000-0000-0000-0000-000000000001',
   battle,round_uuid,gen_random_uuid(),mode,'PUBLIC synthetic fixture source, no execution in SQL tests');
 return sub.id;
end;
$$;

do $$
declare v1 uuid; v2 uuid; v3 uuid; battle uuid; sub uuid; run_sub uuid; round_uuid uuid; before_payload jsonb; resumed jsonb; public_state jsonb;
begin
 v1:=pg_temp.stage_suite(1);
 perform pg_temp.check_true(not devroyale_private.challenge_is_available('b4000000-0000-4000-8000-000000000001'),'draft unavailable');
 perform pg_temp.expect_error(format('select devroyale_private.activate_judge_suite(%L)',v1),'suite_not_valid');
 perform pg_temp.add_cases(v1,1);
 perform devroyale_private.activate_judge_suite(v1);
 battle:=pg_temp.make_match('bo1');
 select id into round_uuid from public.multiplayer_rounds where match_id=battle;
 perform pg_temp.check_true((select suite_id=v1 from devroyale_private.multiplayer_round_suites where round_id=round_uuid),'round pins v1');
 run_sub:=pg_temp.new_submission(battle,'run');
 sub:=pg_temp.new_submission(battle,'submit');
 before_payload:=public.get_multiplayer_judge_payload_internal(sub);
 perform pg_temp.check_true(jsonb_array_length(public.get_multiplayer_judge_payload_internal(run_sub)->'tests')=1,'run only sees example');
 perform pg_temp.check_true(jsonb_array_length(before_payload->'tests')=2 and before_payload->>'suiteVersion'='1','submit gets pinned cases');
 perform public.acquire_multiplayer_submission_lease_internal(sub,'b4000000-0000-4000-8000-000000000011',90);
 perform public.mark_multiplayer_submission_running_internal(sub,'judge0','PUBLIC-synthetic-token',2::smallint,'b4000000-0000-4000-8000-000000000011',90);
 v2:=pg_temp.stage_suite(2);
 perform pg_temp.add_cases(v2,2);
 perform devroyale_private.activate_judge_suite(v2);
 perform pg_temp.check_true((select state='retired' from devroyale_private.judge_suites where id=v1),'v2 retires v1');
 perform pg_temp.check_true(public.get_multiplayer_judge_payload_internal(sub)=before_payload,'pending payload unchanged');
 perform pg_temp.check_true(not devroyale_private.match_has_unavailable_challenge(battle),'retired pinned version remains valid');
 perform pg_temp.expect_error(format('update devroyale_private.judge_suite_tests set expected=''123'' where suite_id=%L',v1),'suite_immutable');
 perform pg_temp.expect_error(format('delete from devroyale_private.judge_suite_tests where suite_id=%L',v2),'suite_immutable');
 perform pg_temp.expect_error(format('update devroyale_private.judge_suites set judge_config=''{}'' where id=%L',v1),'suite_immutable');
 perform pg_temp.expect_error(format('update devroyale_private.multiplayer_round_suites set suite_id=%L where round_id=%L',v2,round_uuid),'round_suite_immutable');
 perform pg_temp.expect_error(format('update public.multiplayer_rounds set challenge_id=''a4000000-0000-4000-8000-000000000001'' where id=%L',round_uuid),'round_suite_immutable');
 update devroyale_private.multiplayer_submission_jobs set locked_until=now()-interval '1 second' where submission_id=sub;
 resumed:=public.acquire_multiplayer_submission_lease_internal(sub,'b4000000-0000-4000-8000-000000000012',90);
 perform pg_temp.check_true(resumed->>'providerToken'='PUBLIC-synthetic-token' and resumed->>'testPosition'='2','resumption keeps token/cursor');
 perform pg_temp.check_true(public.get_multiplayer_judge_payload_internal(sub)=before_payload,'reconciliation still gets v1');
 perform pg_temp.expect_error(format('select public.finalize_multiplayer_submission_internal(%L,''b4000000-0000-4000-8000-000000000011'',''accepted'',''stale'')',sub),'submission_lease_lost');
 perform public.finalize_multiplayer_submission_internal(sub,'b4000000-0000-4000-8000-000000000012','accepted','PUBLIC-SENSITIVE-SENTINEL','PUBLIC-SENSITIVE-SENTINEL',123,456);
 perform public.finalize_multiplayer_submission_internal(sub,'b4000000-0000-4000-8000-000000000012','accepted','retry');
 perform pg_temp.check_true((select sum(rounds_won)=1 from public.multiplayer_match_players where match_id=battle),'exactly one score despite retry');
 perform pg_temp.check_true((select stdout is null and execution_time is null and memory_used is null and public_message='Solução aceita.' from public.multiplayer_submissions where id=sub),'DB sanitizes old-worker outputs');
 public_state:=public.get_multiplayer_match_state(battle);
 perform pg_temp.check_true(public_state->>'evaluationMode'='competitive' and not(public_state->'round' ? 'suiteId') and not(public_state->'challenge' ? 'tests')
  and not(public_state->'challenge' ? 'judgeConfig') and position('PUBLIC-SENSITIVE-SENTINEL' in public_state::text)=0,'frontend has no reserved fields');
 battle:=pg_temp.make_match('bo1');
 perform pg_temp.check_true((select b.suite_id=v2 from devroyale_private.multiplayer_round_suites b join public.multiplayer_rounds r on r.id=b.round_id where r.match_id=battle),'new round gets v2');
 sub:=pg_temp.new_submission(battle,'submit');
 perform public.acquire_multiplayer_submission_lease_internal(sub,'b4000000-0000-4000-8000-000000000012',90);
 update devroyale_private.judge_suites set state='revoked' where id=v2;
 perform pg_temp.expect_error(format('select public.get_multiplayer_judge_payload_internal(%L)',sub),'challenge_unavailable');
 perform pg_temp.expect_error(format('select public.finalize_multiplayer_submission_internal(%L,''b4000000-0000-4000-8000-000000000012'',''accepted'',''cached'')',sub),'challenge_unavailable');
 perform pg_temp.expect_error(format('select public.surrender_multiplayer_match(%L)',battle),'challenge_unavailable');
 perform public.cancel_unavailable_multiplayer_match(battle);
 perform pg_temp.check_true((select winner_id is null and status='cancelled' from public.multiplayer_matches where id=battle),'revoked match cancels without winner');
 perform public.record_multiplayer_submission_job_error_internal(sub,'b4000000-0000-4000-8000-000000000012','PUBLIC-SENSITIVE-SENTINEL');
 perform pg_temp.check_true((select last_error='judge_worker_failed' and locked_by is null and locked_until=now()+interval '30 seconds' from devroyale_private.multiplayer_submission_jobs where submission_id=sub),'sanitized logs; same retry backoff');
 perform pg_temp.check_true(not devroyale_private.challenge_is_available('b4000000-0000-4000-8000-000000000001'),'revoked/retired versions cannot start matches');
 perform pg_temp.expect_error('select public.create_multiplayer_room(''private'',''javascript'',''advanced'')','challenge_pool_unavailable');
 perform pg_temp.expect_error(format('select devroyale_private.activate_judge_suite(%L)',v2),'suite_state_invalid');
 v3:=pg_temp.stage_suite(3);
 perform pg_temp.add_cases(v3,3);
 update devroyale_private.judge_suite_tests set expected='999' where suite_id=v3 and is_public;
 perform pg_temp.expect_error(format('select devroyale_private.activate_judge_suite(%L)',v3),'suite_not_valid');
 perform pg_temp.check_true((select state='draft' from devroyale_private.judge_suites where id=v3),'invalid activation rolled back');
 perform pg_temp.expect_error(format('update devroyale_private.judge_suites set kind=''demo'',provenance=''public_demo'' where id=%L',v3),'suite_immutable');
end;
$$;
\echo PASS: immutable/pinned versions, retries/reconciliation, sanitized output/logs, revocation/cancellation and absent competitive suites
select pg_temp.expect_error(format('update devroyale_private.judge_suites set kind=''competitive'',provenance=''private_provisioning'' where id=%L',id),'suite_immutable')
from devroyale_private.judge_suites where kind='demo' limit 1;
rollback;
