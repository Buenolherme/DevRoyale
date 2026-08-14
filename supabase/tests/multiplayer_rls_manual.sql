-- DevRoyale V2.0C — roteiro manual de RLS e permissões.
-- Execute somente em ambiente local/de teste após aplicar as migrations.
-- Substitua os UUIDs e o room_id. Cada bloco usa uma transação com rollback.

-- Conta B: pode ler a sala da qual é membro, mas só pode alterar o próprio ready via RPC.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);

select *
from public.rooms
where id = '10000000-0000-0000-0000-000000000000';

select *
from public.room_members
where room_id = '10000000-0000-0000-0000-000000000000';

-- Todos os comandos diretos abaixo devem falhar por privilégio/RLS.
update public.rooms
set language = 'javascript'
where id = '10000000-0000-0000-0000-000000000000';

update public.room_members
set ready = true
where room_id = '10000000-0000-0000-0000-000000000000'
  and user_id = '00000000-0000-0000-0000-00000000000a';

delete from public.room_members
where room_id = '10000000-0000-0000-0000-000000000000'
  and user_id = '00000000-0000-0000-0000-00000000000a';
rollback;

-- Conta C: não membro não lê sala privada, membros ou convites alheios.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);

select *
from public.rooms
where id = '10000000-0000-0000-0000-000000000000';

select *
from public.room_members
where room_id = '10000000-0000-0000-0000-000000000000';

select *
from public.room_invites
where room_id = '10000000-0000-0000-0000-000000000000';
rollback;

-- Conta C: não pode autorizar o canal privado room:<uuid>.
-- Rode a conexão no cliente com private: true e confirme CHANNEL_ERROR/TIMED_OUT.
-- A policy devroyale_room_channel_read exige membership persistente.

