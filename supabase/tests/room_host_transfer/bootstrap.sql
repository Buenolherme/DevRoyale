-- ONLY for the empty, disposable PostgreSQL created by check-room-host-transfer.mjs.
do $$
begin
  if current_database() <> 'devroyale_a1_test'
     or to_regclass('public.rooms') is not null then
    raise exception 'Use the disposable host-transfer test runner';
  end if;
end;
$$;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase transport is deliberately stubbed; table triggers still execute.
create schema realtime;
create table realtime.messages (extension text);
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$
  select nullif(current_setting('realtime.topic', true), '');
$$;
create function realtime.send(jsonb, text, text, boolean)
returns void language plpgsql as $$ begin return; end; $$;
