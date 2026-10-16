-- Synthetic history created BEFORE the replacement migration in the disposable DB.
insert into auth.users (id, raw_user_meta_data) values
 ('a4000000-0000-0000-0000-000000000001', '{"username":"a4_host"}'),
 ('a4000000-0000-0000-0000-000000000002', '{"username":"a4_guest"}'),
 ('a4000000-0000-0000-0000-000000000003', '{"username":"a4_outsider"}');

create table public.a4_test_legacy (match_id uuid, room_id uuid, challenge_id uuid);
do $$
declare c record; room uuid; battle uuid; round_id uuid; mode public.multiplayer_submission_mode;
begin
 for c in select id, slug from public.multiplayer_challenges
   where slug in ('battle-v1-javascript-advanced-1', 'battle-v1-javascript-advanced-2') order by slug loop
  insert into public.rooms (code, host_id, status, language, difficulty, match_format)
    values (case when right(c.slug, 1)='1' then 'DR-A4AA2' else 'DR-A4AA3' end, 'a4000000-0000-0000-0000-000000000001', 'in_match', 'javascript', 'advanced', 'bo3') returning id into room;
  insert into public.multiplayer_matches (room_id, status, language, difficulty, match_format, started_at)
    values (room, 'active', 'javascript', 'advanced', 'bo3', now()) returning id into battle;
  insert into public.multiplayer_match_players (match_id, user_id)
    values (battle,'a4000000-0000-0000-0000-000000000001'), (battle,'a4000000-0000-0000-0000-000000000002');
  insert into public.multiplayer_rounds (match_id, round_number, challenge_id, status, started_at)
    values (battle,1,c.id,'active',now()) returning id into round_id;
  if right(c.slug,1)='2' then
    -- A previous unsafe win must not become a new series victory after migration.
    update public.multiplayer_rounds set status='finished',winner_id='a4000000-0000-0000-0000-000000000001',finished_at=now() where id=round_id;
    update public.multiplayer_match_players set rounds_won=1 where match_id=battle and user_id='a4000000-0000-0000-0000-000000000001';
    update public.multiplayer_matches set current_round=2 where id=battle;
    insert into public.multiplayer_rounds (match_id, round_number, challenge_id, status, started_at)
      values (battle,2,c.id,'active',now()) returning id into round_id;
  end if;
  foreach mode in array array['run','submit']::public.multiplayer_submission_mode[] loop
    insert into public.multiplayer_submissions (client_request_id, match_id, round_id, user_id, mode, source_code)
      values (gen_random_uuid(),battle,round_id,'a4000000-0000-0000-0000-000000000001',mode,'legacy synthetic source');
  end loop;
  insert into public.a4_test_legacy values (battle, room, c.id);
 end loop;
 -- One actual room membership and pending invitation exercise cleanup.
 select room_id into room from public.a4_test_legacy order by room_id limit 1;
 insert into public.room_members(room_id,user_id,role) values
   (room,'a4000000-0000-0000-0000-000000000001','host'),
   (room,'a4000000-0000-0000-0000-000000000002','player');
 insert into public.room_invites(room_id,sender_id,recipient_id) values
   (room,'a4000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000003');
 insert into public.matchmaking_queue(user_id,status,language,difficulty,matched_room_id,matched_at)
   values ('a4000000-0000-0000-0000-000000000001','matched','javascript','advanced',room,now()),
          ('a4000000-0000-0000-0000-000000000002','matched','javascript','advanced',room,now());
end;
$$;
\echo PASS: two vulnerable legacy matches and four pending run/submit jobs staged before migration
