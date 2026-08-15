# Concorrência manual — A/B/C

Este roteiro depende da migration V2.0D aplicada em um banco local/de teste e
de três contas autenticadas. O objetivo é sobrepor chamadas reais; chamadas
sequenciais não exercitam `SKIP LOCKED`.

1. A inicia Python + Básico e permanece `searching`.
2. Prepare B e C com Python + Básico em duas janelas.
3. Dispare **Buscar partida** em B e C praticamente ao mesmo tempo. Para maior
   pressão, repita `poll_quick_match(ticket_id)` em paralelo nas duas sessões.
4. Consulte `matchmaking_queue`, `rooms` e `room_members` com uma conexão de
   administração.

Invariantes obrigatórios:

- exatamente um entre B e C fica `matched` com A;
- o terceiro permanece `searching`;
- existe uma única quick room contendo A;
- a quick room possui exatamente dois usuários distintos;
- os dois tickets matched têm o mesmo `matched_room_id`;
- nenhuma conta aparece em duas salas ativas.

Consulta administrativa sugerida:

```sql
select mq.user_id, mq.ticket_id, mq.status, mq.matched_room_id
from public.matchmaking_queue as mq
where mq.user_id in ('UUID_A', 'UUID_B', 'UUID_C')
order by mq.joined_at;

select rm.user_id, rm.room_id, r.room_kind, r.status
from public.room_members as rm
join public.rooms as r on r.id = rm.room_id
where rm.user_id in ('UUID_A', 'UUID_B', 'UUID_C');
```

Repita o cenário pelo menos dez vezes, alternando a ordem B/C. O resultado pode
ser A × B ou A × C; nunca podem existir simultaneamente A × B e A × C.

