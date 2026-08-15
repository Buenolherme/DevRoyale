# Checklist manual — Partida Rápida V2.0D

Execute somente em ambiente local ou de teste depois de aplicar
`20260814010000_quick_matchmaking.sql`. Use contas reais distintas e limpe as
salas/tickets de teste entre cenários. Estes testes não são executados pelo build.

## Preparação

1. Abra uma janela normal com a conta A e uma janela anônima com a conta B.
2. Quando o cenário pedir C, use outro perfil de navegador.
3. Em DevTools > Network, confirme que o frontend chama RPCs e não faz
   `INSERT`/`UPDATE` direto em `matchmaking_queue`.
4. Use a mesma linguagem e dificuldade somente nos cenários compatíveis.

## A/B compatível

1. A escolhe Python + Básico e clica em **Buscar partida**.
2. B escolhe Python + Básico e clica em **Buscar partida**.
3. Confirme que ambos recebem `match_found`, mostram a transição de adversário
   encontrado e entram no mesmo lobby.
4. No banco, confirme uma única sala `room_kind = 'quick_match'`, privada, BO1,
   sem espectadores e com exatamente dois membros.
5. Confirme que os dois tickets estão `matched` e apontam para essa sala.

## Incompatibilidade

1. A busca Python + Básico; B busca JavaScript + Básico.
2. Aguarde pelo menos dois polls. Eles devem continuar buscando.
3. Cancele e repita com A em Python + Básico e B em Python + Intermediário.
4. Eles também devem continuar buscando.

## Bloqueio social

1. Faça A bloquear B em **Amigos**.
2. Inicie a mesma busca em A e B.
3. Aguarde pelo menos dois polls; A e B não podem ser pareados.
4. Remova o bloqueio apenas depois de encerrar os tickets de teste.

## Cancelamento e ticket antigo

1. A inicia uma busca e anota o `ticket_id` antigo.
2. A cancela e inicia uma nova busca.
3. Chame `cancel_quick_match(ticket_antigo)` na aba antiga.
4. Confirme que o ticket novo permanece `searching`.
5. B inicia uma busca compatível e não deve encontrar o ticket cancelado.

## Stale e heartbeat

1. Em ambiente local/de teste, inicie uma busca com A e pare o heartbeat
   (feche todas as abas de A ou desligue a rede).
2. Aguarde mais de 30 segundos.
3. Inicie busca compatível com B e faça dois polls.
4. B não deve ser pareado com A.
5. Consulte o estado de A; ao passar por `get_quick_match_status`, `join` ou
   `poll`, o ticket antigo deve ficar `expired`.

## F5 e reconexão

1. Durante `searching`, recarregue A. A mesma tentativa deve ser restaurada,
   com o mesmo `ticket_id`.
2. Forme uma partida A/B e recarregue A na transição de encontrado. A deve ir
   para a sala correspondente.
3. Recarregue A dentro do quick lobby. O membership deve restaurar o lobby;
   nenhum `leave_room` deve ocorrer por F5.

## Duas abas

1. Abra duas abas autenticadas como A.
2. Clique em buscar nas duas com a mesma configuração.
3. Confirme que ambas observam o mesmo ticket e que existe somente uma linha
   `searching` para A.
4. Cancele em uma aba. A outra deve atualizar por Broadcast ou polling.
5. Inicie uma tentativa nova em uma aba e confirme que um cancelamento enviado
   com o ticket antigo não afeta a nova tentativa.

## Lobby rápido e saída

1. Forme A × B e confirme que não aparecem código, copiar, host/coroa, kick,
   convites, visibilidade, configurações ou espectadores.
2. A clica **Pronto**: a sala aguarda B.
3. B clica **Pronto**: o banco muda imediatamente para `starting` e define um
   único `countdown_started_at`.
4. Confirme que ambos mostram 3–2–1 usando esse timestamp e chegam ao
   placeholder da Arena.
5. Em uma nova partida, A usa **Sair da partida** antes da Arena.
6. B deve ver “O adversário saiu” e os botões **Buscar novamente** e
   **Voltar ao Multiplayer**. Não deve haver XP, vitória ou estatística.

## Regressões

### V2.0C — sala personalizada

- Criar sala privada e pública.
- Entrar por código e convite.
- Alterar linguagem, dificuldade, formato, visibilidade e espectadores.
- Confirmar ready, início manual pelo host, countdown, kick e transferência de host.
- Confirmar que salas rápidas nunca aparecem na lista pública.

### V2.0B — social

- Enviar/aceitar/recusar solicitação, listar amigos e bloquear/desbloquear.
- Confirmar Presence e atualizações Realtime sociais.

### V2.0A — conta

- Cadastro, confirmação quando habilitada, login, restauração de sessão,
  edição e leitura do perfil e logout.

