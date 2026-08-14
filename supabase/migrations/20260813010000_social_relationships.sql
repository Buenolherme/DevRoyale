begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'friendship_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.friendship_status as enum ('pending', 'accepted', 'rejected');
  end if;
end
$$;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_distinct_users check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair_idx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

create index if not exists friendships_addressee_status_idx
  on public.friendships (addressee_id, status);

create index if not exists friendships_pending_addressee_idx
  on public.friendships (addressee_id, created_at desc)
  where status = 'pending';

create table if not exists public.friend_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friend_blocks_pkey primary key (blocker_id, blocked_id),
  constraint friend_blocks_distinct_users check (blocker_id <> blocked_id)
);

create index if not exists friend_blocks_blocked_id_idx
  on public.friend_blocks (blocked_id);

create schema if not exists devroyale_private;
revoke all on schema devroyale_private from public, anon, authenticated;
grant usage on schema devroyale_private to authenticated;

create or replace function devroyale_private.is_social_pair_blocked(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friend_blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  );
$$;

revoke all on function devroyale_private.is_social_pair_blocked(uuid, uuid) from public;
grant execute on function devroyale_private.is_social_pair_blocked(uuid, uuid) to authenticated;

create or replace function devroyale_private.set_social_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function devroyale_private.invalidate_friendship_after_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair_key text;
begin
  pair_key := least(new.blocker_id, new.blocked_id)::text
    || ':' || greatest(new.blocker_id, new.blocked_id)::text;
  perform pg_advisory_xact_lock(hashtextextended(pair_key, 0));

  update public.friendships
  set status = 'rejected'
  where status <> 'rejected'
    and least(requester_id, addressee_id) = least(new.blocker_id, new.blocked_id)
    and greatest(requester_id, addressee_id) = greatest(new.blocker_id, new.blocked_id);

  return new;
end;
$$;

revoke all on function devroyale_private.set_social_updated_at() from public, anon;
revoke all on function devroyale_private.invalidate_friendship_after_block() from public, anon;
grant execute on function devroyale_private.set_social_updated_at() to authenticated;
grant execute on function devroyale_private.invalidate_friendship_after_block() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'friendships_set_updated_at'
      and tgrelid = 'public.friendships'::regclass
      and not tgisinternal
  ) then
    create trigger friendships_set_updated_at
      before update on public.friendships
      for each row execute procedure devroyale_private.set_social_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'friend_blocks_invalidate_friendship'
      and tgrelid = 'public.friend_blocks'::regclass
      and not tgisinternal
  ) then
    create trigger friend_blocks_invalidate_friendship
      after insert on public.friend_blocks
      for each row execute procedure devroyale_private.invalidate_friendship_after_block();
  end if;
end
$$;

alter table public.friendships enable row level security;
alter table public.friend_blocks enable row level security;

revoke all on table public.friendships from anon, authenticated;
grant select, insert, delete on table public.friendships to authenticated;
grant update (status) on table public.friendships to authenticated;

revoke all on table public.friend_blocks from anon, authenticated;
grant select, insert, delete on table public.friend_blocks to authenticated;

create policy friendships_select_involved
  on public.friendships
  for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_insert_as_requester
  on public.friendships
  for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and requester_id <> addressee_id
    and status = 'pending'
    and not devroyale_private.is_social_pair_blocked(requester_id, addressee_id)
  );

create policy friendships_respond_as_addressee
  on public.friendships
  for update
  to authenticated
  using (
    (select auth.uid()) = addressee_id
    and status = 'pending'
    and not devroyale_private.is_social_pair_blocked(requester_id, addressee_id)
  )
  with check (
    (select auth.uid()) = addressee_id
    and status in ('accepted', 'rejected')
    and not devroyale_private.is_social_pair_blocked(requester_id, addressee_id)
  );

create policy friendships_delete_involved
  on public.friendships
  for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy friend_blocks_select_own
  on public.friend_blocks
  for select
  to authenticated
  using ((select auth.uid()) = blocker_id);

create policy friend_blocks_insert_own
  on public.friend_blocks
  for insert
  to authenticated
  with check (
    (select auth.uid()) = blocker_id
    and blocker_id <> blocked_id
  );

create policy friend_blocks_delete_own
  on public.friend_blocks
  for delete
  to authenticated
  using ((select auth.uid()) = blocker_id);

create or replace function public.send_friend_request(p_addressee_id uuid)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_relationship public.friendships;
  created_relationship public.friendships;
  pair_key text;
begin
  if current_user_id is null or current_user_id = p_addressee_id then
    raise exception using errcode = 'P0001', message = 'social_action_unavailable';
  end if;

  if not exists (select 1 from public.profiles where id = p_addressee_id) then
    raise exception using errcode = 'P0001', message = 'social_action_unavailable';
  end if;

  pair_key := least(current_user_id, p_addressee_id)::text
    || ':' || greatest(current_user_id, p_addressee_id)::text;
  perform pg_advisory_xact_lock(hashtextextended(pair_key, 0));

  if devroyale_private.is_social_pair_blocked(current_user_id, p_addressee_id) then
    raise exception using errcode = 'P0001', message = 'social_action_unavailable';
  end if;

  select *
  into existing_relationship
  from public.friendships
  where least(requester_id, addressee_id) = least(current_user_id, p_addressee_id)
    and greatest(requester_id, addressee_id) = greatest(current_user_id, p_addressee_id)
  for update;

  if found and existing_relationship.status in ('pending', 'accepted') then
    raise exception using errcode = 'P0001', message = 'social_action_unavailable';
  end if;

  if found then
    delete from public.friendships where id = existing_relationship.id;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (current_user_id, p_addressee_id, 'pending')
  returning * into created_relationship;

  return created_relationship;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;

-- O canal devroyale:online é privado e aceita somente eventos de Presence.
create policy devroyale_presence_authenticated_read
  on realtime.messages
  for select
  to authenticated
  using (
    (select realtime.topic()) = 'devroyale:online'
    and realtime.messages.extension = 'presence'
  );

create policy devroyale_presence_authenticated_write
  on realtime.messages
  for insert
  to authenticated
  with check (
    (select realtime.topic()) = 'devroyale:online'
    and realtime.messages.extension = 'presence'
  );

commit;
