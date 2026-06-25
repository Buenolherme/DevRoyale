# DevRoyale

DevRoyale é uma plataforma gamificada para estudantes e iniciantes aprenderem programação com trilhas guiadas, batalhas de código, correção de bugs e treino de entrevista técnica.

O projeto combina uma identidade visual dark/gamer com progressão por XP, níveis e conquistas, criando uma experiência de aprendizado mais envolvente sem transformar estudo em obrigação.

## Preview visual

A V1.0 do DevRoyale foi desenhada como uma arena premium para devs em evolução:

- Home com Scout Guerreiro, efeitos sutis, CTA para Batalha e Estudos.
- Área dos Estudos guiada pelo Scout Professor.
- Bug Arena com Scout Mecânico e foco em depuração de código quebrado.
- Batalha de Devs com preparação, contagem 3, 2, 1 e overlay de vitória/derrota.
- Dashboard e Perfil com progresso real salvo localmente.

## Funcionalidades

### Home

- Landing page premium com identidade dark/gamer.
- Scout Guerreiro integrado ao hero.
- CTAs para Batalha e Estudos.
- Cards para os principais modos do DevRoyale.
- Indicador honesto “Arena Online”, sem número fake de usuários.

### Área dos Estudos

- 8 temas disponíveis.
- 4 níveis por tema.
- 32 trilhas.
- 102 aulas originais.
- Histórico de estudos.
- XP ao concluir aulas.
- Visitantes podem navegar e estudar sem salvar progresso permanente.
- Usuários logados salvam histórico, XP e progresso localmente.

Temas disponíveis:

- Lógica de Programação
- Python
- JavaScript
- HTML/CSS
- SQL
- Git/GitHub
- Frontend
- Backend

Níveis:

- Nunca programei
- Básico
- Intermediário
- Avançado

### Bug Arena

- 96 desafios de correção de bugs.
- Filtros por linguagem, dificuldade e tamanho do código.
- Bugs novos priorizados.
- Ação “Bug novo aleatório”.
- Modo “Treino infinito”.
- Bugs repetidos podem ser praticados, mas não concedem XP novamente.
- Recomendações com base no histórico da Área dos Estudos.
- Scout Mecânico como guia visual e contextual.

### Batalha de Devs

- 56 desafios de código.
- Usuário escreve uma solução do zero.
- Dificuldades oficiais:
  - Nunca programei
  - Básico
  - Intermediário
  - Avançado
- Tela de preparação antes da batalha.
- Botão “Começar Batalha”.
- Contagem 3, 2, 1.
- Overlay de “Vitória!” e “Derrota” sobre o editor.
- Vitória concede XP conforme a regra do desafio.
- Derrota não concede XP e bloqueia o editor.
- Repetir desafio já concluído não concede XP novamente.

### Dashboard

- Progresso real do usuário.
- XP total.
- Nível atual.
- Progresso até o próximo nível.
- Estatísticas de aulas, bugs e batalhas.
- Atividade recente.
- Resumo de conquistas.

### Perfil

- Avatar/foto de perfil.
- Upload de imagem com otimização antes de salvar.
- Bio.
- Experiência editável.
- Linguagem favorita.
- Preferências persistidas por usuário.
- Botão “Ver conquistas”.
- Conquistas desbloqueadas e bloqueadas.

### Interview Mode

- Perguntas de treino técnico.
- Experiência local na V1.0.
- Sem IA real nesta versão.

### Sistema de progresso

- XP centralizado.
- Níveis.
- Conquistas.
- Histórico de atividade.
- Prevenção de XP duplicado.
- Isolamento por usuário no `localStorage`.
- Visitantes podem usar os modos, mas progresso permanente depende de login local.

## Tecnologias utilizadas

- React
- TypeScript
- Vite
- React Router
- CSS modularizado
- localStorage para:
  - autenticação mock;
  - sessão local;
  - progresso;
  - XP;
  - conquistas;
  - histórico de estudos;
  - bugs concluídos;
  - preferências do perfil.

## Como rodar localmente

Clone o repositório e instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

Acesse a URL exibida no terminal, geralmente:

```bash
http://localhost:5173
```

Gere a build de produção:

```bash
npm run build
```

Visualize a build localmente:

```bash
npm run preview
```

## Scripts disponíveis

```bash
npm run dev
```

Inicia o servidor de desenvolvimento com Vite.

```bash
npm run build
```

Compila TypeScript e gera a build de produção.

```bash
npm run lint
```

Executa a validação de lint do projeto.

```bash
npm run preview
```

Serve localmente a build de produção.

## Estrutura resumida do projeto

```txt
src/
  assets/              # Imagens dos Scouts e assets visuais
  components/          # Componentes reutilizáveis
    battle/            # Componentes da Batalha de Devs
    bug-arena/         # Componentes da Bug Arena
    home/              # Componentes específicos da Home
    layout/            # Header, footer, logo, Scouts e layout geral
    profile/           # Componentes do Perfil
    progress/          # Insígnias e conquistas
    studies/           # Componentes da Área dos Estudos
    ui/                # Componentes base de interface
  contexts/            # Contextos de autenticação e tema
  data/                # Catálogos locais de aulas, bugs e desafios
  hooks/               # Hooks reutilizáveis
  lib/                 # Serviços locais, como autenticação mock
  pages/               # Páginas principais
  routes/              # Rotas, lazy loading e proteção de rotas
  styles/              # CSS modularizado por base, layout, componentes e páginas
  types/               # Tipos TypeScript
  utils/               # Progresso, validações, histórico e preferências
```

## Status da V1.0

DevRoyale V1.0 está finalizado e pronto para deploy.

QA final realizado:

- Rotas principais validadas.
- Home validada em desktop e mobile.
- Estudos validados com 102 aulas.
- Bug Arena validada com 96 bugs.
- Batalha validada com 56 desafios.
- XP, níveis e conquistas validados.
- Dashboard e Perfil usando progresso real.
- `npm run lint` passando.
- `npm run build` passando.
- Preview de produção validado localmente.

## Limitações da V1.0

- A autenticação é mock/localStorage.
- Não há backend real.
- Não há sincronização entre dispositivos.
- Presença online real fica para versão futura.
- Interview Mode ainda é treino local, sem IA real.
- Testes E2E automatizados ficam para uma etapa futura.

## Roadmap futuro

Possíveis evoluções pós-V1.0:

- Backend real para autenticação e persistência.
- Sincronização de progresso entre dispositivos.
- Presença online real.
- Ranking e temporadas.
- Torneios e desafios semanais.
- Interview Mode com IA.
- Testes E2E automatizados.
- Painel administrativo para gerenciar conteúdos.
- Modo recruiter/empresas.
- Integrações com faculdades e comunidades.

## Créditos

Criado por Guilherme Rodrigues.

Instagram: [@buenolherme](https://www.instagram.com/buenolherme/)
