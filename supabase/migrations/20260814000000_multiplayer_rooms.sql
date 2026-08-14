begin;

create type public.room_visibility as enum ('public', 'private');
create type public.room_status as enum (
  'waiting',
  'ready',
  'starting',
  'in_match',
  'finished',
  'cancelled'
);
create type public.room_language as enum ('python', 'javascript', 'sql', 'html-css');
create type public.room_difficulty as enum ('never', 'basic', 'intermediate', 'advanced');
create type public.match_format as enum ('bo1', 'bo3', 'bo5');
create type public.room_member_role as enum ('host', 'player');
create type public.room_invite_status as enum ('pending', 'accepted', 'declined', 'expired');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  host_id uuid not null references public.profiles (id) on delete restrict,
  visibility public.room_visibility not null default 'private',
  status public.room_status not null default 'waiting',
  language public.room_language not null default 'python',
  difficulty public.room_difficulty not null default 'basic',
  match_format public.match_format not null default 'bo1',
  allow_spectators boolean not null default false,
  max_players integer not null default 2,
  countdown_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint rooms_code_format check (code ~ '^DR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$'),
  constraint rooms_v2_two_players_only check (max_players = 2),
  constraint rooms_countdown_consistency check (
    (status = 'starting' and countdown_started_at is not null)
    or (status <> 'starting' and countdown_started_at is null)
  ),
  constraint rooms_closed_consistency check (
    (status in ('finished', 'cancelled') and closed_at is not null)
    or (status not in ('finished', 'cancelled') and closed_at is null)
  )
);

create unique index rooms_code_case_insensitive_idx on public.rooms (upper(code));
create index rooms_host_id_idx on public.rooms (host_id);
create index rooms_status_idx on public.rooms (status);
create index rooms_public_active_idx
  on public.rooms (created_at desc)
  where visibility = 'public' and status in ('waiting', 'ready');

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.room_member_role not null default 'player',
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_members_pkey primary key (room_id, user_id)
);

create unique index room_members_one_active_room_per_user_idx
  on public.room_members (user_id);
create index room_members_room_id_idx on public.room_members (room_id);

create unique index room_members_one_host_per_room_idx
  on public.room_members (room_id)
  where role = 'host';

create table public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status public.room_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  constraint room_invites_distinct_users check (sender_id <> recipient_id),
  constraint room_invites_expiry_after_creation check (expires_at > created_at)
);

create unique index room_invites_one_pending_recipient_idx
  on public.room_invites (room_id, recipient_id)
  where status = 'pending';
create index room_invites_recipient_status_idx
  on public.room_invites (recipient_id, status, created_at desc);
create index room_invites_room_id_idx on public.room_invites (room_id);

create or replace function devroyale_private.set_room_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute procedure devroyale_private.set_room_updated_at();

create trigger room_members_set_updated_at
  before update on public.room_members
  for each row execute procedure devroyale_private.set_room_updated_at();

create or replace function devroyale_private.is_room_member(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members
    where room_id = p_room_id and user_id = p_user_id
  );
$$;

create or replace function devroyale_private.can_access_room_topic(
  p_topic text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members
    where user_id = p_user_id
      and p_topic = 'room:' || room_id::text
  );
$$;

create or replace function devroyale_private.are_friends(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(first_user, second_user)
      and greatest(requester_id, addressee_id) = greatest(first_user, second_user)
  );
$$;

create or replace function devroyale_private.generate_room_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea := uuid_send(gen_random_uuid());
  generated text := 'DR-';
  position integer;
begin
  for position in 0..4 loop
    generated := generated || substr(
      alphabet,
      (get_byte(random_bytes, position) % length(alphabet)) + 1,
      1
    );
  end loop;
  return generated;
end;
$$;

revoke all on function devroyale_private.set_room_updated_at() from public, anon, authenticated;
revoke all on function devroyale_private.is_room_member(uuid, uuid) from public, anon;
revoke all on function devroyale_private.can_access_room_topic(text, uuid) from public, anon;
revoke all on function devroyale_private.are_friends(uuid, uuid) from public, anon;
revoke all on function devroyale_private.generate_room_code() from public, anon, authenticated;
grant execute on function devroyale_private.is_room_member(uuid, uuid) to authenticated;
grant execute on function devroyale_private.can_access_room_topic(text, uuid) to authenticated;
grant execute on function devroyale_private.are_friends(uuid, uuid) to authenticated;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invites enable row level security;

revoke all on table public.rooms from anon, authenticated;
revoke all on table public.room_members from anon, authenticated;
revoke all on table public.room_invites from anon, authenticated;
grant select on table public.rooms to authenticated;
grant select on table public.room_members to authenticated;
grant select on table public.room_invites to authenticated;

create policy rooms_select_visible
  on public.rooms
  for select
  to authenticated
  using (
    devroyale_private.is_room_member(id, (select auth.uid()))
    or (
      visibility = 'public'
      and status in ('waiting', 'ready')
    )
    or exists (
      select 1
      from public.room_invites
      where room_id = rooms.id
        and recipient_id = (select auth.uid())
        and status = 'pending'
        and expires_at > now()
    )
  );

create policy room_members_select_room_members
  on public.room_members
  for select
  to authenticated
  using (devroyale_private.is_room_member(room_id, (select auth.uid())));

create policy room_invites_select_involved
  on public.room_invites
  for select
  to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create or replace function public.create_multiplayer_room(
  p_visibility public.room_visibility default 'private',
  p_language public.room_language default 'python',
  p_difficulty public.room_difficulty default 'basic',
  p_match_format public.match_format default 'bo1',
  p_allow_spectators boolean default false
)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_room public.rooms;
  generated_code text;
  attempt integer;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));

  if exists (select 1 from public.room_members where user_id = current_user_id) then
    raise exception using errcode = 'P0001', message = 'already_in_active_room';
  end if;

  for attempt in 1..8 loop
    generated_code := devroyale_private.generate_room_code();
    begin
      insert into public.rooms (
        code,
        host_id,
        visibility,
        language,
        difficulty,
        match_format,
        allow_spectators,
        max_players
      )
      values (
        generated_code,
        current_user_id,
        p_visibility,
        p_language,
        p_difficulty,
        p_match_format,
        p_allow_spectators,
        2
      )
      returning * into created_room;
      exit;
    exception when unique_violation then
      if attempt = 8 then
        raise exception using errcode = 'P0001', message = 'room_code_generation_failed';
      end if;
    end;
  end loop;

  insert into public.room_members (room_id, user_id, role)
  values (created_room.id, current_user_id, 'host');

  return created_room;
end;
$$;

create or replace function public.join_room_by_code(p_code text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
  existing_room_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));

  select *
  into target_room
  from public.rooms
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;

  select room_id
  into existing_room_id
  from public.room_members
  where user_id = current_user_id;

  if existing_room_id = target_room.id then
    return target_room;
  end if;

  if existing_room_id is not null then
    raise exception using errcode = 'P0001', message = 'already_in_active_room';
  end if;

  if target_room.status not in ('waiting', 'ready') then
    raise exception using errcode = 'P0001', message = 'room_unavailable';
  end if;

  if devroyale_private.is_social_pair_blocked(current_user_id, target_room.host_id) then
    raise exception using errcode = 'P0001', message = 'social_pair_blocked';
  end if;

  if (select count(*) from public.room_members where room_id = target_room.id) >= 2 then
    raise exception using errcode = 'P0001', message = 'room_full';
  end if;

  insert into public.room_members (room_id, user_id, role, ready)
  values (target_room.id, current_user_id, 'player', false);

  update public.room_members
  set ready = false
  where room_id = target_room.id;

  update public.rooms
  set status = 'waiting', countdown_started_at = null
  where id = target_room.id
  returning * into target_room;

  return target_room;
end;
$$;

create or replace function public.get_current_room()
returns public.rooms
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_room public.rooms;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  select rooms.*
  into current_room
  from public.rooms
  join public.room_members on room_members.room_id = rooms.id
  where room_members.user_id = current_user_id
    and rooms.status in ('waiting', 'ready', 'starting', 'in_match')
  limit 1;

  if not found then
    return null;
  end if;

  return current_room;
end;
$$;

create or replace function public.update_room_settings(
  p_room_id uuid,
  p_visibility public.room_visibility,
  p_language public.room_language,
  p_difficulty public.room_difficulty,
  p_match_format public.match_format,
  p_allow_spectators boolean
)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
begin
  select * into target_room from public.rooms where id = p_room_id for update;

  if current_user_id is null or not found or target_room.host_id <> current_user_id then
    raise exception using errcode = 'P0001', message = 'host_only';
  end if;

  if target_room.status not in ('waiting', 'ready') then
    raise exception using errcode = 'P0001', message = 'room_settings_locked';
  end if;

  update public.room_members set ready = false where room_id = p_room_id;

  update public.rooms
  set visibility = p_visibility,
      language = p_language,
      difficulty = p_difficulty,
      match_format = p_match_format,
      allow_spectators = p_allow_spectators,
      status = 'waiting',
      countdown_started_at = null
  where id = p_room_id
  returning * into target_room;

  return target_room;
end;
$$;

create or replace function public.set_room_ready(p_room_id uuid, p_ready boolean)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
  member_count integer;
  ready_count integer;
begin
  select * into target_room from public.rooms where id = p_room_id for update;

  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;

  if target_room.status not in ('waiting', 'ready') then
    raise exception using errcode = 'P0001', message = 'room_ready_locked';
  end if;

  update public.room_members
  set ready = p_ready
  where room_id = p_room_id and user_id = current_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'not_room_member';
  end if;

  select count(*), count(*) filter (where ready)
  into member_count, ready_count
  from public.room_members
  where room_id = p_room_id;

  update public.rooms
  set status = case when member_count = 2 and ready_count = 2 then 'ready' else 'waiting' end,
      countdown_started_at = null
  where id = p_room_id
  returning * into target_room;

  return target_room;
end;
$$;

create or replace function public.start_room_countdown(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
  member_count integer;
  ready_count integer;
begin
  select * into target_room from public.rooms where id = p_room_id for update;

  if current_user_id is null or not found or target_room.host_id <> current_user_id then
    raise exception using errcode = 'P0001', message = 'host_only';
  end if;

  if target_room.status not in ('waiting', 'ready') then
    raise exception using errcode = 'P0001', message = 'countdown_unavailable';
  end if;

  select count(*), count(*) filter (where ready)
  into member_count, ready_count
  from public.room_members
  where room_id = p_room_id;

  if member_count <> 2 or ready_count <> 2 then
    raise exception using errcode = 'P0001', message = 'players_not_ready';
  end if;

  update public.rooms
  set status = 'starting', countdown_started_at = now()
  where id = p_room_id
  returning * into target_room;

  return target_room;
end;
$$;

create or replace function public.leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
  current_role public.room_member_role;
  next_host_id uuid;
begin
  select * into target_room from public.rooms where id = p_room_id for update;

  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;

  select role into current_role
  from public.room_members
  where room_id = p_room_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'not_room_member';
  end if;

  if current_role = 'host' then
    select user_id into next_host_id
    from public.room_members
    where room_id = p_room_id and user_id <> current_user_id
    order by joined_at
    limit 1
    for update;

    if next_host_id is not null then
      update public.room_members
      set role = 'host', ready = false
      where room_id = p_room_id and user_id = next_host_id;

      update public.rooms
      set host_id = next_host_id, status = 'waiting', countdown_started_at = null
      where id = p_room_id;

      update public.room_invites
      set status = 'expired'
      where room_id = p_room_id and status = 'pending';
    end if;
  end if;

  delete from public.room_members
  where room_id = p_room_id and user_id = current_user_id;

  if next_host_id is null and not exists (
    select 1 from public.room_members where room_id = p_room_id
  ) then
    update public.rooms
    set status = 'cancelled', countdown_started_at = null, closed_at = now()
    where id = p_room_id;

    update public.room_invites
    set status = 'expired'
    where room_id = p_room_id and status = 'pending';
  else
    update public.room_members set ready = false where room_id = p_room_id;
    update public.rooms
    set status = 'waiting', countdown_started_at = null
    where id = p_room_id;
  end if;
end;
$$;

create or replace function public.kick_room_member(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
begin
  select * into target_room from public.rooms where id = p_room_id for update;

  if current_user_id is null or not found or target_room.host_id <> current_user_id then
    raise exception using errcode = 'P0001', message = 'host_only';
  end if;

  if p_user_id = current_user_id then
    raise exception using errcode = 'P0001', message = 'cannot_kick_host';
  end if;

  delete from public.room_members
  where room_id = p_room_id and user_id = p_user_id and role = 'player';

  if not found then
    raise exception using errcode = 'P0001', message = 'player_not_found';
  end if;

  update public.room_members set ready = false where room_id = p_room_id;
  update public.rooms
  set status = 'waiting', countdown_started_at = null
  where id = p_room_id;
end;
$$;

create or replace function public.cancel_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
begin
  select * into target_room from public.rooms where id = p_room_id for update;

  if current_user_id is null or not found or target_room.host_id <> current_user_id then
    raise exception using errcode = 'P0001', message = 'host_only';
  end if;

  delete from public.room_members where room_id = p_room_id;
  update public.room_invites set status = 'expired'
  where room_id = p_room_id and status = 'pending';
  update public.rooms
  set status = 'cancelled', countdown_started_at = null, closed_at = now()
  where id = p_room_id;
end;
$$;

create or replace function public.send_room_invite(p_room_id uuid, p_recipient_id uuid)
returns public.room_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
  created_invite public.room_invites;
begin
  if current_user_id is null or current_user_id = p_recipient_id then
    raise exception using errcode = 'P0001', message = 'invite_unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('room-invite:' || p_room_id::text || ':' || p_recipient_id::text, 0)
  );

  select * into target_room from public.rooms where id = p_room_id for update;

  if not found or target_room.host_id <> current_user_id
     or target_room.status not in ('waiting', 'ready') then
    raise exception using errcode = 'P0001', message = 'host_only';
  end if;

  if not devroyale_private.are_friends(current_user_id, p_recipient_id) then
    raise exception using errcode = 'P0001', message = 'invite_friends_only';
  end if;

  if devroyale_private.is_social_pair_blocked(current_user_id, p_recipient_id) then
    raise exception using errcode = 'P0001', message = 'social_pair_blocked';
  end if;

  if exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = p_recipient_id
  ) then
    raise exception using errcode = 'P0001', message = 'already_room_member';
  end if;

  update public.room_invites
  set status = 'expired'
  where room_id = p_room_id
    and recipient_id = p_recipient_id
    and status = 'pending'
    and expires_at <= now();

  if exists (
    select 1 from public.room_invites
    where room_id = p_room_id
      and recipient_id = p_recipient_id
      and status = 'pending'
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_room_invite';
  end if;

  insert into public.room_invites (room_id, sender_id, recipient_id)
  values (p_room_id, current_user_id, p_recipient_id)
  returning * into created_invite;

  return created_invite;
end;
$$;

create or replace function public.accept_room_invite(p_invite_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_invite public.room_invites;
  target_room public.rooms;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));

  select * into target_invite
  from public.room_invites
  where id = p_invite_id
  for update;

  if not found or target_invite.recipient_id <> current_user_id
     or target_invite.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'invite_unavailable';
  end if;

  if target_invite.expires_at <= now() then
    update public.room_invites set status = 'expired' where id = p_invite_id;
    raise exception using errcode = 'P0001', message = 'invite_expired';
  end if;

  select * into target_room
  from public.rooms
  where id = target_invite.room_id
  for update;

  if not found or target_room.status not in ('waiting', 'ready') then
    raise exception using errcode = 'P0001', message = 'room_unavailable';
  end if;

  if target_invite.sender_id <> target_room.host_id
     or not devroyale_private.are_friends(target_invite.sender_id, current_user_id) then
    raise exception using errcode = 'P0001', message = 'invite_friends_only';
  end if;

  if exists (select 1 from public.room_members where user_id = current_user_id) then
    raise exception using errcode = 'P0001', message = 'already_in_active_room';
  end if;

  if devroyale_private.is_social_pair_blocked(current_user_id, target_room.host_id) then
    raise exception using errcode = 'P0001', message = 'social_pair_blocked';
  end if;

  if (select count(*) from public.room_members where room_id = target_room.id) >= 2 then
    raise exception using errcode = 'P0001', message = 'room_full';
  end if;

  insert into public.room_members (room_id, user_id, role, ready)
  values (target_room.id, current_user_id, 'player', false);

  update public.room_members set ready = false where room_id = target_room.id;
  update public.room_invites set status = 'accepted' where id = p_invite_id;
  update public.rooms
  set status = 'waiting', countdown_started_at = null
  where id = target_room.id
  returning * into target_room;

  return target_room;
end;
$$;

create or replace function public.decline_room_invite(p_invite_id uuid)
returns public.room_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  declined_invite public.room_invites;
begin
  update public.room_invites
  set status = case when expires_at <= now() then 'expired' else 'declined' end
  where id = p_invite_id
    and recipient_id = current_user_id
    and status = 'pending'
  returning * into declined_invite;

  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'invite_unavailable';
  end if;

  return declined_invite;
end;
$$;

create or replace function public.list_public_rooms(p_limit integer default 20)
returns table (
  room_id uuid,
  code text,
  host_id uuid,
  host_username text,
  host_display_name text,
  language public.room_language,
  difficulty public.room_difficulty,
  match_format public.match_format,
  allow_spectators boolean,
  player_count bigint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    rooms.id,
    rooms.code,
    rooms.host_id,
    profiles.username,
    profiles.display_name,
    rooms.language,
    rooms.difficulty,
    rooms.match_format,
    rooms.allow_spectators,
    count(room_members.user_id),
    rooms.created_at
  from public.rooms
  join public.profiles on profiles.id = rooms.host_id
  left join public.room_members on room_members.room_id = rooms.id
  where (select auth.uid()) is not null
    and rooms.visibility = 'public'
    and rooms.status in ('waiting', 'ready')
  group by rooms.id, profiles.id
  having count(room_members.user_id) < 2
  order by rooms.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 20);
$$;

revoke all on function public.create_multiplayer_room(
  public.room_visibility,
  public.room_language,
  public.room_difficulty,
  public.match_format,
  boolean
) from public, anon;
revoke all on function public.join_room_by_code(text) from public, anon;
revoke all on function public.get_current_room() from public, anon;
revoke all on function public.update_room_settings(
  uuid,
  public.room_visibility,
  public.room_language,
  public.room_difficulty,
  public.match_format,
  boolean
) from public, anon;
revoke all on function public.set_room_ready(uuid, boolean) from public, anon;
revoke all on function public.start_room_countdown(uuid) from public, anon;
revoke all on function public.leave_room(uuid) from public, anon;
revoke all on function public.kick_room_member(uuid, uuid) from public, anon;
revoke all on function public.cancel_room(uuid) from public, anon;
revoke all on function public.send_room_invite(uuid, uuid) from public, anon;
revoke all on function public.accept_room_invite(uuid) from public, anon;
revoke all on function public.decline_room_invite(uuid) from public, anon;
revoke all on function public.list_public_rooms(integer) from public, anon;

grant execute on function public.create_multiplayer_room(
  public.room_visibility,
  public.room_language,
  public.room_difficulty,
  public.match_format,
  boolean
) to authenticated;
grant execute on function public.join_room_by_code(text) to authenticated;
grant execute on function public.get_current_room() to authenticated;
grant execute on function public.update_room_settings(
  uuid,
  public.room_visibility,
  public.room_language,
  public.room_difficulty,
  public.match_format,
  boolean
) to authenticated;
grant execute on function public.set_room_ready(uuid, boolean) to authenticated;
grant execute on function public.start_room_countdown(uuid) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.kick_room_member(uuid, uuid) to authenticated;
grant execute on function public.cancel_room(uuid) to authenticated;
grant execute on function public.send_room_invite(uuid, uuid) to authenticated;
grant execute on function public.accept_room_invite(uuid) to authenticated;
grant execute on function public.decline_room_invite(uuid) to authenticated;
grant execute on function public.list_public_rooms(integer) to authenticated;

create or replace function devroyale_private.broadcast_room_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_room_id uuid;
  safe_record jsonb;
begin
  safe_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  changed_room_id := case
    when tg_table_name = 'rooms' then (safe_record ->> 'id')::uuid
    else (safe_record ->> 'room_id')::uuid
  end;

  perform realtime.send(
    jsonb_build_object(
      'type', 'room_changed',
      'entity', tg_table_name,
      'operation', tg_op,
      'roomId', changed_room_id,
      'record', safe_record
    ),
    'room_changed',
    'room:' || changed_room_id::text,
    true
  );

  return null;
end;
$$;

create or replace function devroyale_private.broadcast_room_invite_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_record public.room_invites;
begin
  if tg_op = 'DELETE' then
    invite_record := old;
  else
    invite_record := new;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'type', 'room_invite_changed',
      'operation', tg_op,
      'inviteId', invite_record.id,
      'roomId', invite_record.room_id
    ),
    'room_invite_changed',
    'user:' || invite_record.recipient_id::text || ':room-invites',
    true
  );

  return null;
end;
$$;

revoke all on function devroyale_private.broadcast_room_change() from public, anon, authenticated;
revoke all on function devroyale_private.broadcast_room_invite_change() from public, anon, authenticated;

create trigger rooms_broadcast_change
  after insert or update or delete on public.rooms
  for each row execute procedure devroyale_private.broadcast_room_change();

create trigger room_members_broadcast_change
  after insert or update or delete on public.room_members
  for each row execute procedure devroyale_private.broadcast_room_change();

create trigger room_invites_broadcast_room_change
  after insert or update or delete on public.room_invites
  for each row execute procedure devroyale_private.broadcast_room_change();

create trigger room_invites_broadcast_recipient_change
  after insert or update or delete on public.room_invites
  for each row execute procedure devroyale_private.broadcast_room_invite_change();

create policy devroyale_room_channel_read
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and devroyale_private.can_access_room_topic(
      (select realtime.topic()),
      (select auth.uid())
    )
  );

create policy devroyale_room_presence_write
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and devroyale_private.can_access_room_topic(
      (select realtime.topic()),
      (select auth.uid())
    )
  );

create policy devroyale_room_invite_channel_read
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'user:' || (select auth.uid())::text || ':room-invites'
  );

commit;
