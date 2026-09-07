# V2.0E â€” roteiro manual A/B, concorrência e recuperação

Este roteiro depende de um projeto **local/de teste** com a migration V2.0E aplicada,
a Edge Function servida e um Judge0 sandboxado configurado. Não o execute em
produção. Use três contas A, B e C e mantenha o DevTools aberto para confirmar
que nenhuma resposta inclui source do rival, hidden input/expected ou token do Judge0.

## Configuração server-side do Judge0

Configure somente o ambiente das Edge Functions. Nunca exponha estas variáveis no
frontend e não crie equivalentes com prefixo `VITE_`.

- Judge0 nativo/self-hosted: `JUDGE0_AUTH_MODE=judge0`, `JUDGE0_BASE_URL` e
  `JUDGE0_AUTH_TOKEN`. O token é enviado no header `X-Auth-Token`. Por
  compatibilidade com instalações existentes, omitir `JUDGE0_AUTH_MODE` também
  seleciona este modo.
- RapidAPI: `JUDGE0_AUTH_MODE=rapidapi`,
  `JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com`, `JUDGE0_RAPIDAPI_KEY` e
  `JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com`. A chave e o host são enviados
  nos headers `X-RapidAPI-Key` e `X-RapidAPI-Host`.
- Opcionais nos dois modos: `JUDGE0_PYTHON_LANGUAGE_ID` e
  `JUDGE0_JAVASCRIPT_LANGUAGE_ID` para sobrescrever os IDs padrão.

O arquivo `supabase/functions/.env.example` contém apenas placeholders vazios.
Preencha valores reais somente no gerenciador de secrets do ambiente de execução.

## Ativação concorrente e mesmo desafio

1. A e B entram na mesma quick room, ficam prontos e aguardam o countdown oficial.
2. Ao zerar, mantenha as duas janelas ativas para sobrepor
   `activate_multiplayer_match(room_id)`.
3. Confirme administrativamente: uma match para a room, dois players, um round 1.
4. Compare as duas telas: `match id`, `round id`, `challenge id`, enunciado e
   `started_at` devem ser idênticos.
5. Confirme no banco que a room saiu de `starting` para `in_match` com
   `countdown_started_at is null`, sem violar `rooms_countdown_consistency`.
6. Repita duas chamadas concorrentes de `activate_multiplayer_match`: deve existir
   exatamente uma match, dois players e um round 1.
7. C tenta abrir a URL, chamar `get_multiplayer_match_state` e assinar
   `match:<matchId>`; leitura e canal precisam ser rejeitados.

## Quick Match BO1 e hidden test

1. A usa **Executar** com uma solução que passa o exemplo público. O round não
   pode terminar, mesmo se o resultado for `accepted` para o modo `run`.
2. A envia uma solução deliberadamente incompleta que falha um caso oculto.
   A recebe feedback genérico e continua no round; B não recebe stdout/detalhe.
3. B envia uma solução correta. O banco define B como winner do round e da match.
4. Ambos recebem `round_finished`, placar 0×1 e `match_finished` com B.
5. Recarregue as duas janelas: o mesmo resultado final deve ser restaurado.

## BO3 e BO5

1. Crie sala custom BO3. Faça A vencer o round 1, B o round 2 e A o round 3.
2. Entre rounds, confirme countdown de três segundos baseado em `started_at`,
   placar oficial 1×0 e depois 1×1, e novo challenge enquanto houver alternativa.
3. O resultado final deve ser A 2×1 B e nenhum round 4 deve existir.
4. Repita em BO5. Assim que um jogador chegar a três vitórias, a match termina e
   nenhum round adicional é criado.
5. Em pools com menos de cinco desafios, confirme que o servidor usa todos os
   alternativos antes de reciclar um challenge.

## Accepted simultâneo e duas abas

1. Prepare soluções corretas em A e B e envie quase simultaneamente.
2. Confirme que somente o primeiro `accepted` finalizado enquanto o round estava
   aberto recebe `winner_id`; o placar sobe apenas uma vez e só um próximo round nasce.
3. Abra duas abas da conta A e envie a mesma requisição HTTP com o mesmo
   `requestId`. Deve existir uma submission por `(match, user, requestId)`.
4. Envie simultaneamente dois `submit` com `requestId` diferentes. O lock estável
   `user + match + round + mode` deve aceitar somente um dentro de dois segundos.
5. Com requests diferentes, o rate limit deve continuar valendo; nenhuma combinação
   pode criar dois winners ou duplicar o placar.

## Não vazamento de hidden tests

1. Em um desafio de função, envie código que lance uma exceção contendo todos os
   argumentos recebidos e também os escreva em stdout/stderr.
2. No modo `submit`, confirme que resposta HTTP, `public_message`, Broadcast e RPC
   de estado não contêm o argumento, stack, harness, stdout ou stderr secretos.
3. Repita para `wrong_answer`, `compile_error`, `runtime_error` e `time_limit`; as
   mensagens devem ser genéricas. No modo `run`, use apenas casos públicos e confirme
   que o diagnóstico público continua útil.

## Recuperação de queued/running

1. Interrompa a função depois de gravar uma submission `queued`, antes de criar token.
2. Após a lease/stale window, invoque `reconcile-judge-submissions` como serviço.
   O claim deve usar `FOR UPDATE SKIP LOCKED`, reenviar uma vez e concluir a linha.
3. Interrompa depois de persistir `provider_token` e `test_position`. O reconciliador
   deve consultar o mesmo token e continuar do mesmo teste, sem novo Accepted/score.
4. Dispare dois reconciliadores simultâneos. Somente um pode adquirir cada lease.
5. Force três recuperações interrompidas. A próxima execução deve finalizar como
   `internal_error`, sem vitória ou derrota automática.
6. A função não é um scheduler: quando for implantada em ambiente de teste, configure
   um disparo server-side periódico (por exemplo, uma vez por minuto) autenticado com
   credencial de serviço. Nunca exponha essa credencial ao navegador.

## Ordem RPC, Realtime e F5 no Lobby

1. Atrase artificialmente a resposta HTTP de ativação e entregue primeiro a mudança
   Realtime `room.status = in_match`; a navegação deve resolver a match oficial.
2. Inverta a ordem: resposta RPC primeiro e Realtime depois. Deve ocorrer um único
   `replace` para `/batalha/match/:matchId`, sem loop.
3. Recarregue diretamente um Lobby cuja room já está `in_match`; `getCurrentMatch`
   deve localizar a match e abrir a Arena.

## F5, draft, desconexão e desistência

1. A digita sem enviar e recarrega. Deve voltar à mesma match/round/challenge/placar
   e recuperar o draft local pela chave `match + round + user`.
2. Feche o WebSocket ou coloque B offline. A deve ver **Reconectando...**, sem vitória
   automática. Quando B volta, a presença é restaurada.
3. Termine o round e confirme que o draft antigo foi removido e o novo round abriu
   com seu próprio starter code.
4. A usa **Desistir** e confirma. A fica `surrendered`, B vence e o F5 preserva isso.

## Judge indisponível, SQL e HTML/CSS

1. Em ambiente local, aponte temporariamente `JUDGE0_BASE_URL` para um endpoint
   indisponível. A submission deve terminar `internal_error`; ninguém perde ou vence.
2. Em desafio SQL, tente `ATTACH`, `PRAGMA`, `DROP` e `ALTER`: todos devem falhar no
   validator. Confirme nos logs que o SQL foi enviado apenas dentro do harness Python
   com SQLite `:memory:` no Judge0, nunca ao Postgres DevRoyale.
3. Em HTML/CSS, envie `<script>`, atributo `onclick` e URL `javascript:`. O validator
   deve rejeitar o texto sem executar qualquer script.

## Regressão

- V2.0D: fila, cancelamento, heartbeat, match found, quick room, ready e countdown.
- V2.0C: custom room, join code, convites, host, kick, settings e BO1/3/5.
- V2.0B/A: amigos, blocks, Presence, auth, perfil e sessão.
- V1.5: Casual local, editor, dicas, integridade, Bug Arena, estudos, Dashboard,
  Perfil e XP local.

Registre o resultado real de cada item somente depois da implantação no ambiente
de teste. O roteiro preparado, isoladamente, não comprova Judge0 nem um duelo A/B.
