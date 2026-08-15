begin;

create type public.room_kind as enum ('custom', 'quick_match');
create type public.matchmaking_status as enum ('searching', 'matched', 'cancelled', 'expired');

alter table public.rooms
  add column room_kind public.room_kind not null default 'custom';

create table public.matchmaking_queue (
  ticket_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.matchmaking_status not null default 'searching',
  language public.room_language not null,
  difficulty public.room_difficulty not null,
  joined_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  matched_room_id uuid references public.rooms (id) on delete set null,
  matched_at timestamptz,
  constraint matchmaking_queue_match_consistency check (
    (
      status = 'matched'
      and matched_room_id is not null
      and matched_at is not null
    )
    or (
      status <> 'matched'
      and matched_room_id is null
      and matched_at is null
    )
  ),
  constraint matchmaking_queue_heartbeat_consistency check (heartbeat_at >= joined_at)
);

create unique index matchmaking_queue_one_searching_per_user_idx
  on public.matchmaking_queue (user_id)
  where status = 'searching';

create index matchmaking_queue_search_pool_idx
  on public.matchmaking_queue (language, difficulty, joined_at, heartbeat_at)
  where status = 'searching';

create index matchmaking_queue_user_recent_idx
  on public.matchmaking_queue (user_id, updated_at desc);

create trigger matchmaking_queue_set_updated_at
  before update on public.matchmaking_queue
  for each row execute procedure devroyale_private.set_room_updated_at();

alter table public.matchmaking_queue enable row level security;

revoke all on table public.matchmaking_queue from anon, authenticated;
grant select on table public.matchmaking_queue to authenticated;

create policy matchmaking_queue_select_own
  on public.matchmaking_queue
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function devroyale_private.try_quick_match(
  p_ticket_id uuid,
  p_user_id uuid
)
returns public.matchmaking_queue
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_ticket public.matchmaking_queue;
  candidate_ticket public.matchmaking_queue;
  created_room public.rooms;
  generated_code text;
  technical_host_id uuid;
  social_pair_key text;
  attempt integer;
begin
  select *
  into current_ticket
  from public.matchmaking_queue
  where ticket_id = p_ticket_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'queue_ticket_not_found';
  end if;

  if current_ticket.status <> 'searching' then
    return current_ticket;
  end if;

  if current_ticket.heartbeat_at < now() - interval '30 seconds' then
    update public.matchmaking_queue
    set status = 'expired'
    where ticket_id = current_ticket.ticket_id
    returning * into current_ticket;
    return current_ticket;
  end if;

  if exists (
    select 1 from public.room_members where user_id = p_user_id
  ) then
    update public.matchmaking_queue
    set status = 'cancelled'
    where ticket_id = current_ticket.ticket_id
    returning * into current_ticket;
    return current_ticket;
  end if;

  select candidate.*
  into candidate_ticket
  from public.matchmaking_queue as candidate
  where candidate.status = 'searching'
    and candidate.ticket_id <> current_ticket.ticket_id
    and candidate.user_id <> current_ticket.user_id
    and candidate.language = current_ticket.language
    and candidate.difficulty = current_ticket.difficulty
    and candidate.heartbeat_at >= now() - interval '30 seconds'
    and not exists (
      select 1
      from public.room_members
      where user_id = candidate.user_id
    )
    and not devroyale_private.is_social_pair_blocked(
      current_ticket.user_id,
      candidate.user_id
    )
  order by candidate.joined_at asc, candidate.ticket_id asc
  for update of candidate skip locked
  limit 1;

  if not found then
    return current_ticket;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('room-user:' || candidate_ticket.user_id::text, 0)
  );

  social_pair_key := least(current_ticket.user_id, candidate_ticket.user_id)::text
    || ':' || greatest(current_ticket.user_id, candidate_ticket.user_id)::text;
  perform pg_advisory_xact_lock(hashtextextended(social_pair_key, 0));

  select *
  into candidate_ticket
  from public.matchmaking_queue
  where ticket_id = candidate_ticket.ticket_id
  for update;

  if candidate_ticket.status <> 'searching'
     or candidate_ticket.heartbeat_at < now() - interval '30 seconds'
     or candidate_ticket.language <> current_ticket.language
     or candidate_ticket.difficulty <> current_ticket.difficulty
     or exists (
       select 1 from public.room_members where user_id = candidate_ticket.user_id
     )
     or devroyale_private.is_social_pair_blocked(
       current_ticket.user_id,
       candidate_ticket.user_id
     ) then
    return current_ticket;
  end if;

  technical_host_id := case
    when (candidate_ticket.joined_at, candidate_ticket.ticket_id)
       < (current_ticket.joined_at, current_ticket.ticket_id)
      then candidate_ticket.user_id
    else current_ticket.user_id
  end;

  for attempt in 1..8 loop
    generated_code := devroyale_private.generate_room_code();
    begin
      insert into public.rooms (
        code,
        host_id,
        visibility,
        status,
        language,
        difficulty,
        match_format,
        allow_spectators,
        max_players,
        room_kind
      )
      values (
        generated_code,
        technical_host_id,
        'private',
        'waiting',
        current_ticket.language,
        current_ticket.difficulty,
        'bo1',
        false,
        2,
        'quick_match'
      )
      returning * into created_room;
      exit;
    exception when unique_violation then
      if attempt = 8 then
        raise exception using errcode = 'P0001', message = 'room_code_generation_failed';
      end if;
    end;
  end loop;

  insert into public.room_members (room_id, user_id, role, ready)
  values
    (
      created_room.id,
      current_ticket.user_id,
      (case when current_ticket.user_id = technical_host_id then 'host' else 'player' end)::public.room_member_role,
      false
    ),
    (
      created_room.id,
      candidate_ticket.user_id,
      (case when candidate_ticket.user_id = technical_host_id then 'host' else 'player' end)::public.room_member_role,
      false
    );

  update public.matchmaking_queue
  set status = 'matched',
      matched_room_id = created_room.id,
      matched_at = now()
  where ticket_id in (current_ticket.ticket_id, candidate_ticket.ticket_id);

  select *
  into current_ticket
  from public.matchmaking_queue
  where ticket_id = current_ticket.ticket_id;

  return current_ticket;
end;
$$;

revoke all on function devroyale_private.try_quick_match(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.join_quick_match_queue(
  p_language public.room_language,
  p_difficulty public.room_difficulty
)
returns public.matchmaking_queue
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_ticket public.matchmaking_queue;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));

  if exists (select 1 from public.room_members where user_id = current_user_id) then
    raise exception using errcode = 'P0001', message = 'active_room_blocks_queue';
  end if;

  update public.matchmaking_queue
  set status = 'expired'
  where user_id = current_user_id
    and status = 'searching'
    and heartbeat_at < now() - interval '30 seconds';

  select *
  into current_ticket
  from public.matchmaking_queue
  where user_id = current_user_id and status = 'searching'
  for update;

  if found then
    if current_ticket.language <> p_language
       or current_ticket.difficulty <> p_difficulty then
      raise exception using errcode = 'P0001', message = 'already_searching';
    end if;

    update public.matchmaking_queue
    set heartbeat_at = now()
    where ticket_id = current_ticket.ticket_id
    returning * into current_ticket;

    return devroyale_private.try_quick_match(current_ticket.ticket_id, current_user_id);
  end if;

  insert into public.matchmaking_queue (user_id, language, difficulty)
  values (current_user_id, p_language, p_difficulty)
  returning * into current_ticket;

  return devroyale_private.try_quick_match(current_ticket.ticket_id, current_user_id);
end;
$$;

create or replace function public.poll_quick_match(p_ticket_id uuid)
returns public.matchmaking_queue
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_ticket public.matchmaking_queue;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));

  select *
  into current_ticket
  from public.matchmaking_queue
  where ticket_id = p_ticket_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'queue_ticket_not_found';
  end if;

  if current_ticket.status = 'searching'
     and current_ticket.heartbeat_at < now() - interval '30 seconds' then
    update public.matchmaking_queue
    set status = 'expired'
    where ticket_id = current_ticket.ticket_id
    returning * into current_ticket;
    return current_ticket;
  end if;

  return devroyale_private.try_quick_match(current_ticket.ticket_id, current_user_id);
end;
$$;

create or replace function public.heartbeat_quick_match(p_ticket_id uuid)
returns public.matchmaking_queue
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_ticket public.matchmaking_queue;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));

  select *
  into current_ticket
  from public.matchmaking_queue
  where ticket_id = p_ticket_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'queue_ticket_not_found';
  end if;

  if current_ticket.status = 'searching'
     and current_ticket.heartbeat_at < now() - interval '30 seconds' then
    update public.matchmaking_queue
    set status = 'expired'
    where ticket_id = current_ticket.ticket_id
    returning * into current_ticket;
    return current_ticket;
  end if;

  if current_ticket.status = 'searching' then
    update public.matchmaking_queue
    set heartbeat_at = now()
    where ticket_id = current_ticket.ticket_id
    returning * into current_ticket;
  end if;

  return devroyale_private.try_quick_match(current_ticket.ticket_id, current_user_id);
end;
$$;

create or replace function public.cancel_quick_match(p_ticket_id uuid)
returns public.matchmaking_queue
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_ticket public.matchmaking_queue;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));

  select *
  into current_ticket
  from public.matchmaking_queue
  where ticket_id = p_ticket_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'queue_ticket_not_found';
  end if;

  if current_ticket.status = 'searching' then
    update public.matchmaking_queue
    set status = 'cancelled'
    where ticket_id = current_ticket.ticket_id
    returning * into current_ticket;
  end if;

  return current_ticket;
end;
$$;

create or replace function public.get_quick_match_status(p_ticket_id uuid default null)
returns public.matchmaking_queue
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_ticket public.matchmaking_queue;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room-user:' || current_user_id::text, 0));

  update public.matchmaking_queue
  set status = 'expired'
  where user_id = current_user_id
    and status = 'searching'
    and heartbeat_at < now() - interval '30 seconds';

  select queue.*
  into current_ticket
  from public.matchmaking_queue as queue
  where queue.user_id = current_user_id
    and (
      (p_ticket_id is not null and queue.ticket_id = p_ticket_id)
      or (
        p_ticket_id is null
        and (
          queue.status = 'searching'
          or (
            queue.status = 'matched'
            and exists (
              select 1
              from public.room_members
              join public.rooms on rooms.id = room_members.room_id
              where room_members.user_id = current_user_id
                and rooms.id = queue.matched_room_id
                and rooms.room_kind = 'quick_match'
                and rooms.status in ('waiting', 'ready', 'starting', 'in_match')
            )
          )
        )
      )
    )
  order by
    case queue.status when 'searching' then 0 when 'matched' then 1 else 2 end,
    queue.updated_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return current_ticket;
end;
$$;

revoke all on function public.join_quick_match_queue(
  public.room_language,
  public.room_difficulty
) from public, anon;
revoke all on function public.poll_quick_match(uuid) from public, anon;
revoke all on function public.heartbeat_quick_match(uuid) from public, anon;
revoke all on function public.cancel_quick_match(uuid) from public, anon;
revoke all on function public.get_quick_match_status(uuid) from public, anon;

grant execute on function public.join_quick_match_queue(
  public.room_language,
  public.room_difficulty
) to authenticated;
grant execute on function public.poll_quick_match(uuid) to authenticated;
grant execute on function public.heartbeat_quick_match(uuid) to authenticated;
grant execute on function public.cancel_quick_match(uuid) to authenticated;
grant execute on function public.get_quick_match_status(uuid) to authenticated;

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

  if target_room.room_kind <> 'custom' then
    raise exception using errcode = 'P0001', message = 'quick_match_restricted';
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

  update public.room_members set ready = false where room_id = target_room.id;
  update public.rooms
  set status = 'waiting', countdown_started_at = null
  where id = target_room.id
  returning * into target_room;

  return target_room;
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

  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.room_kind <> 'custom' then
    raise exception using errcode = 'P0001', message = 'quick_match_restricted';
  end if;
  if target_room.host_id <> current_user_id then
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

  if target_room.room_kind = 'quick_match'
     and member_count = 2
     and ready_count = 2 then
    update public.rooms
    set status = 'starting', countdown_started_at = now()
    where id = p_room_id
    returning * into target_room;
  else
    update public.rooms
    set status = case
          when member_count = 2 and ready_count = 2 then 'ready'
          else 'waiting'
        end,
        countdown_started_at = null
    where id = p_room_id
    returning * into target_room;
  end if;

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

  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.room_kind <> 'custom' then
    raise exception using errcode = 'P0001', message = 'quick_match_restricted';
  end if;
  if target_room.host_id <> current_user_id then
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

  if target_room.room_kind = 'quick_match' then
    update public.matchmaking_queue
    set status = 'cancelled',
        matched_room_id = null,
        matched_at = null
    where matched_room_id = p_room_id and status = 'matched';

    delete from public.room_members where room_id = p_room_id;
    update public.rooms
    set status = 'cancelled', countdown_started_at = null, closed_at = now()
    where id = p_room_id;
    return;
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
  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.room_kind <> 'custom' then
    raise exception using errcode = 'P0001', message = 'quick_match_restricted';
  end if;
  if target_room.host_id <> current_user_id then
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
  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.room_kind <> 'custom' then
    raise exception using errcode = 'P0001', message = 'quick_match_restricted';
  end if;
  if target_room.host_id <> current_user_id then
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

  if not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.room_kind <> 'custom' then
    raise exception using errcode = 'P0001', message = 'quick_match_restricted';
  end if;
  if target_room.host_id <> current_user_id
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
    and rooms.room_kind = 'custom'
    and rooms.visibility = 'public'
    and rooms.status in ('waiting', 'ready')
  group by rooms.id, profiles.id
  having count(room_members.user_id) < 2
  order by rooms.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 20);
$$;

create or replace function devroyale_private.broadcast_matchmaking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
begin
  event_name := case
    when new.status = 'matched' and (tg_op = 'INSERT' or old.status <> 'matched')
      then 'match_found'
    when new.status = 'cancelled' and (tg_op = 'INSERT' or old.status <> 'cancelled')
      then 'queue_cancelled'
    else 'queue_changed'
  end;

  perform realtime.send(
    jsonb_build_object(
      'type', event_name,
      'ticketId', new.ticket_id,
      'status', new.status,
      'matchedRoomId', case
        when new.matched_room_id is not null then new.matched_room_id
        when tg_op = 'UPDATE' then old.matched_room_id
        else null
      end
    ),
    event_name,
    'matchmaking:' || new.user_id::text,
    true
  );

  return null;
end;
$$;

revoke all on function devroyale_private.broadcast_matchmaking_change()
  from public, anon, authenticated;

create trigger matchmaking_queue_broadcast_change
  after insert or update on public.matchmaking_queue
  for each row execute procedure devroyale_private.broadcast_matchmaking_change();

create policy devroyale_matchmaking_channel_read
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'matchmaking:' || (select auth.uid())::text
  );

commit;
