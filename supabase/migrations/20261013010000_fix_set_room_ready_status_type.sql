begin;

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
    -- Untyped CASE branches resolve to text, which cannot be assigned to this enum.
    set status = case
          when member_count = 2 and ready_count = 2 then 'ready'::public.room_status
          else 'waiting'::public.room_status
        end,
        countdown_started_at = null
    where id = p_room_id
    returning * into target_room;
  end if;

  return target_room;
end;
$$;

commit;
