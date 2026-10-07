# DevRoyale V2 — revisão de finalização

Data: 2026-09-24. Branch: `v2`. Base encontrada: `a5557d0 feat: polimento geral da v2 antes do Judge0`, inicialmente sem alterações locais. Estado entregue: modificações locais para revisão, sem `git add`, commit, push, migration aplicada, deploy, secret configurado ou gasto em serviço externo. Versão da interface e do pacote: `2.0.0-rc.0`, isto é, **candidato em validação**, não release de produção.

## Leitura executiva

**CONCLUÍDO no código:** o foco da Home segue na Batalha; Treinamento passou a conectar carreiras, cursos, aulas, exercício conceitual, projeto, Bug Arena e Batalha. A navegação é recuperável após F5. Recomendações e progresso local foram rotulados como tais. Corrigidos exemplos enganosos do catálogo de bugs, comparação que podia aceitar alterações dentro de literais/indentação, falhas de subscrição e alguns estados de auth/judge. A arquitetura e os comandos estão em [v2-architecture.md](v2-architecture.md).

**VALIDADO AUTOMATICAMENTE:** catálogos, referências, casos negativos, progressão local, integridade Casual, rotas, contratos isolados de Edge, modos de autenticação Judge0 e gates de código. Ver seção “Verificações finais” para resultado por comando.

**VALIDADO VISUALMENTE:** telas/estados em Edge/Chromium com backend sintético interceptado; não houve conexão de teste real com Supabase ou Judge0. Detalhes abaixo.

**DEPENDENTE DE TESTE ONLINE:** Auth/Presence/RLS reais, pedidos de amizade e bloqueios, salas, partida rápida, lobby e partida A × B com dois usuários, refresh/reconexão/disconnect, latência e autorização Realtime. A migration remota não foi verificada/aplicada nesta etapa.

**DEPENDENTE DE JUDGE0 END-TO-END:** DevRoyale → Edge Function → Judge0 → hidden tests → finalização atômica → resultado em duas Arenas. O usuário informou Judge0 CE 1.13.1 local com Python `Accepted` e `DEVROYALE_JUDGE_OK`; este trabalho **não repetiu nem ampliou** essa prova para o produto.

**BACKLOG FUTURO:** Cyber Arena — não implementado. Ranked completo, MMR, temporadas, torneios, spectator, chat global, recrutador/empresas/faculdades, VIP/pagamentos e novos cursos de tecnologias ausentes não foram abertos nesta etapa.

## Estado inicial e auditoria de conteúdo

O produto já trazia Supabase Auth/perfis/Presence/amigos/salas/matchmaking/Arena multiplayer, funções de judge/reconciliação e catálogo local. O Treinamento tinha 8 temas, 32 módulos, 102 aulas, exemplos, analogias, erros comuns e atividades. Inventário estrutural reproduzível: `node scripts/check-product.mjs --inventory`. Eram 56 desafios Casual e 96 bugs (32 modelos originais com 64 variantes geradas). A migration de judge mantém 52 desafios multiplayer ativos, 66 casos privados e 43 challenges com hidden cases distintos, conforme o verificador existente. Identificadores de aulas e bugs são únicos; não apareceu cópia exata de código de exemplo entre aulas ou de `brokenCode` entre os 96 bugs.

Problemas confirmados: falta de uma rota clara “continuar”, busca/favoritos/carreiras/projeto/checks integrados; sugestões amplas sem correspondência real; primeira sequência de Python/JS/lógica podia apresentar tema antes da base; sete modelos de bug ensinavam ou exigiam sintaxe/convenção inadequada; normalização ignorava conteúdo de literais/indentação e podia dar falso positivo; falhas assíncronas de track/untrack/remove podiam ficar sem captura; corrida no carregamento inicial de auth; mensagens do Judge0 sem prazo total de polling ou com detalhe bruto; documentação/versão antigas. Os módulos têm atividades e exemplos, mas **84 das 102 aulas não ganharam correção automática**. Algumas explicações linha a linha dos módulos gerados continuam genéricas e conceitos próximos reaparecem em níveis diferentes como revisão progressiva. Não houve reescrita em massa ou remoção de conteúdo bom.

## Treinamento, carreiras e ciclo de prática

As duas dimensões agora são temas/tecnologias existentes e 6 carreiras: Fundamentos, Front-End, Back-End, Full Stack, Dados e Cloud preparatória. Carreira é uma ordem de referências a módulos, não um curso clonado. Roadmap marca conclusão/etapa atual/próxima/futura, explica a razão de cada etapa e deixa navegação livre para quem já conhece o assunto. Cloud explicita lacunas em Linux/Bash, redes, containers e provedores; não se apresenta como formação completa. React, TypeScript e Node.js não viraram cursos rasos apenas para preencher nomes.

Cada aula mantém título, objetivo/descrição, explicação breve, exemplo comentado, erro comum e miniatividade/critério de sucesso. A interface adiciona próxima ação: check conceitual local em 18 aulas, link contextual de prática quando existe e próximo passo. Os checks não usam Judge0; a atividade das demais aulas é autoavaliação. Oito projetos por tema são objetivos/checklists locais; as carreiras compartilham ou compõem um projeto, sem afirmar submissão ou avaliação automática. Aulas e projetos são persistidos no navegador por usuário autenticado.

Foram ligados **23 IDs de aula** a desafios específicos compatíveis em linguagem e conceito. Um mapa explícito impede vincular só pela linguagem. Bug Arena recebe `?bug=ID`, Casual recebe `?challenge=ID`; falhas nessas atividades alimentam recomendação local. A sugestão “próximo treino” usa último estudo, falha conhecida e nível declarado, com regra determinística, não IA. Busca normalizada percorre curso/módulo/aula/conceito; filtros Todos/Em andamento/Concluídos/Não iniciados/Favoritos, estado vazio útil, percentual por curso/módulo/carreira e “Continuar treinamento” completam o circuito. A contagem deduplica aulas partilhadas por carreiras. Favoritos, visita, checks de projeto e última falha permanecem locais e sobrevivem a F5, não a troca de dispositivo.

Onboarding foi reduzido a dois passos e pergunta experiência, objetivo e interesse; “Nunca programei” indica começo acolhedor sem exigir combate. O guia Scout é discreto, usa texto de recomendação e não finge conversa/IA. A Home preserva Batalha principal, seguido por Treinamento/Bug e Multiplayer; Dashboard oferece próximo treino e sinaliza métricas locais. O rótulo da versão não diz V1.5 quando a branch é V2.

## Batalha Casual e Bug Arena

Casual mantém Nunca programei, Básico, Intermediário e Avançado. Nunca programei não monitora saída. Para Básico+, a redução de integridade conta até três saídas com aviso visual crescente; **não** há derrota automática, XP negativo, lock de 4 segundos, áudio ou voz. Ranked não foi alterado/aplicado ao Casual. Vitória e XP continuam exigindo resultado válido. “Quase correto” fica restrito a diferença meramente textual em Nunca programei/Básico; diferença numérica/semântica não recebe essa mensagem, e near-match jamais concede vitória. Teste automatizado percorre os quatro níveis.

Nos 96 bugs, o teste offline exige título/descrição/dica/explicação/código quebrado/correção, contagem consistente, referência aceita, código quebrado e vazio rejeitados. Os sete modelos ajustados cobrem semicolon opcional em JS, `reduce` com array não vazio, atributo HTML sem aspas, SQL `true`/`AS`/`DISTINCT` válidos e anotação Python de tupla. As 64 variantes geradas indicam quando o trecho é didático e pode precisar de contexto. Os três modos (base nos estudos, novo aleatório, infinito) foram preservados, com preferência por bug não concluído e indicação quando só restam repetidos. A validação local agora preserva conteúdo de strings, indentação Python e aspas SQL; ainda é comparação conservadora, **não execução geral**, e pode rejeitar outra solução semanticamente correta. O relatório não afirma que 96 programas foram executados em runtimes reais.

## Perfil, amigos, multiplayer e Arena

Perfil privado e público, amigos, Presence, salas e Arena receberam polimento na etapa anterior (`docs/v2-pre-judge0-review.md`), preservado aqui. A revisão atual confirmou por inspeção e cenários sintéticos: perfil público não mostra e-mail, UUID, token ou sessão; não inventa win rate/XP público; ações de solicitar/aceitar/recusar/cancelar/remover/bloquear/desbloquear e convite seguem serviços existentes; presença desconhecida não é afirmada como offline. O `AuthProvider` agora agrupa carregamento do perfil e impede sessão inicial antiga de sobrepor evento de auth posterior. Erros assíncronos de presença/canais são capturados. Isso **não** substitui verificação de segurança da RLS online.

Quick match mantém escolha, busca/cancelamento, retorno ao lobby e interface sem host/código/kick/convite. Sala custom conserva criar/entrar/código/host/ready/configuração/kick/convite/sair. Lobby tem atualização por Realtime com polling fallback e proteção existente contra resultado de navegação antigo; testes interativos locais verificaram restrições de quick e countdown/rotas com fixtures, não duas contas reais. Arena exibiu preparação, desafio, envio, avaliação, espera, reconexão, vitória/derrota, encerramento, oponente saiu, erro do judge e conexão nas fixtures. Draft por match/round/usuário volta após F5. Placar, rounds, duração confiável e vencedor vêm do estado de match, não de Presence ou cálculo otimista no cliente. Há ações de voltar e jogar novamente; surrender é ação explícita. **Duas abas** compartilham draft por `localStorage`, mas não há exclusão mútua — risco de sobrescrita documentado, não declarado resolvido.

## Judge0, Edge, hidden tests e segurança

Provider Judge0 atual foi preservado. Modo nativo usa `JUDGE0_AUTH_MODE=judge0` (ou padrão legado), `JUDGE0_BASE_URL`, `JUDGE0_AUTH_TOKEN` e header `X-Auth-Token`. RapidAPI está preparado com `JUDGE0_AUTH_MODE=rapidapi`, base URL/key/host server-side, mas **não foi utilizado**. Nada disso usa `VITE_*`: somente `Deno.env` na Edge Function. `.env.example` do frontend contém apenas a URL e chave publicável Supabase; `supabase/functions/.env.example` contém nomes vazios, não valores. Nenhum secret foi lido/configurado por este trabalho.

`judge-submission` verifica autenticação, passa identidade/idempotência às RPCs de autorização/rate limit, aceita run/submit e sanitiza saídas públicas; `reconcile-judge-submissions` mantém recuperação dos jobs. Run não revela log bruto/stack/hidden input; submit nunca devolve harness/expected/validator privados. HTML/CSS remove comentários antes de avaliar padrões exigidos, evitando texto exigido falso dentro de comentário. A requisição ao Judge0 tem timeout de 8 s e polling total de 20 s por caso; estouro de fila é `internal_error`, não “seu código excedeu tempo”. JSON inválido da Edge responde 400. SQL permanece isolado pelo validador próprio, HTML/CSS é validação estrutural (não renderização visual semântica). Os testes de Edge usam doubles e não geram tráfego de judge.

**Risco de release que exige migration/revisão separada:** a função SQL `mark_multiplayer_submission_running_internal` pode substituir `locked_by` sem checar posse; `finalize_multiplayer_submission_internal` não recebe/verifica o worker dono. Se lease expirar ou múltiplos casos demorarem, um worker antigo pode finalizar enquanto outro processa. Não alterei schema porque o pedido proíbe migration sem necessidade aprovada. O lease e o prazo por caso precisam de ensaio de concorrência/timeout antes de produção. RLS, winner atômico de round/match e challenge igual para ambos precisam de execução dos testes manuais com Supabase real; os arquivos e RPCs existem, mas não foram promovidos a “validados online”.

## Dashboard, XP, achievements e confiabilidade de UI

Dashboard prioriza nível, XP, atividade e próximo treino, com nota de origem local. XP por fonte tem deduplicação e separação por usuário no mesmo navegador; conquistas usam eventos reais desse armazenamento local. Não é fonte competitiva autoritativa, pode divergir entre abas/dispositivos e requer proteção server-side se virar placar oficial. `localStorage` inacessível/corrompido falha de modo controlado. Links de curso/bug/batalha usam IDs válidos e estados vazios apontam ação útil. Tema claro/escuro usa tokens existentes. Labels de `Select` não recebem opção vazia duplicada. Cenários em 1920×1080, 1366×768, 768×1024, 390×844 e tamanhos extras cobriram desktop/tablet/mobile; foco/teclado e contraste foram inspecionados nas telas principais. Não foi realizada auditoria WCAG formal com tecnologia assistiva.

Performance: refresh de perfil agrupado, estado stale de auth descartado, track/untrack/remove com erro tratado; os canais/listeners existentes foram inspecionados e a Arena teve amostragem de polling de 4 pedidos em ~10,5 s, cessando após navegação. Não há benchmark de tráfego ou monitoramento de produção. Busca usa estado local, sem requisição por tecla. O build revelou `scout-home` PNG de aproximadamente 1,42 MB sem compressão de transferência informada; otimização do asset merece revisão antes do release. A limpeza de TODO/FIXME/`console.log` fora de exemplos/testes não revelou debug de produção novo; `mockBugs` e catálogos `mock*` são dados locais intencionais, não prova de backend real. CSS/rotas legadas foram preservados sem exclusão arriscada.

## Verificações finais

| Gate | Resultado | Escopo |
| --- | --- | --- |
| `npm test` | Aprovado | 102 aulas, 96 referências de bugs, 56 desafios, 23 mapas, 18 checks, auth modes, hidden/sanitização/Edge isolada |
| `npm run lint` | Aprovado | ESLint do repositório |
| `npm run build` | Aprovado | TypeScript build + Vite; 203 módulos transformados |
| `npx tsc --noEmit` | Aprovado | checagem TS explícita |
| `git diff --check` | Aprovado | nenhum erro de whitespace; Git apenas avisou conversão futura LF/CRLF |
| `npm audit` | Aprovado, 0 vulnerabilidades | advisories da árvore npm; sem `audit fix` |

Teste visual Edge/Chromium: **214 cenários** de rotas e estados em light/dark, tamanhos desktop/tablet/mobile e visitante/autenticado sintético; 0 erros de console, 0 overflow horizontal, 0 campos sem nome e 0 erros brutos de serviço expostos nos cenários. Foram interagidos busca/favorito/F5, checklist/check, XP idempotente, links exatos para Bug, Cloud vazia, onboarding, perfil/amigos, quick/custom lobby, Arena/draft/F5/judge indisponível, diálogo/teclado e limpeza de polling. Capturas e JSON ficam fora do repositório em `C:/Users/Admin/.codex/visualizations/2026/08/14/019ffdcd-19ce-7421-b3a5-2164dc52b8ab/`. Todas as respostas remotas foram interceptadas. Portanto **VALIDADO VISUALMENTE** significa interface/interação com fixtures, não integração Supabase/Judge0.

## Arquivos desta etapa

Criados: `docs/v2-architecture.md`, este relatório; `src/data/trainingCatalog.ts`, `src/utils/training.ts`, `src/utils/practiceSource.ts`, `src/components/studies/TrainingExplorer.tsx`, `src/components/studies/LessonPractice.tsx`, `src/styles/pages/training.css`; `scripts/test-support.mjs`, `scripts/check-product.mjs`, `scripts/check-edge.mjs`.

Modificados: `README.md`, `package.json`, `package-lock.json`; `src/components/bug-arena/BugScoutRecommendation.tsx`, `src/components/layout/FirstVisitOnboarding.tsx`, `src/components/studies/StudiesIntro.tsx`, `src/components/ui/Select.tsx`, `src/config/appMeta.ts`, `src/contexts/AuthProvider.tsx`, `src/data/mockBugsExpansion.ts`, `src/data/studyLearningPathsExpansion.ts`, `src/index.css`, `src/lib/multiplayer-battle-realtime-service.ts`, `src/lib/presence-service.ts`, `src/lib/room-realtime-service.ts`, `src/pages/AreaEstudos.tsx`, `src/pages/BatalhaDevs.tsx`, `src/pages/BugArena.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Home.tsx`, `src/utils/battleValidation.ts`, `src/utils/bugStudyRecommendation.ts`, `src/utils/bugValidation.ts`, `src/utils/progress/progressStorage.ts`, `src/utils/studyHistory.ts`, `supabase/functions/judge-submission/_shared/judge0.ts`, `_shared/validators.ts` e `index.ts`.

## Limitações e próximo passo

Não chame a V2 de pronta para produção antes de: (1) revisão e correção autorizada da posse do lease por migration; (2) execução dos testes manuais de RLS/atomicidade no Supabase de validação; (3) deploy/configuração segura das Functions e Judge0 em ambiente de teste; (4) jornada real A × B com dois usuários, BO1/BO3/BO5, run/submit/hidden tests, disconnect/F5/duas abas e falhas de judge; (5) teste de acessibilidade com tecnologia assistiva e carga. Não executar esses passos automaticamente a partir deste relatório. Checklist de projeto não é avaliação; 84 aulas não têm check automático; validador local de bugs pode recusar correção equivalente; Cloud não é formação completa. O estado atual permanece para revisão manual do usuário, sem commit/push/deploy.

## Estado Git na entrega

`git status --short --branch`: `v2...origin/v2`, 28 arquivos rastreados modificados e 11 novos não rastreados; nenhum staged. `git diff --stat`: 28 arquivos rastreados, 272 inserções e 423 remoções; por definição não inclui os 11 arquivos novos. `git diff --check`: exit 0, sem erro de whitespace (avisos de normalização LF/CRLF no Windows). Nada foi commitado ou enviado.
