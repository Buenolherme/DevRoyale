# DevRoyale

Arena de batalhas de programação com Treinamento de Devs e Bug Arena como apoio. A branch `v2` está em validação local (`2.0.0-rc.0`); isso não anuncia um release de produção.

## O que existe

- Batalha Casual com rival simulado, validação e 56 desafios em Python, JavaScript, SQL e HTML/CSS.
- Treinamento: 102 aulas em 32 módulos e 8 temas; 6 carreiras reutilizam módulos. Busca, favoritos, roadmap, projetos por checklist e 18 exercícios conceituais verificados localmente.
- Bug Arena com 96 correções de referência, seleção por estudos, novo bug e treino infinito.
- Supabase Auth, perfis, presença, amigos, salas, partida rápida, lobby e Arena multiplayer.
- Edge Functions `judge-submission` e `reconcile-judge-submissions`, com Judge0 nativo/self-hosted e modo RapidAPI preparado. O caminho completo A × B ainda requer teste online.
- XP, níveis, conclusões e conquistas de treino local ficam no navegador, separados por usuário. Não são placar competitivo oficial e não sincronizam entre dispositivos.

## Executar

Requer Node.js compatível com Vite 8 e npm. Copie apenas os nomes de `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com dados do seu projeto. A URL/chave pública não concedem acesso de administrador. Não coloque `service_role` ou credenciais Judge0 em `VITE_*`.

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
npx tsc --noEmit
npm audit
```

`npm run preview` serve a build local. `npm test` usa apenas dados de teste em memória e valida catálogos, progresso, integridade e contratos das Edge Functions; não abre conexão com Supabase ou Judge0. Nenhum script aplica migrations.

## Estrutura

- `src/data/`: conteúdo de aulas, carreiras, projetos e desafios.
- `src/pages/`, `src/components/`, `src/routes/`: interface, rotas e proteção de sessão.
- `src/lib/`, `src/contexts/`, `src/utils/`: serviços, auth, validação e progresso local.
- `supabase/migrations/`: schema e políticas; `supabase/functions/`: avaliação e reconciliação.
- `scripts/`: verificações offline e geração de seed (a geração só deve ser executada conscientemente).
- `docs/v2-finalization-review.md`: estado, fluxos, variáveis de ambiente, testes e limitações.

## Limites atuais

O catálogo Casual e a Bug Arena usam validadores locais, não executam código arbitrário. A correção de bugs usa comparação conservadora com a referência e pode rejeitar uma solução equivalente. Projetos são checklist de autoavaliação. A V2 multiplayer depende de schema remoto, deploy das Edge Functions, secrets server-side e teste com dois usuários reais; as rotinas locais não comprovam isso. Ranked, MMR e novos modos competitivos não estão disponíveis.

Criado por Guilherme Rodrigues.
