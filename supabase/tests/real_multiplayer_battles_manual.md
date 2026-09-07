# V2.0E â€” roteiro manual A/B, concorrência e recuperação

Este roteiro depende de um projeto **local/de teste** com a migration V2.0E aplicada,
a Edge Function servida e um Judge0 sandboxado configurado. Não o execute em
produção. Use três contas A, B e C e mantenha o DevTools aberto para confirmar
que nenhuma resposta inclui source do rival, hidden input/expected ou token do Judge0.

## Ativação concorrente e mesmo desafio

1. A e B entram na mesma quick room, ficam prontos e aguardam o countdown oficial.
2. Ao zerar, mantenha as duas janelas ativas para sobrepor
   `activate_multiplayer_match(room_id)`.
3. Confirme administrativamente: uma match para a room, dois players, um round 1.
4. Compare as duas telas: `match id`, `round id`, `challenge id`, enunciado e
   `started_at` devem ser idênticos.
5. C tenta abrir a URL, chamar `get_multiplayer_match_state` e assinar
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
4. Com requests diferentes, o rate limit deve continuar valendo; nenhuma combinação
   pode criar dois winners ou duplicar o placar.

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
