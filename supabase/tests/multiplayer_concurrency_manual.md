# V2.0C — A/B/C e concorrência

Use três contas reais em ambiente local/de teste, depois de aplicar a migration. Não execute contra produção.

## Fluxo A/B/C

1. Conta A cria uma sala privada por `create_multiplayer_room()` e confirma `host_id = A`, membro `role = host` e `max_players = 2`.
2. Conta B entra com `join_room_by_code()` e confirma dois membros distintos.
3. Conta C usa o mesmo código e deve receber `room_full`.
4. A troca Python por JavaScript com `update_room_settings()`; B deve receber `room_changed`, refazer a leitura e ver ambos `ready = false`.
5. B tenta `update public.rooms` e `update_room_settings()`; a escrita direta deve falhar por privilégio/RLS e a RPC deve responder `host_only`.
6. A e B usam `set_room_ready(..., true)`. A chama `start_room_countdown()` e ambos devem obter o mesmo `countdown_started_at` do servidor.
7. Durante os três segundos, B chama `leave_room()`. A deve ver `status = waiting`, `countdown_started_at = null` e `ready = false`.
8. B entra novamente; A chama `kick_room_member()`. B perde membership e retorna ao Multiplayer com a mensagem amigável.

## Corrida pela segunda vaga

1. Deixe a sala apenas com A.
2. Abra duas sessões independentes autenticadas como B e C.
3. Dispare `join_room_by_code('<code>')` nas duas sessões praticamente ao mesmo tempo.
4. A função bloqueia a mesma linha de `rooms` com `FOR UPDATE`; somente a primeira transação insere o segundo membro.
5. A outra sessão deve receber `room_full` depois de adquirir o lock.
6. Confirme:

   ```sql
   select room_id, count(*)
   from public.room_members
   where room_id = '<room_id>'
   group by room_id;
   ```

   O resultado obrigatório é `2`, nunca `3`.

7. Em duas abas da mesma conta, repita entrada/criação. O índice único `room_members_one_active_room_per_user_idx` e o advisory lock por usuário devem manter uma única linha oficial.

## Host e saída

1. Com A (host) e B, A chama `leave_room()`.
2. Confirme `rooms.host_id = B` e `room_members.role = host` para B na mesma transação.
3. Convites pendentes do host antigo devem mudar para `expired`.
4. Quando o último membro sai, confirme `status = cancelled`, `closed_at is not null` e ausência de membros.

