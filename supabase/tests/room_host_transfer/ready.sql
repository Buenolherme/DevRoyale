-- Real PostgreSQL tests; run only through the disposable room test runner.
begin;
set local statement_timeout = '10s';
set local lock_timeout = '3s';

create function pg_temp.check_true(ok boolean, description text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', description; end if;
end;
$$;

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

create function pg_temp.ready_as(actor uuid, room uuid, ready_value boolean)
returns void language plpgsql as $$
declare result public.rooms;
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  set local role authenticated;
  select * into result from public.set_room_ready(room, ready_value);
  reset role;
  perform pg_temp.check_true(result is not distinct from (select r from public.rooms r where r.id = room),
    'RPC returns the persisted room');
  perform pg_temp.check_true((select ready = ready_value from public.room_members
    where room_id = room and user_id = actor), 'only requested readiness value persisted for caller');
exception when others then
  reset role;
  raise;
end;
$$;

insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', '{"username":"ready_host"}'),
  ('00000000-0000-0000-0000-000000000002', '{"username":"ready_player"}'),
  ('00000000-0000-0000-0000-000000000003', '{"username":"ready_outsider"}');

create function pg_temp.make_room(kind public.room_kind) returns uuid language plpgsql as $$
declare room uuid;
begin
  perform pg_temp.call_as('00000000-0000-0000-0000-000000000001',
    'select public.create_multiplayer_room()');
  select room_id into strict room from public.room_members
    where user_id = '00000000-0000-0000-0000-000000000001';
  perform pg_temp.call_as('00000000-0000-0000-0000-000000000002',
    format('select public.join_room_by_code(%L)', (select code from public.rooms where id = room)));
  -- Only the room kind is fixture-controlled; readiness always uses the real RPC.
  update public.rooms set room_kind = kind where id = room;
  return room;
end;
$$;

create function pg_temp.check_room(room uuid, expected public.room_status, ready_members integer)
returns void language plpgsql as $$
begin
  perform pg_temp.check_true((select status = expected and closed_at is null
    and ((expected = 'starting' and countdown_started_at is not null)
      or (expected <> 'starting' and countdown_started_at is null))
    and host_id = '00000000-0000-0000-0000-000000000001'
    from public.rooms where id = room), 'room status/countdown/owner: ' || expected::text);
  perform pg_temp.check_true((select count(*) filter (where ready) = ready_members
    from public.room_members where room_id = room), 'ready member count');
  perform pg_temp.check_true((select role = 'host' from public.room_members where room_id = room
    and user_id = '00000000-0000-0000-0000-000000000001'), 'host role preserved');
end;
$$;

-- Prove the expression type using the actual PostgreSQL type resolver.
select pg_temp.check_true(pg_typeof(case when true then 'ready' else 'waiting' end) = 'text'::regtype,
  'untyped CASE resolves to text');
select pg_temp.check_true(pg_typeof(case when true then 'ready'::public.room_status
  else 'waiting'::public.room_status end) = 'public.room_status'::regtype, 'typed CASE resolves to room_status');
\echo PASS: CASE type resolution reproduced: text before casts, public.room_status after casts

\if :expect_bug
do $$
declare
  kind public.room_kind;
  room uuid;
  ready_value boolean;
  observed_state text;
begin
  foreach kind in array array['custom', 'quick_match']::public.room_kind[] loop
    room := pg_temp.make_room(kind);
    foreach ready_value in array array[true, false] loop
      observed_state := null;
      begin
        perform pg_temp.ready_as('00000000-0000-0000-0000-000000000002', room, ready_value);
      exception when datatype_mismatch then observed_state := sqlstate;
      end;
      perform pg_temp.check_true(observed_state = '42804', 'pre-fix ready RPC raises 42804');
      perform pg_temp.check_room(room, 'waiting', 0);
    end loop;
    delete from public.rooms where id = room;
  end loop;
end;
$$;
\echo PASS: pre-fix 42804 reproduced for ready/unready in custom and quick rooms; mutations roll back
\else

-- Both readiness orders: host first and player first. No direct ready updates.
savepoint scenario;
do $$
declare
  kind public.room_kind;
  room uuid;
  a constant uuid := '00000000-0000-0000-0000-000000000001';
  b constant uuid := '00000000-0000-0000-0000-000000000002';
  first_player uuid;
  second_player uuid;
begin
  foreach kind in array array['custom', 'quick_match']::public.room_kind[] loop
    foreach first_player in array array[a, b] loop
      room := pg_temp.make_room(kind);
      second_player := case when first_player = a then b else a end;
      perform pg_temp.ready_as(first_player, room, true);
      perform pg_temp.check_room(room, 'waiting', 1);
      perform pg_temp.ready_as(first_player, room, true);
      perform pg_temp.check_room(room, 'waiting', 1);
      perform pg_temp.ready_as(first_player, room, false);
      perform pg_temp.check_room(room, 'waiting', 0);
      perform pg_temp.ready_as(first_player, room, false);
      perform pg_temp.check_room(room, 'waiting', 0);
      perform pg_temp.ready_as(first_player, room, true);
      if kind = 'custom' then
        perform pg_temp.expect_error(a, format('select public.start_room_countdown(%L)', room), 'players_not_ready');
      else
        perform pg_temp.expect_error(a, format('select public.start_room_countdown(%L)', room), 'quick_match_restricted');
      end if;
      perform pg_temp.ready_as(second_player, room, true);
      if kind = 'custom' then
        perform pg_temp.check_room(room, 'ready', 2);
        perform pg_temp.ready_as(second_player, room, true);
        perform pg_temp.check_room(room, 'ready', 2);
        perform pg_temp.ready_as(first_player, room, false);
        perform pg_temp.check_room(room, 'waiting', 1);
        perform pg_temp.ready_as(first_player, room, true);
        perform pg_temp.check_room(room, 'ready', 2);
        perform pg_temp.expect_error(b, format('select public.start_room_countdown(%L)', room), 'host_only');
        perform pg_temp.call_as(a, format('select public.start_room_countdown(%L)', room));
      end if;
      perform pg_temp.check_room(room, 'starting', 2);
      perform pg_temp.expect_error(first_player, format('select public.set_room_ready(%L, false)', room), 'room_ready_locked');
      perform pg_temp.expect_error(second_player, format('select public.set_room_ready(%L, true)', room), 'room_ready_locked');
      perform pg_temp.check_room(room, 'starting', 2);
      perform pg_temp.check_true((select count(*) = 2 from public.room_members where room_id = room), 'both members preserved');
      delete from public.rooms where id = room;
    end loop;
  end loop;
end;
$$;
\echo PASS: host/player ready/unready, repeated calls, two ready, custom manual countdown and quick automatic countdown
rollback to scenario;

savepoint scenario;
do $$
declare kind public.room_kind; room uuid;
begin
  foreach kind in array array['custom', 'quick_match']::public.room_kind[] loop
    room := pg_temp.make_room(kind);
    delete from public.room_members where room_id = room and role = 'player';
    perform pg_temp.ready_as('00000000-0000-0000-0000-000000000001', room, true);
    perform pg_temp.check_room(room, 'waiting', 1);
    perform pg_temp.ready_as('00000000-0000-0000-0000-000000000001', room, false);
    perform pg_temp.check_room(room, 'waiting', 0);
    delete from public.rooms where id = room;
  end loop;
end;
$$;
\echo PASS: a single ready participant never starts either room kind
rollback to scenario;

savepoint scenario;
do $$
declare
  kind public.room_kind;
  state public.room_status;
  room uuid;
  actor uuid;
  ready_value boolean;
  before_room jsonb;
  before_members jsonb;
begin
  foreach kind in array array['custom', 'quick_match']::public.room_kind[] loop
    room := pg_temp.make_room(kind);
    perform pg_temp.expect_error(null, format('select public.set_room_ready(%L, true)', room), 'room_not_found');
    perform pg_temp.expect_error('00000000-0000-0000-0000-000000000003',
      format('select public.set_room_ready(%L, true)', room), 'not_room_member');
    perform pg_temp.expect_error('00000000-0000-0000-0000-000000000001',
      format('select public.set_room_ready(%L, true)', gen_random_uuid()), 'room_not_found');
    perform pg_temp.check_room(room, 'waiting', 0);
    foreach state in array array['starting', 'in_match', 'finished', 'cancelled']::public.room_status[] loop
      update public.rooms set status = state,
        countdown_started_at = case when state = 'starting' then now() else null end,
        closed_at = case when state in ('finished', 'cancelled') then now() else null end
        where id = room;
      select to_jsonb(r) into before_room from public.rooms r where id = room;
      select jsonb_agg(to_jsonb(m) order by user_id) into before_members from public.room_members m where room_id = room;
      foreach actor in array array['00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002']::uuid[] loop
        foreach ready_value in array array[true, false] loop
          perform pg_temp.expect_error(actor, format('select public.set_room_ready(%L, %L)', room, ready_value), 'room_ready_locked');
        end loop;
      end loop;
      perform pg_temp.check_true((select to_jsonb(r) = before_room from public.rooms r where id = room), 'locked room unchanged');
      perform pg_temp.check_true((select jsonb_agg(to_jsonb(m) order by user_id) = before_members
        from public.room_members m where room_id = room), 'locked members unchanged');
    end loop;
    delete from public.rooms where id = room;
  end loop;
  perform pg_temp.check_true(not has_function_privilege('anon', 'public.set_room_ready(uuid,boolean)', 'execute'), 'anon grant denied');
  perform pg_temp.check_true(has_function_privilege('authenticated', 'public.set_room_ready(uuid,boolean)', 'execute'), 'authenticated grant preserved');
end;
$$;
\echo PASS: missing user/room, nonmember, all locked statuses and RPC grants; rejected calls preserve state
rollback to scenario;
\endif
rollback;
