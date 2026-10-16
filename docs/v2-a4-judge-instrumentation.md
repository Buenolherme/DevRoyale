# A4 — fechamento da contenção e substituição do catálogo

> Registro histórico da etapa A4, complementado pela
> [separação de suítes](v2-judge-suite-separation.md). O repositório é público:
> todos os casos, resultados e referências aqui descritos são demonstrativos ou
> material já exposto. “Privado/oculto” no relato dos testes significa somente
> não exibido pela API; não significa confidencial no Git. O relatório de suítes
> contém a arquitetura e o procedimento de implantação vigentes.

Base conferida: branch `v2`, HEAD `651afb10d60cadeae74e8ddc49eab7a60e330090`.
Inclui a contenção local anterior. Nenhum commit, push, deploy ou acesso ao
Supabase/Judge0 remoto. Migrations executadas exclusivamente em PostgreSQL 17
local descartável. Arquivos de segredos não foram lidos.

## Diagnóstico e identificação

| Identificador estável (slug) | Desafio | Linguagem / dificuldade |
| --- | --- | --- |
| `battle-v1-javascript-advanced-1` | Fila com limite de concorrência | JavaScript / Avançado |
| `battle-v1-javascript-advanced-2` | Memoização por argumentos | JavaScript / Avançado |

Os UUIDs dessas entradas são gerados por `gen_random_uuid()` na instalação do
banco; não estão fixados nas migrations. Não foram consultados UUIDs remotos.
A nova migration identifica exatamente os dois slugs e também suspende qualquer
entrada com `judge_config.harness`, conforme a política conservadora da Edge.
Os desafios e suas referências históricas não são excluídos.

A seleção ocorre em `devroyale_private.select_multiplayer_challenge`, chamada
por `activate_multiplayer_match` na primeira rodada e pelo finalizador vigente
em `20261007020840_harden_multiplayer_submission_worker_lease.sql` nas seguintes.
Antes desta alteração, os dois slugs eram todo o conjunto ativo de JS avançado.
O terceiro desafio antigo dessa dificuldade já estava inativo; não foi reativado.
O catálogo de treinamento local não é a fonte da seleção multiplayer e não foi alterado.

A vulnerabilidade foi reproduzida em containers: fonte e instrumentação antiga
compartilhavam o mesmo programa Node. Alterações em `__devroyaleActive`,
`__devroyaleMaxActive`, `Math.max`, `JSON.stringify` e `console.log` falsificavam
a aprovação da fila. Alterar `__devroyaleCalls` falsificava memoização sem cache.
Seis ataques receberam `accepted` nos wrappers antigos preservados como fixtures.
Renomear contadores ou usar regex não resolve a fronteira de confiança.

## Solução implementada

A Edge continua recusando qualquer `judgeConfig.harness` antes de criar o provider
ou retomar tokens/leases. O bloqueio também existe na geração da execução.
Submissões bloqueadas não viram respostas incorretas do jogador: o worker produz
`internal_error`, sem stdout privado. A fila e a memoização não foram reabilitadas.

A migration incremental `20261014000000_replace_untrusted_javascript_challenges.sql`
executa, em uma transação, suspensão, cadastro público dos substitutos,
proteções do banco e RPCs de consulta/cancelamento. Os casos foram extraídos
para `supabase/seeds/demo.sql` na etapa seguinte, enquanto essa migration ainda
era local e não aplicada. Nenhuma migration antiga aplicada mudou.

| Novo slug | UUID | Raciocínio exigido |
| --- | --- | --- |
| `javascript-advanced-route-coupon` | `a4000000-0000-4000-8000-000000000001` | Caminho mínimo dirigido com estado adicional para um cupom opcional |
| `javascript-advanced-weighted-schedule` | `a4000000-0000-4000-8000-000000000002` | Otimização de intervalos compatíveis com limite de escolhas |
| `javascript-advanced-critical-path` | `a4000000-0000-4000-8000-000000000003` | Caminho crítico e detecção de ciclos em todos os componentes |

Todos permanecem `javascript/advanced`, com `function_tests`. São três exemplos
públicos e 28 casos demonstrativos não exibidos na API (31 no total), incluindo entradas vazias quando
permitidas, ciclos, impossibilidade, limites, empates e escolhas que derrotam
heurísticas simples. Não há medição de concorrência/cache nem exigência de uma
implementação específica. As soluções alternativas exercitadas usam Floyd,
recursão com memoização e DFS, além das soluções de referência distintas.

O stdout continua sendo apenas uma resposta não confiável. A Edge compara o
valor com o esperado mantido fora do processo; não interpreta uma declaração
como “respeitei a concorrência” como prova de comportamento. Falsificar a saída
com o valor do exemplo público passa somente esse exemplo e falha nos casos
privados. Como em qualquer juiz por testes finitos, isto não prova correção para
todas as entradas possíveis, nem impede adivinhação de respostas conhecidas.

As entradas dos testes são necessariamente entregues ao processo que calcula
a função. `run` recebe apenas exemplos e `submit` não retorna stdout/diagnóstico
reservado. Isso não protege dados publicados no Git: os fixtures, resultados e
referências desta etapa são públicos e não poderão compor suítes competitivas
secretas. Novas suítes precisam ser criadas e provisionadas fora deste repositório.

## Multiplayer, indisponibilidade e histórico

- Seleção usa somente desafios ativos, sem harness e com testes públicos e
  privados. Linguagem e dificuldade devem coincidir exatamente com a partida.
  O catálogo passa de 52 para 53 entradas ativas, preservando as 16 combinações.
- A preferência por desafios ainda não usados foi preservada. BO5 pode repetir
  depois de esgotar os três substitutos, como já permitia o seletor anterior.
- Criação/configuração/início de sala e entrada/atualização da fila validam o
  conjunto escolhido. Pool vazia retorna erro claro, sem dificuldade alternativa.
  O polling valida também o caminho sem escrita, quando ainda não há adversário.
- Inserções de rodada/submissão e finalizações aceitas têm proteções no banco.
  Workers antigos ou resultados em cache não podem aceitar uma rodada suspensa.
  A transação que tentaria conceder vitória por desistência também é revertida.
- A verificação inclui rodadas anteriores da série: uma vantagem obtida em um
  desafio suspenso não pode ser convertida em nova vitória da partida.
- `get_multiplayer_match_state` preserva metadados públicos do desafio inativo e
  informa `unavailable`. Evita uma tela sem desafio e permite explicar a suspensão.
- A Arena bloqueia execução, envio, avanço automático e desistência nessa situação.
  Mostra “Encerrar sem vencedor”. A RPC exige autenticação e participação, bloqueia
  a partida com `FOR UPDATE`, é idempotente e rejeita cancelamento de partida saudável.
- Cancelar encerra rodadas pendentes e sala, expira convites, libera integrantes e
  tickets vinculados. Não gera vencedor, derrota por desistência ou novos pontos.
  Jobs pendentes podem terminar como erro interno na reconciliação existente.
- Contadores/rodadas já concluídos são preservados como histórico. Partidas que
  já estavam finalizadas antes da proteção não são recalculadas retroativamente.
  O algoritmo de pontuação e o finalizador vigente não foram modificados.

## Verificação executada

| Verificação | Resultado |
| --- | --- |
| `npm test` | Passou: produto, juiz histórico, Edge, política A4 e catálogo incremental |
| `npm run lint` | Passou, sem erros |
| `npm run build -- --config node_modules/.tmp/vite-a4-audit.config.mjs` | Passou: TypeScript + Vite, 203 módulos |
| `git diff --check` | Passou; somente avisos informativos de conversão LF/CRLF |
| `npm run test:judge:isolated` | Passou: 515 execuções dos substitutos + 18 execuções de legado/compatibilidade |
| `npm run test:a4:postgres` | Passou em PostgreSQL 17 local real, com todo o histórico de migrations |
| `npm run test:rooms:postgres` | Passou: A1, erro 42804/ready, convites, kick, countdown e saídas concorrentes |

O build usou `envFile: false` e URL/chave fictícias. Sua configuração temporária
foi removida; o resultado não é um artefato para deploy.

Detalhamento das evidências:

- 90 combinações de bloqueio na Edge: run/submit, fontes, harnesses conhecidos e
  desconhecido, execução nova e retomada, inclusive posição de teste além do fim.
  Nenhuma instanciação/chamada ao provider nos casos bloqueados.
- 18 falhas simuladas de transporte, polling e erro interno do provider, nos três
  substitutos e nos dois modos: `internal_error`, sem dados privados.
- 515 execuções: cinco variantes por desafio, 31 casos do catálogo e 72 casos
  adicionais determinísticos, com oráculos independentes. Referências e alternativas
  passam; soluções incorretas, respostas públicas constantes e serializer/contadores
  adulterados falham nos casos ocultos. As saídas reais dessas execuções também
  atravessam o worker completo em 30 combinações de variante e modo, com transporte
  e persistência simulados.
- Códigos não confiáveis executados somente em Node 22 dentro de containers sem
  rede, sem volumes/socket do host, filesystem somente leitura, UID 65534,
  capabilities removidas, no-new-privileges, memória/CPU/processos/timeout limitados.
  Cada caso roda em processo novo. Containers removidos ao final, sem baixar imagens.
- PostgreSQL: duas partidas antigas e quatro jobs run/submit são criados antes
  da migration; inclui série com vitória de rodada anterior. Finalizações antigas
  e desistência não alteram resultado; estranho não cancela; participantes cancelam
  idempotentemente, liberando membros, convites e tickets sem novos pontos.
- PostgreSQL: BO1/BO3/BO5 percorrem respectivamente 1/3/5 rodadas, via RPCs reais.
  Ambos veem o mesmo desafio; não há repetição antes de usar os três; run e erro do
  avaliador não pontuam; repetição do finalizador não duplica ponto; vitória final
  e formatos seguem as regras existentes. Outcomes do provider são sintéticos
  nessa suíte, pois o código é avaliado separadamente nos containers Node.
- PostgreSQL: pool vazia bloqueia criação, join/poll da fila, segunda prontidão e
  ativação após countdown. As falhas revertem suas escritas; sair/cancelar continua
  possível. A fila volta a formar partida rápida BO1 avançada quando há desafios.
  Suspensão posterior bloqueia novas submissões run/submit e permite encerramento.
- As verificações de catálogo agora conferem fixtures versus JSON do seed público,
  todos os conjuntos de dificuldade, testes públicos/privados e mensagens dos serviços.

## Limites e riscos restantes

1. Judge0 real, sua versão de Node, limites efetivos e isolamento não foram
   acessados. Falta validar latência, custo das 10–11 execuções por submit,
   retomada de leases, timeout e integração Deno/provider em homologação autorizada.
2. Realtime Supabase, RLS na plataforma completa e interface em dois navegadores
   reais não foram exercitados. O PostgreSQL usa stubs locais para auth/realtime;
   ACLs, autorização das RPCs e fluxos SQL foram testados. A UI foi compilada e
   seus serviços testados; falta a validação visual/interativa de reconexão e cancelamento.
3. A1 possui teste concorrente real com duas conexões. As novas regressões A4
   exercitam cancelamento/finalização sequencialmente; não equivalem a um teste
   de carga ou a todas as intercalações de rede/concorrência em produção.
4. Uma implantação futura precisa coordenar a contenção da Edge, a migration e
   o frontend. O banco protege contra aceitações antigas após a migration;
   clientes antigos não têm o novo botão de cancelamento. Resultados anteriores
   ao corte da implantação permanecem históricos, sem recomputação automática.
5. Não reativar os dois harnesses. Uma futura prova de concorrência/cache exige
   supervisor independente com medições autenticadas; o protocolo de stdout atual
   não fornece essa garantia. Outros avaliadores não foram certificados nesta tarefa.

O procedimento de implantação foi substituído pelo relatório de separação de
suítes. Ele exige provisionamento privado e novas suítes competitivas antes de
abrir partidas públicas. Nenhuma operação externa foi executada ou agendada.

## Todos os arquivos alterados em relação a 651afb1

Inclui os arquivos da contenção anterior ainda não commitados.

- `package.json`: comandos de regressão e inclusão do teste de catálogo.
- `scripts/check-edge.mjs`: erro sanitizado de desafio indisponível.
- `scripts/check-multiplayer-judge.mjs`: bloqueio do harness e catálogo histórico.
- `scripts/check-room-host-transfer.mjs`: modo A4 no runner PostgreSQL isolado.
- `scripts/check-a4-catalog.mjs`: consistência do catálogo e mensagens dos serviços.
- `scripts/check-judge-isolated.mjs`: reprodução adversarial, substitutos e worker.
- `scripts/check-judge-policy.mjs`: política, retomadas e indisponibilidade do provider.
- `scripts/fixtures/a4-replacements.mjs`: substitutos, casos, soluções e oráculos.
- `scripts/fixtures/judge-adversarial.mjs`: fontes sintéticas e wrappers antigos.
- `src/lib/matchmaking-service.ts`: mensagem de pool indisponível.
- `src/lib/multiplayer-battle-service.ts`: erros e RPC de cancelamento controlado.
- `src/lib/room-service.ts`: mensagem de pool indisponível.
- `src/pages/MultiplayerArena.tsx`: suspensão visível, ações bloqueadas e encerramento.
- `src/types/database.ts`: assinatura da nova RPC.
- `src/types/multiplayer-battle.ts`: sinal de indisponibilidade.
- `supabase/functions/judge-submission/index.ts`: indisponibilidade como HTTP 409.
- `supabase/functions/judge-submission/_shared/process-submission.ts`: política antes do provider.
- `supabase/functions/judge-submission/_shared/validators.ts`: remoção/bloqueio dos harnesses.
- `supabase/migrations/20261014000000_replace_untrusted_javascript_challenges.sql`: catálogo e proteções atômicas.
- `supabase/tests/a4/legacy_setup.sql`: histórico vulnerável sintético pré-migration.
- `supabase/tests/a4/regression.sql`: regressões PostgreSQL do A4.
- `docs/v2-a4-judge-instrumentation.md`: este relatório, atualizado após a contenção inicial.
