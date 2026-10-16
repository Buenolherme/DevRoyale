# conjunto disponível.

Revogação ou incompatibilidade de modo bloqueia novas aceitações e vitórias por
desistência, inclusive se uma rodada anterior da série ficou inválida. O estado
público informa indisponibilidade e a Arena oferece “Encerrar sem vencedor”, com
RPC autenticada, limitada a participantes e idempotente. A ação libera sala,
integrantes, convites e fila sem conceder novos pontos. Histórico já finalizado
não é recalculado. Rodadas antigas demonstrativas não são promovidas a competitivas.

## Fronteiras de confidencialidade

- O frontend recebe metadados, exemplos e `evaluationMode`; não recebe IDs de
  suítes, configuração reservada, casos não-exemplos ou respostas esperadas desses
  casos. A Arena sinaliza partidas demonstrativas.
- `run` avalia apenas exemplos publicados. `submit` retorna status e mensagem
  controlada, sem stdout, stderr, dSeparação de suítes demonstrativas e competitivas — Etapa 1

Branch `v2`, base `651afb10d60cadeae74e8ddc49eab7a60e330090`, preservando as
alterações locais do A4. Nenhum commit, push, deploy, provisionamento remoto,
leitura de segredos ou alteração da `main` foi realizado.

## Resultado e limite de implantação

A estrutura agora distingue dados públicos demonstrativos de suítes competitivas
versionadas. Produção exige suíte competitiva ativa e não usa demonstrações como
fallback. **Nenhuma suíte competitiva real foi incluída nesta entrega. Aplicar
somente as migrations não deixa o multiplayer competitivo pronto para lançamento.**

As correções A1 e Pronto permanecem nas migrations originais, sem alterações.
A contenção A4 continua recusando os harnesses de concorrência e memoização,
inclusive em submissões retomadas. Os três substitutos JavaScript Avançado,
seus enunciados, contratos e validação determinística foram preservados:

| Slug | ID |
| --- | --- |
| `javascript-advanced-route-coupon` | `a4000000-0000-4000-8000-000000000001` |
| `javascript-advanced-weighted-schedule` | `a4000000-0000-4000-8000-000000000002` |
| `javascript-advanced-critical-path` | `a4000000-0000-4000-8000-000000000003` |

O algoritmo de pontuação não foi alterado. O modo demonstrativo utiliza as regras
existentes exclusivamente no ambiente local; ele não constitui um ranking público.

## Classificação dos dados

1. **Estrutura pública:** tabelas, constraints, funções, RLS e contratos de dados
   nas migrations. Metadados dos desafios e exemplos apresentados aos jogadores
   continuam públicos. Não colocar novas entradas reservadas, resultados secretos,
   geradores de casos competitivos ou soluções de referência nas migrations.
2. **Demonstração pública:** `supabase/seeds/demo.sql`, seu espelho de casos A4
   `a4-demo-tests.json`, fixtures e oráculos em `scripts/fixtures`. Podem ser lidos
   e reproduzidos por qualquer pessoa. `is_public=false` nesses dados significa
   apenas “não mostrar como exemplo durante run”; não significa segredo no Git.
3. **Dados competitivos futuros:** pacotes novos em armazenamento/repositório
   privado separado, acessíveis apenas ao provisionador autorizado. Não depender
   de `.gitignore` como fronteira de segurança; esses pacotes não devem entrar no
   checkout, CI público, imagens, bundles, fixtures ou artefatos desta aplicação.

O histórico publicado é material comprometido permanentemente. Na auditoria local,
os commits `fc89283` e `8eea787`, alcançáveis pela referência local `origin/v2`,
contêm versões dos dados históricos. Foram identificadas 97 combinações distintas
de slug/entrada/esperado/configuração entre essas versões; 66 casos não exibidos
como exemplo permanecem na migration histórica atual. Não houve consulta ou fetch
do GitHub nesta implementação. A classificação não depende de remover o histórico.

As migrations antigas permanecem intactas. A nova migration classifica seus dados
como `demo/historical_exposed`, inicialmente `retired`, e preserva vínculos de
rodadas existentes. O gerador antigo deixou de reescrever migrations: sua saída,
quando executado, será `supabase/seeds/legacy-demo-export.json`, explicitamente
`public_demo`. Ele não foi executado nesta etapa.

Os 31 casos dos substitutos A4 (3 exemplos e 28 não-exemplos), referências e
oráculos também são públicos. Foram extraídos da migration A4 **ainda local e não
aplicada**, sem modificar uma migration já aplicada. Os testes sintéticos da suíte
SQL usam a classificação competitiva somente para exercitar constraints e RPCs,
dentro de uma transação revertida em container descartável. Não são um pacote de
avaliação competitiva e nunca devem ser provisionados em produção.

## Modelo de dados e acesso

A migration `20261014010000_versioned_judge_suites.sql` adiciona no schema
`devroyale_private`:

| Objeto | Responsabilidade |
| --- | --- |
| `judge_policy` | Ambiente e modo de avaliação; padrão `production/competitive` |
| `judge_suites` | Desafio, versão, tipo, origem, estado e snapshot da configuração do avaliador |
| `judge_suite_tests` | Casos da versão, exemplos, resultados e configuração de validação |
| `multiplayer_round_suites` | Vínculo imutável entre rodada e versão da suíte |

O estado segue `draft → active → retired` ou `revoked`. Uma versão retirada pode
ser reativada; uma revogada não pode. Depois da primeira ativação, identidade,
casos e configuração são imutáveis. Há no máximo uma versão ativa por desafio e
tipo. Nova ativação retira a anterior em uma transação com locks e advisory lock.

A ativação exige exemplos compatíveis com o contrato público, pelo menos um caso
não-exemplo e ausência de harness bloqueado. Também rejeita cópias exatas de casos
demonstrativos conhecidos no banco para o mesmo desafio. Essa comparação não prova
originalidade: não detecta todas as variações equivalentes nem todo o histórico
publicado na internet. A revisão do pacote privado deverá considerar todo o
material já divulgado, inclusive versões que não estão mais na migration atual.

As quatro tabelas têm RLS habilitada e nenhum acesso direto concedido a `anon`,
`authenticated` ou `service_role`. O schema não é exposto pelo PostgREST. O worker
obtém somente o payload necessário pela RPC interna já restrita a `service_role`.
Usuários comuns não conseguem consultar casos, alterar configuração, versões,
ativação ou vínculos. Helpers novos têm EXECUTE revogado para os papéis de API.

`activate_judge_suite(uuid)` é uma preparação estrutural para o provisionador,
sem credencial, endpoint público ou permissões de escrita para o worker. Hoje a
operação exige um operador de banco autorizado. Um provisionador com privilégio
mínimo, auditoria e gestão de credenciais ainda precisa ser implementado fora do
pipeline público.

A constraint impede `environment=production, mode=demo`; a consulta de modo também
falha de forma conservadora. Um administrador com controle do banco pode alterar
o ambiente para `local`: esse operador faz parte da fronteira de confiança. O
aplicativo não consegue comprovar fisicamente onde um banco administrado por terceiros
está rodando. Nenhuma variável enviada pelo frontend seleciona o modo.

## Seleção, versionamento e partidas existentes

Novas partidas exigem desafio ativo com uma suíte ativa do tipo permitido pelo
ambiente. Linguagem e dificuldade permanecem exatas. A falta de uma suíte válida
gera `challenge_pool_unavailable`, traduzido pelos serviços em indisponibilidade,
antes de criar uma partida impossível. Salas e fila mantêm as proteções A4 para
criação, configuração, prontidão, countdown, polling e ativação.

Cada rodada fixa sua suíte uma única vez. Ambos os jogadores, `run`, `submit`,
retries e reconciliação recebem a mesma versão, mesmo quando outra é ativada.
Versões `retired` continuam servindo rodadas já vinculadas; não entram em novas
seleções. Os locks de leitura da política e das suítes acompanham a finalização
para serializar aceitação contra revogação ou mudança de modo.

Uma série BO3/BO5 pode iniciar uma rodada posterior com uma versão nova: o vínculo
é por rodada, como solicitado, e permanece igual para os dois participantes.
BO1/BO3/BO5 preservam seleção sem repetição até esgotar o etalhes de testes ou métricas finas de tempo e
  memória. A sanitização ocorre também na persistência SQL, cobrindo workers antigos.
- O worker armazena somente `judge_worker_failed` em erros de reconciliação;
  mensagens brutas do banco/provider não são copiadas para diagnósticos. O backoff
  existente de 30 segundos foi preservado. Linhas históricas não foram apagadas.
- Os wrappers do Judge0 precisam entregar a entrada ao programa não confiável;
  isso é inevitável para executar a função. O esperado e a comparação ficam na
  Edge. A confidencialidade também depende do isolamento de rede, acesso a tokens,
  retenção e logs do executor. Esses controles de infraestrutura não foram
  verificados contra Judge0 real nesta entrega.
- O status final é um sinal inevitável de um juiz por testes. Remover métricas
  reduz canais de inferência, mas não promete impedir toda inferência por tentativas
  repetidas ou tempo total. Limites de tentativas e monitoramento continuam relevantes.
- Os checks de importação e bundle verificam marcadores e caminhos conhecidos;
  são regressões úteis, não um detector universal de dados secretos ou codificados.
  O catálogo público de treinamento mantém suas referências intencionalmente públicas.

## Desenvolvimento reproduzível

Uma instalação nova executa as migrations e o seed público configurado em
`supabase/config.toml`. O seed é idempotente, ativa 53 suítes demonstrativas aptas
e não altera a política do ambiente. Há cobertura demonstrativa para as 16
combinações atuais de linguagem/dificuldade, incluindo os três substitutos.

Depois de preparar e iniciar o projeto Supabase **local** `DevRoyale`, com as
migrations atuais, execute explicitamente:

```sh
npm run db:demo:local
```

Esse helper utiliza somente o socket Docker local e o container
`supabase_db_DevRoyale`, verificando o label do projeto; não aceita URL de banco,
não carrega `.env` e não usa contextos Docker remotos. Executa o seed e habilita
`local/demo`. Uma falha imprime apenas mensagem genérica. Não executar reset de
banco com dados que precisem ser preservados para seguir este procedimento.

O helper não foi executado contra um stack Supabase CLI completo nesta sessão.
O SQL do seed, sua repetição e a opção de modo foram exercitados no PostgreSQL
descartável dos testes. Nenhum acesso a futuros dados privados é necessário para:

```sh
npm test
npm run test:rooms:postgres
npm run test:a4:postgres
npm run test:suites:postgres
npm run test:judge:isolated
npm run lint
npm run build
git diff --check
```

Os testes de banco usam PostgreSQL 17 local descartável, com stubs de auth e
realtime. O runner de código usa Node 22 em containers isolados, sem rede,
volumes do host ou credenciais, com limites de recursos. Os runners exigem imagens
locais previamente disponíveis; esta entrega não instalou serviços pagos ou dados
privados. Saída detalhada dos runners é permitida apenas porque seus fixtures são
públicos; não reaproveitar esses runners para imprimir pacotes privados.

## Procedimento futuro de implantação — não executado

1. Revisar esta entrega e preparar homologação isolada. Não liberar tráfego
   competitivo enquanto não houver cobertura real e privada para as combinações
   anunciadas. Manter uma janela de manutenção para evitar workers em voo carregados
   com payloads anteriores à mudança de fonte dos testes.
2. Criar fora deste repositório pacotes privados novos por desafio/versão. Usar
   enunciado e contrato públicos, resultados verificados por oráculos independentes,
   testes contra soluções equivalentes e incorretas e limites realistas do executor.
   Não reutilizar casos comprometidos nem referências públicas como prova de segredo.
3. Implementar pipeline privado com aprovação, identidade própria e privilégio
   mínimo. Usar conexão segura e parâmetros vinculados, sem SQL gerado em logs,
   echo de payloads, anexos de CI ou acesso por PRs de forks. Desativar/redigir
   captura de parâmetros, dumps de erro, APM e logs SQL que possam registrar dados.
   Validar essa configuração no provedor: o código local não controla os logs da
   infraestrutura Supabase/Judge0.
4. Coordenar Edge e frontend compatíveis; aplicar primeiro a migration A4 e depois
   a de suítes, preservando todas as migrations já aplicadas. A política inicial
   será `production/competitive`; rodadas antigas incompatíveis poderão ser
   encerradas sem vencedor. Não habilitar `local/demo` no banco de produção.
5. Por desafio, inserir uma versão `competitive/private_provisioning` em `draft`,
   carregar os casos privadamente e validar o pacote. Registrar digest/identidade do
   pacote no inventário privado do provisionador, com rastreabilidade de aprovação.
   Ativar via `activate_judge_suite` em transação; somente depois admitir a combinação
   no lançamento. Não alterar casos/configuração de uma versão selada. Mudanças de
   contrato público devem criar outra identidade de desafio, evitando incompatibilidade
   entre enunciado e rodadas antigas.
6. Homologar com Judge0 real: autenticação de execução, rede bloqueada, versões de
   linguagem, retenção/acesso a tokens, logs, timeout, leases, retomadas e sanitização.
   Verificar PostgREST/Realtime e dois navegadores, incluindo indisponibilidade,
   reconexão, cancelamento, BO1/BO3/BO5 e ausência de conteúdo privado nas respostas.
7. Conferir cobertura por linguagem/dificuldade, permissões e versões; então abrir
   tráfego. Para problemas de qualidade, retirar a versão de novas seleções. Para
   vazamento ou adulteração, revogar e encerrar partidas afetadas sem resultado novo.
   Nunca fazer rollback habilitando demonstrações em produção.

## Evidências desta entrega

| Verificação | Resultado |
| --- | --- |
| `npm test` | Passou: produto, Edge, A4, catálogo demonstrativo, sanitização e fronteiras de dados |
| `npm run lint` | Passou, sem erros |
| `npm run build` com config temporária segura | Passou: TypeScript + Vite, 203 módulos |
| `node scripts/check-suite-boundaries.mjs --build` | Passou: bundle sem marcadores dos novos fixtures de servidor |
| `npm run test:suites:postgres` | Passou em PostgreSQL 17 real; seed executado duas vezes |
| `npm run test:rooms:postgres` | Passou: A1, Pronto/42804, convites, kick, countdown e saídas concorrentes |
| `npm run test:a4:postgres` | Passou: legado bloqueado, cancelamento, catálogo, fila, BO1/BO3/BO5 e idempotência |
| `npm run test:judge:isolated` | Passou: 515 execuções dos substitutos e 18 de legado/compatibilidade; worker completo em 30 combinações |
| `git diff --check` | Passou; apenas avisos informativos de conversão LF/CRLF |

O build usou `envFile:false`, URL local e chave fictícia em configuração temporária
removida ao final. Não é um artefato preparado para deploy.

No PostgreSQL foram confirmados: rejeição de demonstração em produção e de cópia
de casos expostos, impossibilidade de criar partidas sem suíte, ACLs/RLS,
ativação/retirada, versões imutáveis, vínculo preservado em retry e reconciliação,
lease antigo recusado, sanitização na persistência, revogação e cancelamento sem
vencedor. Os casos competitivos usados nessa regressão são explicitamente sintéticos
e públicos, revertidos antes da remoção do container.

Os testes de versão/revogação são sequenciais. Os locks estão implementados, mas
não foi realizado teste de carga nem todas as intercalações concorrentes entre
provisionamento e finalização. A1 tem regressão concorrente real. Plataforma
Supabase completa, Judge0 real, credenciais, configuração de logs do provedor,
provisionador privado e UI em navegadores continuam pendentes de homologação.

## Inventário de arquivos alterados desde a base

Inclui alterações anteriores do A4 preservadas no workspace:

- `package.json`
- `docs/v2-a4-judge-instrumentation.md`
- `docs/v2-judge-suite-separation.md`
- `scripts/check-edge.mjs`
- `scripts/check-multiplayer-judge.mjs`
- `scripts/check-room-host-transfer.mjs`
- `scripts/check-a4-catalog.mjs`
- `scripts/check-judge-isolated.mjs`
- `scripts/check-judge-policy.mjs`
- `scripts/check-suite-boundaries.mjs`
- `scripts/generate-multiplayer-challenge-seed.mjs`
- `scripts/seed-judge-demo.mjs`
- `scripts/fixtures/a4-replacements.mjs`
- `scripts/fixtures/judge-adversarial.mjs`
- `src/lib/matchmaking-service.ts`
- `src/lib/multiplayer-battle-service.ts`
- `src/lib/room-service.ts`
- `src/pages/MultiplayerArena.tsx`
- `src/types/database.ts`
- `src/types/multiplayer-battle.ts`
- `supabase/config.toml`
- `supabase/functions/judge-submission/index.ts`
- `supabase/functions/judge-submission/_shared/process-submission.ts`
- `supabase/functions/judge-submission/_shared/types.ts`
- `supabase/functions/judge-submission/_shared/validators.ts`
- `supabase/migrations/20261014000000_replace_untrusted_javascript_challenges.sql`
- `supabase/migrations/20261014010000_versioned_judge_suites.sql`
- `supabase/seeds/a4-demo-tests.json`
- `supabase/seeds/demo.sql`
- `supabase/tests/a4/legacy_setup.sql`
- `supabase/tests/a4/regression.sql`
- `supabase/tests/judge_suites/regression.sql`
