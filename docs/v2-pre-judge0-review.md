# DevRoyale V2 — revisão do polimento pré-Judge0

Base: branch `v2`, commit `99f2e68`. As alterações permanecem locais para revisão.

## Problemas encontrados e correções

| Área | Resultado |
| --- | --- |
| Rotas | Preservadas as rotas existentes; adicionados `/u/:username` e alias `/treinamento/estudos`. Título da aba, foco no conteúdo e retorno ao topo acompanham a navegação. |
| Perfil público | Avatar com fallback, display name, @username, bio, presença quando conectada, estado de amizade e ações sociais. Funciona também para visitante, com entrada para login preservando o destino. |
| Privacidade | Consulta explícita de campos públicos, usando a RLS existente. Não exibe e-mail, UUID técnico, sessão, tokens ou progresso local de outra pessoa. ID é usado internamente nas ações sociais. Nível/XP não são apresentados porque não há uma fonte pública autoritativa disponível para esses dados. |
| Amigos | Busca com debounce e descarte de respostas antigas; abas Todos, Online, Recebidas, Enviadas e Bloqueados; links para perfil público; aceitar, recusar, cancelar, remover, bloquear, desbloquear e convite. Feedback, loading, erros, retry e estados vazios. |
| Convite social | Reconsulta a sala atual antes de agir; usa sala personalizada do host ou cria uma privada. Explica sala cheia, sala de outro host, quick match ou partida já iniciada. Usa as RPCs existentes. |
| Header | Avatar público, @username, atalhos Multiplayer/Amigos, contadores de solicitações/convites, Perfil, Dashboard e logout. Disclosure acessível, fechamento ao navegar, Escape com retorno do foco, menu mobile rolável. |
| Multiplayer | Separa Partida rápida, Sala personalizada e Salas públicas; trata sala cheia, sala ativa e refresh. Mensagens técnicas substituídas por linguagem de produto. |
| Matchmaking | Busca com preferências, cronômetro sem anúncios a cada segundo, radar discreto e cancelamento. Match found usa avatares dos membros recebidos. Polling continua enquanto a sala encontrada está sendo recuperada. Resposta atrasada de polling não reabre busca cancelada. |
| Lobby | Avatares e links públicos; quick sem código/host/invite/kick. Custom mantém suas funções. Polling fallback também no custom, chamadas concorrentes compartilhadas e configurações em edição preservadas durante atualização. Ativação tem tentativas limitadas e recuperação pela interface. |
| Arena | Loading, avaliação, reconexão, Judge indisponível, intervalo e encerramento com mensagens compreensíveis. Ausência na Presence não representa desistência ou vitória. Cancelled/abandoned não viram derrota inventada. |
| Resultado | Vitória/derrota, placar, adversário, rounds vencidos e duração derivam do estado recebido. Diálogo com foco, Escape e opção de revisar a própria solução. Jogar novamente mantém preferências da quick; custom retorna ao Multiplayer. |
| Loading / empty | Componente PageState com altura reservada e skeleton; usado em Auth, navegação e telas sociais/multiplayer. Estados existentes de histórico vazio de Dashboard/Perfil preservados. |
| Erros | Ações novas exibem mensagens mapeadas, nunca objetos/stack de Supabase. Falha ao preparar foto também ganhou mensagem fixa. Falta de presença é explicitada, sem afirmar offline com conexão desconhecida. |
| Responsividade | Verificação em 1920×1080, 1366×768, 768×1024 e 390×844. Nenhum overflow horizontal detectado nos cenários testados. |
| Light/dark | Cards, estados, menus e overlays usam tokens do tema. Separados tokens de texto para melhorar contraste de badges, alertas e abas. |
| Acessibilidade | IDs gerados para Input/Select sem id, labels vinculados e aria-describedby preservado. Títulos h1 de Auth, main único na Arena/Bug Arena, foco visível, foco contido nos diálogos, controles nomeados e reduced motion global. |
| 404 / Sobre | 404 com identidade DevRoyale, Home e Batalha. Sobre deixa de apresentar todo o Multiplayer como recurso futuro. |
| Performance | Canal de convites compartilhado entre Header e páginas. Refreshes concorrentes agrupados, listeners/intervalos limpos, busca com debounce, dependências estáveis e fim do ciclo de refetch imediato na troca de round. |

A função de espectadores continua apenas como preferência já existente; esta etapa não implementa modo espectador. Ranked, chat e Interview continuam identificados como futuros. As regras Casual e os modos locais V1.5 não foram trocados.

## Verificações executadas

- `npm run lint`: aprovado, sem erros ou avisos.
- `npm run build`: aprovado (inclui `tsc -b` e Vite).
- `npx tsc --noEmit`: aprovado; também executado diretamente com `-p tsconfig.app.json`.
- `git diff --check`: aprovado. Git pode avisar sobre normalização LF/CRLF; não há erros de whitespace.
- `npm audit`: 0 vulnerabilidades. Nenhum audit fix ou atualização de dependências.
- Navegador Edge/Chromium: 80 combinações das telas Perfil, Amigos, perfil público, Multiplayer, custom lobby, quick lobby, Arena ativa, vitória, derrota e erro de Judge, nos quatro tamanhos e dois temas.
- Mais 10 rotas como visitante: Home, login, cadastro, batalha, alias de estudos, Bug Arena, Sobre, Dashboard protegido, 404 e perfil inexistente.
- Fluxos interativos: cancelar solicitação enviada; buscar e abrir perfil; ausência de e-mail/UUID na interface pública; buscar/cancelar partida; abrir/fechar resultado e desistência; recuperar draft após F5; falha de avaliador; menus mobile/Escape; restrições do quick lobby.
- Smoke de renderização de Dashboard, Casual, Treinamento e Bug Arena com sessão de teste.

Os testes visuais utilizaram respostas sintéticas **exclusivamente no navegador de teste**, com tráfego externo interceptado. Nenhum fixture foi incorporado a `src/`, nenhum resultado foi escrito em Supabase e nenhuma solução foi executada. Isso verifica apresentação e interação, não autenticação real, RLS remota ou um duelo real A/B.

Capturas, runner local e resultados JSON foram gerados fora do repositório em:
`C:/Users/Admin/.codex/visualizations/2026/08/14/019ffdcd-19ce-7421-b3a5-2164dc52b8ab/`.

## Arquivos criados no repositório

- `src/components/social/SocialActions.tsx`
- `src/components/ui/Avatar.tsx`
- `src/components/ui/PageState.tsx`
- `src/pages/PublicProfile.tsx`
- `src/styles/components/interface.css`
- `src/styles/pages/arena-polish.css`
- `src/styles/pages/multiplayer-lobby-polish.css`
- `src/styles/pages/social.css`
- `docs/v2-pre-judge0-review.md` (este relatório)

## Arquivos modificados

- `src/components/layout/AppLayout.tsx`
- `src/components/layout/Header.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/index.ts`
- `src/hooks/useDialogFocus.tsx`
- `src/index.css`
- `src/lib/profile-service.ts`
- `src/lib/room-realtime-service.ts`
- `src/lib/social-service.ts`
- `src/pages/Amigos.tsx`
- `src/pages/BugArena.tsx` (semântica de landmark)
- `src/pages/Cadastro.tsx` (título)
- `src/pages/Lobby.tsx`
- `src/pages/Login.tsx` (título)
- `src/pages/Multiplayer.tsx`
- `src/pages/MultiplayerArena.tsx`
- `src/pages/NotFound.tsx`
- `src/pages/Perfil.tsx`
- `src/pages/Sobre.tsx`
- `src/routes/GuestOnlyRoute.tsx`
- `src/routes/ProtectedRoute.tsx`
- `src/routes/index.tsx`
- `src/routes/lazyPages.ts`
- `src/routes/paths.ts`
- `src/styles/theme.css`
- `src/types/profile.ts`
- `src/types/social.ts`

## Limitações e revisão pendente

1. Testar autenticação e operações sociais/salas/presença com duas contas reais no ambiente de teste. A cobertura local não comprova policies ou entrega de Broadcast do projeto remoto.
2. Quando o avaliador estiver disponível e implantado, validar Python, JavaScript e SQL, testes ocultos, concorrência de Accepted e finais BO1/BO3/BO5. Nesta etapa só foram validados os estados visuais, incluindo indisponibilidade.
3. Avaliação real da Edge Function (inclusive HTML/CSS), deploy e secrets não foram realizados. Os arquivos de Supabase, migrations e Judge0Provider permaneceram intactos.
4. Não houve auditoria WCAG completa com leitor de tela nem matriz cross-browser. Foi feita revisão de teclado, rótulos, foco, temas, reduced motion e layout no Chromium.
5. Não houve commit, push, configuração de secrets, Docker, execução de linguagens no Judge0, alteração de RLS ou migration.

Próximo passo: revisar o diff e a interface local; depois fazer o roteiro online A/B no ambiente de teste, respeitando a disponibilidade do avaliador.

