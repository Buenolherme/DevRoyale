-- Real PostgreSQL sessions, connected only to the disposable container itself.
create extension dblink;
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', '{"username":"concurrent_host"}'),
  ('00000000-0000-0000-0000-000000000002', '{"username":"concurrent_player"}');
insert into public.rooms (id, code, host_id) values (
  '00000000-0000-0000-0000-000000000100', 'DR-AAAAA', '00000000-0000-0000-0000-000000000001'
);
insert into public.room_members (room_id, user_id, role) values
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'host'),
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', 'player');

select dblink_connect('departing_host', 'host=127.0.0.1 dbname=devroyale_a1_test user=postgres connect_timeout=5');
select dblink_connect('departing_player', 'host=127.0.0.1 dbname=devroyale_a1_test user=postgres connect_timeout=5');
select dblink_exec('departing_host', 'set statement_timeout = ''10s''; set idle_in_transaction_session_timeout = ''15s''');
select dblink_exec('departing_player', 'set statement_timeout = ''10s''');
set statement_timeout = '15s';

do $$
declare
  host_pid integer;
  player_pid integer;
  blocked boolean := false;
begin
  select pid into host_pid from dblink('departing_host', 'select pg_backend_pid()') as t(pid integer);
  select pid into player_pid from dblink('departing_player', 'select pg_backend_pid()') as t(pid integer);
  perform dblink_exec('departing_host', $remote$
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';
    do $call$ begin
      perform public.leave_room('00000000-0000-0000-0000-000000000100');
    end; $call$;
  $remote$);

  -- The host deletion/promotion must not be visible before its transaction commits.
  if (select count(*) from public.room_members) <> 2
     or not exists (select 1 from public.room_members
       where user_id = '00000000-0000-0000-0000-000000000001' and role = 'host') then
    raise exception 'Uncommitted host transfer leaked to another session';
  end if;

  perform dblink_exec('departing_player', $remote$
    set role authenticated;
    set "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';
  $remote$);
  perform dblink_send_query('departing_player',
    'select public.leave_room(''00000000-0000-0000-0000-000000000100'')');

  for attempt in 1..100 loop
    blocked := host_pid = any(pg_blocking_pids(player_pid));
    exit when blocked;
    perform pg_sleep(0.02);
  end loop;
  if not blocked then raise exception 'Concurrent leave did not wait for the room lock'; end if;

  perform dblink_exec('departing_host', 'commit');
  perform result from dblink_get_result('departing_player') as t(result text);
  if exists (select 1 from public.room_members)
     or not exists (select 1 from public.rooms
       where id = '00000000-0000-0000-0000-000000000100'
         and host_id = '00000000-0000-0000-0000-000000000002'
         and status = 'cancelled' and closed_at is not null
         and countdown_started_at is null) then
    raise exception 'Concurrent departures left an inconsistent room';
  end if;
end;
$$;
select dblink_disconnect('departing_host');
select dblink_disconnect('departing_player');
\echo PASS: concurrent host/player departures serialize on the room lock; no intermediate state is visible
