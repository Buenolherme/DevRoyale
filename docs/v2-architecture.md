# DevRoyale V2 — arquitetura e operação local

Estado em 2026-09-24: branch `v2`, candidato local `2.0.0-rc.0`. Este documento descreve o código, não atesta deploy remoto.

## Fluxo do produto

`/` mantém Batalha de Devs como ação principal. Treinamento (`/area-estudos`, também `/treinamento/estudos`) recomenda módulos por carreira ou tecnologia; uma aula pode apontar para um bug ou desafio **exatamente** relacionado. Bug Arena (`/bug-arena`) e Batalha Casual (`/batalha-devs`) são prática local. Dashboard (`/dashboard`) e Perfil (`/perfil`) exibem o progresso local disponível. Multiplayer (`/batalha/multiplayer`) abre sala personalizada, pública ou partida rápida; o lobby (`/batalha/sala/:code`) conduz à Arena (`/batalha/match/:matchId`). `/u/:username` é perfil público e `/amigos` concentra relações sociais. Login/cadastro, Sobre e 404 têm rotas próprias.

O catálogo de treino possui 8 temas, 32 módulos e 102 aulas; seis carreiras referenciam os módulos, sem copiar aulas ou premiar conclusão dupla. Dezoito mini exercícios têm verificação conceitual local. Os demais mantêm atividade de autoavaliação. Oito projetos são checklists locais, **sem submissão ou correção automática**. Vinte e três aulas possuem links explícitos para Bug Arena e/ou Batalha. Busca, favoritos, aula visitada, checklist e recomendação determinística ficam em `localStorage` por usuário. XP, nível e conquistas de treino também são locais; não equivalem a placar oficial ou progresso sincronizado em servidor.

## Multiplayer e judge

O frontend usa Supabase Auth, serviços de perfil/social/sala/match e eventos Realtime com polling de recuperação. Partida rápida não tem host, código, kick ou convite na interface; sala personalizada conserva essas ações. O lobby prepara a match e a Arena carrega o estado oficial, mantém draft local por jogador/round, oferece run/submit/surrender e mostra placar/resultados provenientes do servidor. Ausência na Presence não declara derrota. O suporte a BO1/BO3/BO5 e a escolha de challenge estão no schema/RPCs existentes; consulte a migration e os testes manuais antes de ativar em outro ambiente.

`judge-submission` autentica a pessoa usuária e usa RPCs server-side para autorizar a operação, aplicar limites e tratar idempotência. Python e JavaScript seguem para `Judge0Provider`; SQL isolado e HTML/CSS usam validadores internos. O resultado público é sanitizado, sem hidden test cases, source de terceiros ou logs internos. `reconcile-judge-submissions` cuida de jobs pendentes/lease/retry no servidor. Os testes offline usam doubles e não provam RLS nem o fluxo real A × B. Revisar concorrência de lease antes de ativar em produção: a função SQL que marca a submissão `running` não valida a posse de `locked_by` antes de sobrescrever, e a finalização não verifica dono do lease. Uma correção exige migration e não foi aplicada nesta etapa.

## Variáveis e execução

No frontend, `.env.example` só pede `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Nenhuma credencial Judge0, service role ou chave privada deve usar prefixo `VITE_`.

Na Edge Function, as credenciais são lidas apenas via `Deno.env`:

| Modo | Variáveis necessárias | Header enviado ao Judge0 |
| --- | --- | --- |
| Nativo/self-hosted (`JUDGE0_AUTH_MODE=judge0`; modo padrão legado se omitido) | `JUDGE0_BASE_URL`, `JUDGE0_AUTH_TOKEN` | `X-Auth-Token` |
| RapidAPI (`JUDGE0_AUTH_MODE=rapidapi`; suporte preparado, não usado neste trabalho) | `JUDGE0_BASE_URL`, `JUDGE0_RAPIDAPI_KEY`, `JUDGE0_RAPIDAPI_HOST` | `X-RapidAPI-Key`, `X-RapidAPI-Host` |

`JUDGE0_PYTHON_LANGUAGE_ID` e `JUDGE0_JAVASCRIPT_LANGUAGE_ID` são overrides opcionais. O template vazio está em `supabase/functions/.env.example`. Não guardar valores reais no repositório. As credenciais e configurações automáticas Supabase da Edge Function dependem do ambiente remoto; nenhuma configuração/deploy foi feita nesta etapa.

Para rodar localmente: `npm ci`, preencher `.env.local` com somente as duas variáveis públicas do frontend, `npm run dev`. Gates: `npm test`, `npm run lint`, `npm run build`, `npx tsc --noEmit`, `git diff --check`, `npm audit`. `npm test` é offline e não aplica migrations. `scripts/generate-multiplayer-challenge-seed.mjs` é uma ferramenta de geração separada, não parte dos testes padrão. Para validar multiplayer completo ainda são necessários schema remoto, RLS, functions/secrets e dois usuários reais; o teste de Judge0 isolado informado pelo usuário não substitui esse fluxo.

## Limites

Casual/Bug Arena fazem verificação local conservadora, não execução geral das linguagens. Uma solução semanticamente equivalente à referência pode ser rejeitada. A pontuação e os checklists locais podem divergir entre abas/dispositivos; o draft da Arena recupera após F5, mas não impõe exclusividade entre duas abas. Cloud é apenas percurso preparatório: ainda não há cursos próprios de Linux/Bash, redes, containers e provedores. Não há formação completa de React/TypeScript/Node.js. Ranked, MMR e outros modos futuros não fazem parte da V2 atual.
