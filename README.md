# DevRoyale

Arena gamificada de programação focada em Batalhas de Devs.

**Versão atual:** V1.5 (`1.5.0`)

**Status:** Release

O DevRoyale transforma prática de programação em uma arena competitiva. A Batalha de Devs é o modo principal; Bug Arena e Treinamento de Devs funcionam como preparação para desafios mais exigentes.

## Principais funcionalidades

- Batalha de Devs com rival simulado;
- validação flexível, capaz de aceitar diferentes soluções corretas;
- feedback contextual de quase acerto nos níveis iniciais, sem aceitar respostas aproximadas;
- editor profissional com auto-close, indentação, Tab/Shift+Tab e histórico local de edição;
- dicas progressivas;
- solução de referência disponível após o encerramento da batalha;
- integridade da Arena com avisos visuais e proteção contra paste;
- Bug Arena;
- Treinamento de Devs;
- sistema central de XP e níveis;
- conquistas e histórico de atividade;
- Dashboard;
- Perfil com avatar, bio e preferências por usuário;
- Interview Mode;
- onboarding de primeira entrada;
- Light Mode e Dark Mode.

## Catálogos da V1.5

- 56 desafios de Batalha;
- 96 bugs para correção;
- 102 aulas distribuídas em 32 trilhas de treinamento;
- Python, JavaScript, SQL e HTML/CSS na Arena.

## Batalha de Devs

A pessoa escolhe linguagem e dificuldade, entra no cockpit, resolve o objetivo no editor e executa a solução antes do rival simulado.

Dificuldades disponíveis:

- Nunca programei;
- Básico;
- Intermediário;
- Avançado.

A validação considera o resultado e as restrições explícitas do desafio. Soluções equivalentes podem vencer sem serem idênticas à referência. Diferenças apenas aproximadas de saída continuam incorretas.

Uma vitória válida concede XP apenas na primeira conclusão do desafio. Derrota e repetição não concedem XP adicional.

### Integridade da Arena

Na batalha casual:

- Nunca programei não registra advertências de saída;
- Básico, Intermediário e Avançado registram saídas da Arena;
- a primeira e a segunda saída exibem avisos visuais;
- a terceira saída marca a integridade como comprometida;
- não há voz, som, bloqueio temporário, derrota automática ou perda de XP.

A arquitetura mantém regras configuráveis para uma futura Ranked, que ainda não está disponível. Nessa configuração futura, a segunda saída poderá bloquear o editor por quatro segundos e a terceira poderá encerrar a partida. A Ranked não usará voz ou áudio de integridade.

## Bug Arena

- filtros por linguagem, dificuldade e tamanho;
- recomendação baseada no histórico de treinamento;
- seleção de bug novo;
- treino infinito;
- prevenção de XP duplicado em bugs já concluídos.

## Treinamento de Devs

- 8 temas;
- 4 níveis por tema;
- 32 trilhas;
- 102 aulas;
- exemplos comentados, erros comuns e miniatividades;
- recursos externos confiáveis;
- histórico e continuidade de aprendizado;
- progresso persistido somente para usuários autenticados localmente.

## Progresso e perfil

XP, níveis, conquistas, conclusões e atividades são centralizados e isolados por usuário. Dashboard e Perfil usam esses dados reais do armazenamento local.

A autenticação atual é local. Avatar, bio, experiência e linguagem favorita também são persistidos por usuário.

## Tecnologias

- React;
- TypeScript;
- Vite;
- React Router;
- CSS;
- Git/GitHub;
- Vercel;
- LocalStorage.

## Execução local

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

Gere a build de produção:

```bash
npm run build
```

Visualize a build localmente:

```bash
npm run preview
```

Execute o lint:

```bash
npm run lint
```

## Estrutura resumida

```text
src/
  assets/       Imagens e identidade visual
  components/   Componentes da Arena e elementos reutilizáveis
  config/       Metadados e regras configuráveis
  contexts/     Autenticação e tema
  data/         Catálogos de batalhas, bugs e aulas
  hooks/        Integridade, dialogs e hooks de aplicação
  pages/        Páginas principais
  routes/       Rotas e proteção de acesso
  styles/       Base visual, temas e estilos por página
  utils/        Validação, progresso e persistência local
```

O `vercel.json` mantém o rewrite necessário para que rotas SPA sejam servidas pelo `index.html`.

## Limitações atuais

- multiplayer ainda não existe;
- Ranked ainda não existe;
- a batalha atual usa rival simulado;
- autenticação e progresso usam armazenamento local;
- não há sincronização entre dispositivos;
- o backend competitivo fica para a V2.0;
- Interview Mode é um treino local, sem IA integrada.

## Roadmap V2.0

- multiplayer;
- matchmaking;
- Ranked;
- ranks;
- temporadas;
- chat;
- modo espectador;
- VIP;
- monetização.

O roadmap não possui datas públicas definidas.

## Créditos

Criado por Guilherme Rodrigues.

Instagram: [@buenolherme](https://www.instagram.com/buenolherme/)
