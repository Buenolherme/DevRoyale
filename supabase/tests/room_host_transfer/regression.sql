-- Run through npm run test:rooms:postgres, never against a Supabase project.
begin;
set local statement_timeout = '10s';
set local lock_timeout = '3s';

create function pg_temp.check_true(ok boolean, description text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', description; end if;
end;
$$;

-- Calls use authenticated permissions; fixture/assertion queries use the test owner.
create function pg_temp.call_as(actor uuid, statement text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(actor::text, ''), true);
  set local role authenticated;
  execute statement;
  reset role;
exception when others then
  reset role;
  raise;
end;
$$;

create function pg_temp.expect_error(actor uuid, statement text, expected text)
returns void language plpgsql as $$
declare actual text;
begin
  begin
    perform pg_temp.call_as(actor, statement);
  exception when sqlstate 'P0001' then actual := sqlerrm;
  end;
  perform pg_temp.check_true(actual = expected, 'expected error: ' || expected);
end;
$$;

-- Fixed synthetic users: A = original host, B = player/successor, C = invitee.
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', '{"username":"test_host"}'),
  ('00000000-0000-0000-0000-000000000002', '{"username":"test_player"}'),
  ('00000000-0000-0000-0000-000000000003', '{"username":"test_invitee"}');
insert into public.friendships (requester_id, addressee_id, status) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'accepted'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'accepted');

create function pg_temp.make_room() returns uuid language plpgsql as $$
declare room uuid;
begin
  perform pg_temp.call_as('00000000-0000-0000-0000-000000000001',
    'select public.create_multiplayer_room()');
  select room_id into strict room from public.room_members
    where user_id = '00000000-0000-0000-0000-000000000001';
  perform pg_temp.call_as('00000000-0000-0000-0000-000000000002',
    format('select public.join_room_by_code(%L)', (select code from public.rooms where id = room)));
  return room;
end;
$$;

\if :expect_bug
savepoint original_rpc;
do $$
declare room uuid := pg_temp.make_room();
begin
  perform pg_temp.call_as('00000000-0000-0000-0000-000000000001',
    format('select public.leave_room(%L)', room));
  perform pg_temp.check_true((select count(*) = 1 and bool_and(role = 'player')
    from public.room_members where room_id = room), 'original RPC leaves successor without host role');
  perform pg_temp.check_true((select host_id = '00000000-0000-0000-0000-000000000001'
    from public.rooms where id = room), 'original RPC retains departed host as room owner');
end;
$$;
\echo PASS: original RPC reproduces missing host (current_role resolves to the SQL session role)
rollback to original_rpc;

-- Isolate the second defect: fix ONLY the reserved-name collision in the test
-- transaction, retaining the original promotion-before-deletion statement order.
do $$
begin
  execute replace(pg_get_functiondef('public.leave_room(uuid)'::regprocedure),
    'current_role', 'leaving_member_role');
end;
$$;
do $$
declare
  room uuid := pg_temp.make_room();
  violated_index text;
begin
  begin
    perform pg_temp.call_as('00000000-0000-0000-0000-000000000001',
      format('select public.leave_room(%L)', room));
  exception when unique_violation then
    get stacked diagnostics violated_index = constraint_name;
  end;
  perform pg_temp.check_true(violated_index = 'room_members_one_host_per_room_idx',
    'promotion before deletion violates the unique host index');
  perform pg_temp.check_true((select count(*) = 2 from public.room_members where room_id = room),
    'failed pre-fix call must retain both members');
end;
$$;
\echo PASS: renaming alone reproduces room_members_one_host_per_room_idx; failed call rolls back
\else

-- Host departure must work in all lobby states, preserving exactly the successor.
savepoint scenario;
do $$
declare
  room uuid;
  lobby_state text;
  old_host constant uuid := '00000000-0000-0000-0000-000000000001';
  successor constant uuid := '00000000-0000-0000-0000-000000000002';
begin
  foreach lobby_state in array array['waiting', 'ready', 'starting'] loop
    room := pg_temp.make_room();
    perform pg_temp.call_as(old_host, format('select public.send_room_invite(%L, %L)',
      room, '00000000-0000-0000-0000-000000000003'));
    if lobby_state <> 'waiting' then
      perform pg_temp.call_as(old_host, format('select public.set_room_ready(%L, true)', room));
      perform pg_temp.call_as(successor, format('select public.set_room_ready(%L, true)', room));
    end if;
    if lobby_state = 'starting' then
      perform pg_temp.call_as(old_host, format('select public.start_room_countdown(%L)', room));
    end if;
    perform pg_temp.check_true((select status::text = lobby_state from public.rooms where id = room),
      'fixture reached requested lobby state');
    perform pg_temp.call_as(old_host, format('select public.leave_room(%L)', room));
    perform pg_temp.check_true((select count(*) = 1 and bool_and(
      user_id = successor and role = 'host' and not ready)
      from public.room_members where room_id = room), 'only the successor remains, as unready host');
    perform pg_temp.check_true((select host_id = successor and status = 'waiting'
      and countdown_started_at is null and closed_at is null from public.rooms where id = room),
      'room owner and lobby state match successor');
    perform pg_temp.check_true((select count(*) = 1 and bool_and(status = 'expired')
      from public.room_invites where room_id = room), 'old host pending invites expire');
    perform pg_temp.expect_error(old_host, format('select public.leave_room(%L)', room), 'not_room_member');
    delete from public.rooms where id = room;
  end loop;
end;
$$;
\echo PASS: host exit in waiting, ready and countdown; invitations expire; repeated exit is rejected
rollback to scenario;

savepoint scenario;
do $$
declare
  room uuid := pg_temp.make_room();
  a constant uuid := '00000000-0000-0000-0000-000000000001';
  b constant uuid := '00000000-0000-0000-0000-000000000002';
  c constant uuid := '00000000-0000-0000-0000-000000000003';
  old_invite uuid;
  new_invite uuid;
begin
  perform pg_temp.call_as(a, format('select public.send_room_invite(%L, %L)', room, c));
  select id into strict old_invite from public.room_invites where room_id = room;
  perform pg_temp.call_as(a, format('select public.leave_room(%L)', room));
  perform pg_temp.expect_error(c, format('select public.accept_room_invite(%L)', old_invite), 'invite_unavailable');
  perform pg_temp.expect_error(a, format('select public.send_room_invite(%L, %L)', room, c), 'host_only');
  perform pg_temp.expect_error(a, format('select public.kick_room_member(%L, %L)', room, b), 'host_only');
  perform pg_temp.expect_error(a, format('select public.start_room_countdown(%L)', room), 'host_only');
  perform pg_temp.expect_error(a, format('select public.set_room_ready(%L, true)', room), 'not_room_member');
  perform pg_temp.expect_error(b, format('select public.start_room_countdown(%L)', room), 'players_not_ready');
  perform pg_temp.call_as(b, format('select public.send_room_invite(%L, %L)', room, c));
  select id into strict new_invite from public.room_invites where room_id = room and status = 'pending';
  perform pg_temp.call_as(c, format('select public.accept_room_invite(%L)', new_invite));
  perform pg_temp.check_true((select status = 'accepted' from public.room_invites where id = new_invite),
    'successor invite can be accepted');
  perform pg_temp.call_as(b, format('select public.set_room_ready(%L, true)', room));
  perform pg_temp.call_as(c, format('select public.set_room_ready(%L, true)', room));
  perform pg_temp.call_as(b, format('select public.start_room_countdown(%L)', room));
  perform pg_temp.check_true((select status = 'starting' and countdown_started_at is not null
    from public.rooms where id = room), 'successor can start countdown');
  perform pg_temp.call_as(b, format('select public.kick_room_member(%L, %L)', room, c));
  perform pg_temp.check_true((select count(*) = 1 and bool_and(user_id = b and role = 'host' and not ready)
    from public.room_members where room_id = room), 'successor can kick without losing host membership');
  perform pg_temp.check_true((select status = 'waiting' and countdown_started_at is null
    from public.rooms where id = room), 'kick resets countdown');
  perform pg_temp.call_as(b, format('select public.send_room_invite(%L, %L)', room, c));
  perform pg_temp.call_as(b, format('select public.leave_room(%L)', room));
  perform pg_temp.check_true(not exists (select 1 from public.room_members where room_id = room), 'last member removed');
  perform pg_temp.check_true((select status = 'cancelled' and closed_at is not null
    and countdown_started_at is null from public.rooms where id = room), 'last departure closes room');
  perform pg_temp.check_true(not exists (select 1 from public.room_invites where room_id = room and status = 'pending'),
    'last departure expires pending invites');
  perform pg_temp.check_true((select status = 'accepted' from public.room_invites where id = new_invite),
    'accepted invitation history preserved');
end;
$$;
\echo PASS: new host permissions, old host denial, invite acceptance, kick, ready RPC/reset, countdown, last-player exit
rollback to scenario;

savepoint scenario;
do $$
declare
  room uuid := pg_temp.make_room();
  a constant uuid := '00000000-0000-0000-0000-000000000001';
  b constant uuid := '00000000-0000-0000-0000-000000000002';
begin
  perform pg_temp.call_as(a, format('select public.send_room_invite(%L, %L)', room,
    '00000000-0000-0000-0000-000000000003'));
  perform pg_temp.call_as(a, format('select public.set_room_ready(%L, true)', room));
  perform pg_temp.call_as(b, format('select public.set_room_ready(%L, true)', room));
  perform pg_temp.call_as(a, format('select public.start_room_countdown(%L)', room));
  perform pg_temp.call_as(b, format('select public.leave_room(%L)', room));
  perform pg_temp.check_true((select count(*) = 1 and bool_and(user_id = a and role = 'host' and not ready)
    from public.room_members where room_id = room), 'player departure retains original host');
  perform pg_temp.check_true((select host_id = a and status = 'waiting' and countdown_started_at is null
    from public.rooms where id = room), 'player departure resets countdown');
  perform pg_temp.check_true((select status = 'pending' from public.room_invites where room_id = room),
    'unchanged host retains pending invite');
end;
$$;
\echo PASS: ordinary player exit retains host and invite, clears ready and countdown
rollback to scenario;

-- A failure after deleting the old host must roll back the entire RPC.
savepoint scenario;
create function pg_temp.fail_promotion() returns trigger language plpgsql as $$
begin
  if new.role = 'host' and old.role = 'player' then raise exception 'injected_promotion_failure'; end if;
  return new;
end;
$$;
create trigger fail_promotion before update on public.room_members
  for each row execute function pg_temp.fail_promotion();
do $$
declare room uuid := pg_temp.make_room();
begin
  perform pg_temp.expect_error('00000000-0000-0000-0000-000000000001',
    format('select public.leave_room(%L)', room), 'injected_promotion_failure');
  perform pg_temp.check_true((select count(*) = 2 from public.room_members where room_id = room), 'rollback restores both members');
  perform pg_temp.check_true((select role = 'host' from public.room_members where room_id = room
    and user_id = '00000000-0000-0000-0000-000000000001'), 'rollback restores original host');
  perform pg_temp.check_true((select host_id = '00000000-0000-0000-0000-000000000001'
    from public.rooms where id = room), 'rollback preserves room owner');
end;
$$;
\echo PASS: injected promotion error rolls back departing-member deletion
rollback to scenario;

savepoint scenario;
do $$
declare
  room uuid := pg_temp.make_room();
  match_state public.multiplayer_match_status;
begin
  perform pg_temp.expect_error(null, format('select public.leave_room(%L)', room), 'room_not_found');
  perform pg_temp.expect_error('00000000-0000-0000-0000-000000000003',
    format('select public.leave_room(%L)', room), 'not_room_member');
  foreach match_state in array array['preparing', 'active', 'between_rounds']::public.multiplayer_match_status[] loop
    insert into public.multiplayer_matches (room_id, status, language, difficulty, match_format, started_at)
      values (room, match_state, 'python', 'basic', 'bo1', now());
    perform pg_temp.expect_error('00000000-0000-0000-0000-000000000001',
      format('select public.leave_room(%L)', room), 'match_in_progress_use_surrender');
    perform pg_temp.check_true((select count(*) = 2 from public.room_members where room_id = room), 'active match members unchanged');
    delete from public.multiplayer_matches where room_id = room;
  end loop;
  perform pg_temp.check_true(not has_function_privilege('anon', 'public.leave_room(uuid)', 'execute'), 'anon cannot execute RPC');
  perform pg_temp.check_true(has_function_privilege('authenticated', 'public.leave_room(uuid)', 'execute'), 'authenticated grant preserved');
end;
$$;
\echo PASS: authentication, membership and active-match guards; RPC grants preserved
rollback to scenario;

savepoint scenario;
do $$
declare room uuid := pg_temp.make_room();
begin
  update public.rooms set room_kind = 'quick_match' where id = room;
  insert into public.matchmaking_queue (user_id, status, language, difficulty, matched_room_id, matched_at)
    select user_id, 'matched', 'python', 'basic', room, now() from public.room_members where room_id = room;
  perform pg_temp.call_as('00000000-0000-0000-0000-000000000001', format('select public.leave_room(%L)', room));
  perform pg_temp.check_true(not exists (select 1 from public.room_members where room_id = room), 'quick match removes both members');
  perform pg_temp.check_true((select status = 'cancelled' and closed_at is not null from public.rooms where id = room), 'quick match closes room');
  perform pg_temp.check_true((select count(*) = 2 and bool_and(status = 'cancelled'
    and matched_room_id is null and matched_at is null) from public.matchmaking_queue), 'quick match tickets cancelled');
end;
$$;
\echo PASS: quick-match cancellation behavior preserved
rollback to scenario;
\endif

rollback;
