-- DevRoyale V2.0D — roteiro manual de RLS, grants e proteção de quick rooms.
-- Execute cada bloco separadamente em banco LOCAL/DE TESTE após substituir UUIDs.
-- Linhas marcadas EXPECTED ERROR devem falhar; rode ROLLBACK antes do bloco seguinte.

-- A enxerga somente os próprios tickets.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
select ticket_id, user_id, status
from public.matchmaking_queue;
rollback;

-- INSERT direto é proibido mesmo usando o próprio user_id. EXPECTED ERROR: permission denied.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
insert into public.matchmaking_queue (user_id, language, difficulty)
values ('00000000-0000-0000-0000-00000000000a', 'python', 'basic');
rollback;

-- UPDATE direto de status/matched_room_id é proibido. EXPECTED ERROR: permission denied.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
update public.matchmaking_queue
set status = 'matched',
    matched_room_id = '00000000-0000-0000-0000-000000000099',
    matched_at = now()
where user_id = '00000000-0000-0000-0000-00000000000a';
rollback;

-- Anônimo não pode executar RPC de matchmaking. EXPECTED ERROR: permission denied.
begin;
set local role anon;
select public.join_quick_match_queue('python', 'basic');
rollback;

-- O ticket pertence a A: B não consegue consultar/cancelar pelo ticket exato.
-- EXPECTED ERROR em cancel_quick_match: queue_ticket_not_found.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select public.get_quick_match_status('SUBSTITUA_TICKET_A'::uuid);
select public.cancel_quick_match('SUBSTITUA_TICKET_A'::uuid);
rollback;

-- Depois de formar uma quick room, até o host_id técnico recebe
-- quick_match_restricted nestas quatro chamadas. Execute uma por transação,
-- pois cada erro aborta a transação atual.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'SUBSTITUA_HOST_TECNICO'::text, true);
select public.update_room_settings(
  'SUBSTITUA_QUICK_ROOM'::uuid,
  'public', 'javascript', 'advanced', 'bo5', true
);
-- EXPECTED ERROR: quick_match_restricted
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'SUBSTITUA_HOST_TECNICO'::text, true);
select public.kick_room_member('SUBSTITUA_QUICK_ROOM'::uuid, 'SUBSTITUA_OPONENTE'::uuid);
-- EXPECTED ERROR: quick_match_restricted
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'SUBSTITUA_HOST_TECNICO'::text, true);
select public.send_room_invite('SUBSTITUA_QUICK_ROOM'::uuid, 'SUBSTITUA_AMIGO'::uuid);
-- EXPECTED ERROR: quick_match_restricted
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'SUBSTITUA_TERCEIRO'::text, true);
select public.join_room_by_code('SUBSTITUA_CODIGO_QUICK');
-- EXPECTED ERROR: quick_match_restricted
rollback;

-- Autorização Realtime (validar com clientes autenticados):
-- A pode assinar matchmaking:<UUID_A>.
-- A não pode assinar matchmaking:<UUID_B>.
-- B não pode assinar matchmaking:<UUID_A>.
