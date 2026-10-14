begin;

create or replace function public.leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
  leaving_member_role public.room_member_role;
  next_host_id uuid;
begin
  select * into target_room from public.rooms where id = p_room_id for update;

  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;

  select role into leaving_member_role
  from public.room_members
  where room_id = p_room_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'not_room_member';
  end if;

  if exists (
    select 1 from public.multiplayer_matches
    where room_id = p_room_id and status in ('preparing', 'active', 'between_rounds')
  ) then
    raise exception using errcode = 'P0001', message = 'match_in_progress_use_surrender';
  end if;

  if target_room.room_kind = 'quick_match' then
    update public.matchmaking_queue
    set status = 'cancelled', matched_room_id = null, matched_at = null
    where matched_room_id = p_room_id and status = 'matched';
    delete from public.room_members where room_id = p_room_id;
    update public.rooms
    set status = 'cancelled', countdown_started_at = null, closed_at = now()
    where id = p_room_id;
    return;
  end if;

  if leaving_member_role = 'host' then
    select user_id into next_host_id
    from public.room_members
    where room_id = p_room_id and user_id <> current_user_id
    order by joined_at
    limit 1
    for update;
  end if;

  -- The partial unique index permits only one host per room immediately.
  -- Remove the departing member before promotion, retaining the room and
  -- successor locks until the transaction commits (or rolls back on error).
  delete from public.room_members
  where room_id = p_room_id and user_id = current_user_id;

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

commit;
