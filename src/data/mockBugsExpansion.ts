import type {
  Bug,
  BugCodeSize,
  BugCount,
  BugDifficulty,
  BugLanguage,
} from '@/types'

export type BugDefinition = Omit<Bug, 'baseXp' | 'xp'>

interface BugIssue {
  broken: string
  fixed: string
  explanation: string
}

interface BugBlueprint {
  title: string
  topics: string[]
  issues: [BugIssue, BugIssue, BugIssue, BugIssue]
}

const languages: BugLanguage[] = ['python', 'javascript', 'html-css', 'sql']
const difficulties: BugDifficulty[] = ['never', 'basic', 'intermediate', 'advanced']
const sizes: BugCodeSize[] = ['small', 'medium', 'large']

const languageLabels: Record<BugLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  'html-css': 'HTML/CSS',
  sql: 'SQL',
}

const difficultyLabels: Record<BugDifficulty, string> = {
  never: 'Nunca programei',
  basic: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

const sizeLabels: Record<BugCodeSize, string> = {
  small: 'pequeno',
  medium: 'médio',
  large: 'grande',
}

const bugCountBySize: Record<BugCodeSize, BugCount> = {
  small: 2,
  medium: 3,
  large: 4,
}

const issue = (broken: string, fixed: string, explanation: string): BugIssue => ({
  broken,
  fixed,
  explanation,
})

const pythonBlueprints: Record<BugDifficulty, [BugBlueprint, BugBlueprint]> = {
  never: [
    {
      title: 'Terminal da primeira missão',
      topics: ['print', 'strings', 'variáveis'],
      issues: [
        issue('print(Bem-vindo, Dev!)', 'print("Bem-vindo, Dev!")', 'Textos precisam estar entre aspas.'),
        issue('player = Luna', 'player = "Luna"', 'O nome Luna é uma string e precisa de aspas.'),
        issue('score 10', 'score = 10', 'A atribuição de valor precisa do operador =.'),
        issue('print("Pontos: " + score)', 'print("Pontos:", score)', 'Não se concatena texto e número diretamente com +.'),
      ],
    },
    {
      title: 'Cadastro do aventureiro',
      topics: ['input', 'números', 'booleanos'],
      issues: [
        issue('name = input(Digite seu nome: )', 'name = input("Digite seu nome: ")', 'A mensagem de input também é uma string.'),
        issue('age = input("Idade: ")\nnext_age = age + 1', 'age = int(input("Idade: "))\nnext_age = age + 1', 'A entrada deve ser convertida para inteiro antes da soma.'),
        issue('active = true', 'active = True', 'Booleanos em Python começam com letra maiúscula.'),
        issue('print(name, "terá", nextAge)', 'print(name, "terá", next_age)', 'O código deve usar o mesmo nome definido para a variável.'),
      ],
    },
  ],
  basic: [
    {
      title: 'Pontuação da rodada',
      topics: ['condicionais', 'loops', 'listas'],
      issues: [
        issue('if score = 10:\n    print("Vitória")', 'if score == 10:\n    print("Vitória")', 'Comparações usam ==, não o operador de atribuição.'),
        issue('for round_number in range(3)\n    print(round_number)', 'for round_number in range(3):\n    print(round_number)', 'O cabeçalho do for termina com dois-pontos.'),
        issue('items = ["mapa", "chave"]\nitems.add("poção")', 'items = ["mapa", "chave"]\nitems.append("poção")', 'Listas recebem novos itens com append.'),
        issue('total = sum[2, 4, 6]', 'total = sum([2, 4, 6])', 'sum é uma função e recebe a lista entre parênteses.'),
      ],
    },
    {
      title: 'Controle de tentativas',
      topics: ['while', 'índices', 'conversão'],
      issues: [
        issue('attempts = 0\nwhile attempts < 3:\n    print(attempts)', 'attempts = 0\nwhile attempts < 3:\n    print(attempts)\n    attempts += 1', 'O contador precisa avançar para o laço terminar.'),
        issue('players = ["Ana", "Bia"]\nprint(players[2])', 'players = ["Ana", "Bia"]\nprint(players[1])', 'A última posição de uma lista com dois itens é o índice 1.'),
        issue('level = "7"\nif level > 5:\n    print("alto")', 'level = int("7")\nif level > 5:\n    print("alto")', 'O nível deve ser numérico antes da comparação.'),
        issue('if ready == True\n    start()', 'if ready is True:\n    start()', 'A condição precisa de dois-pontos e pode comparar booleanos com is.'),
      ],
    },
  ],
  intermediate: [
    {
      title: 'Inventário confiável',
      topics: ['funções', 'dicionários', 'exceções'],
      issues: [
        issue('def find_item(items, name)\n    return items[name]', 'def find_item(items, name):\n    return items.get(name)', 'A função precisa de dois-pontos e get evita KeyError em chave ausente.'),
        issue('inventory = {"gold": 20}\nprint(inventory["gems"])', 'inventory = {"gold": 20}\nprint(inventory.get("gems", 0))', 'Uma chave opcional deve ter valor padrão.'),
        issue('try:\n    value = int(raw)\nexcept ValueError\n    value = 0', 'try:\n    value = int(raw)\nexcept ValueError:\n    value = 0', 'O bloco except termina com dois-pontos.'),
        issue('def average(values):\n    sum(values) / len(values)', 'def average(values):\n    return sum(values) / len(values)', 'A função precisa retornar o cálculo.'),
      ],
    },
    {
      title: 'Relatório de partidas',
      topics: ['compreensões', 'escopo', 'tratamento de dados'],
      issues: [
        issue('wins = [score for score in scores if score = 3]', 'wins = [score for score in scores if score == 3]', 'O filtro da compreensão usa comparação com ==.'),
        issue('def add_player(name, players=[]):\n    players.append(name)\n    return players', 'def add_player(name, players=None):\n    players = [] if players is None else players\n    players.append(name)\n    return players', 'Uma lista mutável não deve ser valor padrão compartilhado.'),
        issue('data = {"score": "dez"}\nscore = int(data["score"])', 'data = {"score": "dez"}\nscore = int(data["score"]) if data["score"].isdigit() else 0', 'A conversão precisa validar texto não numérico.'),
        issue('sorted_players = players.sort()', 'sorted_players = sorted(players)', 'list.sort altera a lista e retorna None; sorted devolve uma nova lista.'),
      ],
    },
  ],
  advanced: [
    {
      title: 'Pipeline de dados eficiente',
      topics: ['geradores', 'decoradores', 'context managers'],
      issues: [
        issue('def active_users(users):\n    return (user for user in users if user.active)\nprint(len(active_users(users)))', 'def active_users(users):\n    return (user for user in users if user.active)\nprint(sum(1 for _ in active_users(users)))', 'Geradores não possuem tamanho calculável com len.'),
        issue('def logged(fn):\n    def wrapper():\n        return fn()\n    return wrapper', 'def logged(fn):\n    def wrapper(*args, **kwargs):\n        return fn(*args, **kwargs)\n    return wrapper', 'O decorador deve encaminhar argumentos posicionais e nomeados.'),
        issue('file = open("scores.txt")\ndata = file.read()', 'with open("scores.txt", encoding="utf-8") as file:\n    data = file.read()', 'O context manager fecha o arquivo mesmo quando ocorre uma falha.'),
        issue('cache = {}\ndef remember(key, value):\n    cache = {key: value}', 'cache = {}\ndef remember(key, value):\n    cache[key] = value', 'Reatribuir cache cria estado local; atualizar a chave preserva o cache externo.'),
      ],
    },
    {
      title: 'Modelos e concorrência',
      topics: ['dataclasses', 'asyncio', 'imutabilidade'],
      issues: [
        issue('@dataclass\nclass Team:\n    members: list = []', '@dataclass\nclass Team:\n    members: list = field(default_factory=list)', 'Campos mutáveis de dataclass precisam de default_factory.'),
        issue('async def load():\n    result = fetch_data()\n    return result', 'async def load():\n    result = await fetch_data()\n    return result', 'Uma coroutine precisa ser aguardada com await.'),
        issue('tasks = [load(item) for item in items]\nresults = tasks', 'tasks = [load(item) for item in items]\nresults = await asyncio.gather(*tasks)', 'Criar coroutines não executa o trabalho; gather as aguarda.'),
        issue('from functools import lru_cache\n@lru_cache\ndef total(values: list):\n    return sum(values)', 'from functools import lru_cache\n@lru_cache\ndef total(values: tuple):\n    return sum(values)', 'Argumentos de uma função com lru_cache precisam ser hashable.'),
      ],
    },
  ],
}

const javascriptBlueprints: Record<BugDifficulty, [BugBlueprint, BugBlueprint]> = {
  never: [
    {
      title: 'Console da arena',
      topics: ['console', 'strings', 'variáveis'],
      issues: [
        issue('console.log(Bem-vindo, Dev!)', 'console.log("Bem-vindo, Dev!")', 'Textos precisam estar entre aspas.'),
        issue('const player "Luna";', 'const player = "Luna";', 'A declaração precisa do operador =.'),
        issue('let score = 10\nconsole.log(score)', 'let score = 10;\nconsole.log(score);', 'As instruções devem ser encerradas de forma consistente.'),
        issue('console.log("Pontos: " score);', 'console.log("Pontos:", score);', 'Os argumentos do console.log precisam ser separados por vírgula.'),
      ],
    },
    {
      title: 'Dados do novo jogador',
      topics: ['tipos', 'template strings', 'booleanos'],
      issues: [
        issue('const name = Ana;', 'const name = "Ana";', 'O nome é uma string e precisa de aspas.'),
        issue('let level = "4";\nlet next = level + 1;', 'let level = Number("4");\nlet next = level + 1;', 'O texto deve ser convertido para número antes da soma.'),
        issue('const active = True;', 'const active = true;', 'Booleanos em JavaScript são escritos em minúsculas.'),
        issue('console.log(`Jogador: {name}`);', 'console.log(`Jogador: ${name}`);', 'Interpolação em template string usa ${...}.'),
      ],
    },
  ],
  basic: [
    {
      title: 'Rodadas e recompensas',
      topics: ['condicionais', 'loops', 'arrays'],
      issues: [
        issue('if (score = 10) { console.log("Vitória"); }', 'if (score === 10) { console.log("Vitória"); }', 'A condição deve comparar com ===.'),
        issue('for (let i = 0; i < 3; i--) { console.log(i); }', 'for (let i = 0; i < 3; i++) { console.log(i); }', 'O contador deve avançar para o laço terminar.'),
        issue('const items = ["mapa"];\nitems.append("chave");', 'const items = ["mapa"];\nitems.push("chave");', 'Arrays recebem itens com push.'),
        issue('const total = [2, 4, 6].reduce((sum, value) => sum + value);', 'const total = [2, 4, 6].reduce((sum, value) => sum + value, 0);', 'O reduce deve receber um acumulador inicial seguro.'),
      ],
    },
    {
      title: 'Lista de participantes',
      topics: ['métodos de array', 'índices', 'conversão'],
      issues: [
        issue('const players = ["Ana", "Bia"];\nconsole.log(players[2]);', 'const players = ["Ana", "Bia"];\nconsole.log(players[1]);', 'O último índice de dois itens é 1.'),
        issue('const level = "7";\nif (level + 1 === 8) console.log("ok");', 'const level = Number("7");\nif (level + 1 === 8) console.log("ok");', 'A entrada deve ser convertida para número.'),
        issue('const active = players.filter(player => { player.online });', 'const active = players.filter(player => player.online);', 'Com chaves, a callback precisaria retornar o valor; a expressão direta já retorna.'),
        issue('const names = players.map(player => { name: player.name });', 'const names = players.map(player => player.name);', 'A callback deve retornar o nome, não abrir um bloco sem return.'),
      ],
    },
  ],
  intermediate: [
    {
      title: 'Estado da partida',
      topics: ['objetos', 'funções', 'promises'],
      issues: [
        issue('const state = { score: 10 };\nconsole.log(state.points);', 'const state = { score: 10 };\nconsole.log(state.score);', 'A leitura deve usar a chave que existe no objeto.'),
        issue('function total(items) { items.reduce((sum, item) => sum + item, 0); }', 'function total(items) { return items.reduce((sum, item) => sum + item, 0); }', 'A função precisa retornar o resultado.'),
        issue('fetchScore().then(console.log(score));', 'fetchScore().then(score => console.log(score));', 'then recebe uma função, não o resultado imediato de console.log.'),
        issue('const settings = defaults;\nsettings.theme = "dark";', 'const settings = { ...defaults, theme: "dark" };', 'Copiar por referência altera o objeto original; spread cria um novo objeto.'),
      ],
    },
    {
      title: 'Serviços assíncronos',
      topics: ['async/await', 'erros', 'desestruturação'],
      issues: [
        issue('async function load() {\n  const data = fetchData();\n  return data.items;\n}', 'async function load() {\n  const data = await fetchData();\n  return data.items;\n}', 'A Promise precisa ser aguardada antes de acessar items.'),
        issue('const { name } = user.profile;\nconsole.log(name);', 'const { name } = user.profile ?? { name: "Visitante" };\nconsole.log(name);', 'A desestruturação precisa lidar com perfil ausente.'),
        issue('try { await save(); } catch { throw error; }', 'try { await save(); } catch (error) { throw error; }', 'O erro precisa ser capturado antes de ser relançado.'),
        issue('const results = urls.map(async url => await fetch(url));', 'const results = await Promise.all(urls.map(url => fetch(url)));', 'map cria um array de Promises; Promise.all aguarda todas.'),
      ],
    },
  ],
  advanced: [
    {
      title: 'Módulos e desempenho',
      topics: ['módulos', 'memoização', 'event loop'],
      issues: [
        issue('export default const config = {};', 'const config = {};\nexport default config;', 'Uma declaração const não pode vir diretamente após export default.'),
        issue('const cached = memo.get(key) || compute(key);', 'const cached = memo.has(key) ? memo.get(key) : compute(key);', 'Valores válidos falsy não devem causar novo cálculo.'),
        issue('queueMicrotask(runTask());', 'queueMicrotask(runTask);', 'queueMicrotask recebe a função, não sua execução imediata.'),
        issue('const clone = JSON.parse(JSON.stringify(valueWithDate));', 'const clone = structuredClone(valueWithDate);', 'JSON perde tipos como Date; structuredClone preserva dados compatíveis.'),
      ],
    },
    {
      title: 'Concorrência no navegador',
      topics: ['AbortController', 'Proxy', 'iteradores'],
      issues: [
        issue('const controller = new AbortController();\nfetch(url, controller.signal);', 'const controller = new AbortController();\nfetch(url, { signal: controller.signal });', 'O signal deve estar dentro do objeto de opções.'),
        issue('const proxy = new Proxy(target, { get: key => target[key] });', 'const proxy = new Proxy(target, { get: (object, key) => object[key] });', 'O trap get recebe primeiro o objeto alvo e depois a chave.'),
        issue('const iterator = items[Symbol.iterator];\nconsole.log(iterator.next());', 'const iterator = items[Symbol.iterator]();\nconsole.log(iterator.next());', 'O método iterador precisa ser chamado.'),
        issue('await Promise.race([]);', 'await Promise.race([primaryRequest, timeoutRequest]);', 'Uma corrida vazia nunca é resolvida; ela precisa de Promises participantes.'),
      ],
    },
  ],
}

const htmlCssBlueprints: Record<BugDifficulty, [BugBlueprint, BugBlueprint]> = {
  never: [
    {
      title: 'Cartão de boas-vindas',
      topics: ['HTML', 'texto', 'CSS básico'],
      issues: [
        issue('<h1>Bem-vindo<h1>', '<h1>Bem-vindo</h1>', 'A tag de título precisa ser fechada com /h1.'),
        issue('<p class="intro">Olá</p>\n<style>.introduction { color: gold; }</style>', '<p class="intro">Olá</p>\n<style>.intro { color: gold; }</style>', 'O seletor CSS deve usar o mesmo nome da classe HTML.'),
        issue('<img src="crown.png">', '<img src="crown.png" alt="Coroa dourada">', 'Imagens informativas precisam de texto alternativo.'),
        issue('<a>Entrar na arena</a>', '<a href="/arena">Entrar na arena</a>', 'Um link precisa indicar seu destino com href.'),
      ],
    },
    {
      title: 'Perfil do competidor',
      topics: ['atributos', 'seletores', 'unidades'],
      issues: [
        issue('<div id=profile>Dev</div>', '<div id="profile">Dev</div>', 'Valores de atributos devem estar entre aspas.'),
        issue('<p id="rank">Bronze</p>\n<style>.rank { color: #d4af37; }</style>', '<p id="rank">Bronze</p>\n<style>#rank { color: #d4af37; }</style>', 'IDs são selecionados com #, não com ponto.'),
        issue('<style>.avatar { width: 80; }</style>', '<style>.avatar { width: 80px; }</style>', 'Medidas diferentes de zero precisam de unidade.'),
        issue('<button disabled="false">Jogar</button>', '<button>Jogar</button>', 'A presença do atributo booleano disabled já desabilita o botão.'),
      ],
    },
  ],
  basic: [
    {
      title: 'Painel responsivo',
      topics: ['box model', 'flexbox', 'responsividade'],
      issues: [
        issue('<style>.panel { display: flexbox; }</style>', '<style>.panel { display: flex; }</style>', 'O valor correto para ativar Flexbox é flex.'),
        issue('<style>.panel { padding: 16; }</style>', '<style>.panel { padding: 16px; }</style>', 'Padding precisa de uma unidade.'),
        issue('<style>@media max-width: 600px { .panel { display: block; } }</style>', '<style>@media (max-width: 600px) { .panel { display: block; } }</style>', 'A condição da media query fica entre parênteses.'),
        issue('<style>.panel { width: 100%; padding: 20px; }</style>', '<style>.panel { box-sizing: border-box; width: 100%; padding: 20px; }</style>', 'border-box evita que padding aumente a largura total.'),
      ],
    },
    {
      title: 'Formulário da guilda',
      topics: ['formulários', 'labels', 'estados de foco'],
      issues: [
        issue('<label for="email">Email</label><input id="user-email">', '<label for="email">Email</label><input id="email">', 'O for da label precisa coincidir com o id do campo.'),
        issue('<input type="mail">', '<input type="email">', 'O tipo válido para e-mail é email.'),
        issue('<style>input focus { outline: 2px solid gold; }</style>', '<style>input:focus { outline: 2px solid gold; }</style>', 'O estado de foco usa a pseudoclasse :focus.'),
        issue('<button type="button">Enviar</button>', '<button type="submit">Enviar</button>', 'O botão que envia o formulário precisa do tipo submit.'),
      ],
    },
  ],
  intermediate: [
    {
      title: 'Grade de desafios',
      topics: ['grid', 'aspect-ratio', 'acessibilidade'],
      issues: [
        issue('<style>.grid { display: grid; grid-template-columns: repeat(3 1fr); }</style>', '<style>.grid { display: grid; grid-template-columns: repeat(3, 1fr); }</style>', 'repeat separa quantidade e tamanho com vírgula.'),
        issue('<style>.card { aspect-ratio: 16 / 0; }</style>', '<style>.card { aspect-ratio: 16 / 9; }</style>', 'A proporção não pode ter divisor zero.'),
        issue('<main role="button">Abrir</main>', '<button type="button">Abrir</button>', 'Um botão nativo oferece teclado e semântica sem adaptações extras.'),
        issue('<style>.grid { grid-template-columns: minmax(300px, 1fr); }</style>', '<style>.grid { grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); }</style>', 'A grade responsiva precisa repetir colunas e limitar o mínimo no mobile.'),
      ],
    },
    {
      title: 'Tema e cascata',
      topics: ['custom properties', 'especificidade', 'container queries'],
      issues: [
        issue('<style>:root { --gold #d4af37; }</style>', '<style>:root { --gold: #d4af37; }</style>', 'Custom properties usam dois-pontos antes do valor.'),
        issue('<style>.title { color: var(gold); }</style>', '<style>.title { color: var(--gold); }</style>', 'var recebe o nome completo da custom property.'),
        issue('<style>@container min-width: 500px { .card { display: flex; } }</style>', '<style>@container (min-width: 500px) { .card { display: flex; } }</style>', 'A condição da container query fica entre parênteses.'),
        issue('<style>.card { container: inline-size; }</style>', '<style>.card-list { container-type: inline-size; }</style>', 'O elemento pai deve declarar container-type para seus filhos responderem.'),
      ],
    },
  ],
  advanced: [
    {
      title: 'Sistema visual escalável',
      topics: ['layers', 'tokens', 'seletores modernos'],
      issues: [
        issue('<style>@layer reset, components; @layer component { .btn {} }</style>', '<style>@layer reset, components; @layer components { .btn {} }</style>', 'O nome da camada precisa coincidir com o declarado.'),
        issue('<style>.title { color: color-mix(in srgb, gold 120%, red); }</style>', '<style>.title { color: color-mix(in srgb, gold 80%, red); }</style>', 'A porcentagem de mistura deve permanecer em uma faixa válida.'),
        issue('<style>.card:has .badge { border-color: gold; }</style>', '<style>.card:has(.badge) { border-color: gold; }</style>', ':has recebe o seletor entre parênteses.'),
        issue('<style>@property --angle { syntax: "<angle>"; initial-value: 0; }</style>', '<style>@property --angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }</style>', 'A propriedade tipada precisa declarar inherits e uma unidade compatível.'),
      ],
    },
    {
      title: 'Renderização robusta',
      topics: ['containment', 'animação', 'preferências do usuário'],
      issues: [
        issue('<style>.feed { content-visibility: hidden; }</style>', '<style>.feed { content-visibility: auto; }</style>', 'hidden impede a renderização; auto adia apenas o conteúdo fora da tela.'),
        issue('<style>.card { will-change: all; }</style>', '<style>.card.is-moving { will-change: transform; }</style>', 'will-change deve ser específico e aplicado somente durante a mudança.'),
        issue('<style>@media prefers-reduced-motion { * { animation: none; } }</style>', '<style>@media (prefers-reduced-motion: reduce) { * { animation: none; } }</style>', 'A media feature exige condição e valor.'),
        issue('<style>.hero { contain: strict; position: fixed; }</style>', '<style>.hero-content { contain: layout paint; }</style>', 'Containment estrito no elemento fixo pode quebrar tamanho e posicionamento.'),
      ],
    },
  ],
}

const sqlBlueprints: Record<BugDifficulty, [BugBlueprint, BugBlueprint]> = {
  never: [
    {
      title: 'Consulta dos jogadores',
      topics: ['SELECT', 'FROM', 'WHERE'],
      issues: [
        issue('SELECT name players;', 'SELECT name FROM players;', 'A consulta precisa indicar a tabela com FROM.'),
        issue('SELECT * FROM players WHERE active = true', 'SELECT * FROM players WHERE active = TRUE;', 'A instrução deve usar um booleano SQL e ser finalizada.'),
        issue('SELECT name FROM player;', 'SELECT name FROM players;', 'O nome da tabela precisa coincidir com o esquema.'),
        issue('SELECT name, FROM players;', 'SELECT name FROM players;', 'Não pode haver vírgula após a última coluna.'),
      ],
    },
    {
      title: 'Filtro de pontuação',
      topics: ['comparações', 'strings', 'ordenação'],
      issues: [
        issue('SELECT * FROM scores WHERE points = "10";', 'SELECT * FROM scores WHERE points = 10;', 'Um valor numérico não deve ser tratado como texto.'),
        issue('SELECT * FROM players WHERE rank = gold;', "SELECT * FROM players WHERE rank = 'gold';", 'Valores textuais usam aspas simples.'),
        issue('SELECT name FROM players ORDER name;', 'SELECT name FROM players ORDER BY name;', 'A ordenação usa ORDER BY.'),
        issue('SELECT name FROM players LIMIT = 5;', 'SELECT name FROM players LIMIT 5;', 'LIMIT recebe o número sem operador =.'),
      ],
    },
  ],
  basic: [
    {
      title: 'Resumo da temporada',
      topics: ['agregações', 'GROUP BY', 'JOIN'],
      issues: [
        issue('SELECT team, COUNT(*) FROM players;', 'SELECT team, COUNT(*) FROM players GROUP BY team;', 'Uma coluna não agregada precisa estar no GROUP BY.'),
        issue('SELECT AVG(score) AS average_score FROM matches WHERE AVG(score) > 10;', 'SELECT AVG(score) AS average_score FROM matches HAVING AVG(score) > 10;', 'Filtros sobre agregações pertencem ao HAVING.'),
        issue('SELECT p.name, t.name FROM players p JOIN teams t;', 'SELECT p.name, t.name FROM players p JOIN teams t ON t.id = p.team_id;', 'Um JOIN precisa da condição que relaciona as tabelas.'),
        issue('SELECT COUNT(score) FROM matches;', 'SELECT COUNT(*) FROM matches;', 'COUNT(*) conta linhas mesmo quando score é nulo.'),
      ],
    },
    {
      title: 'Inventário ordenado',
      topics: ['NULL', 'aliases', 'filtros'],
      issues: [
        issue('SELECT * FROM items WHERE owner_id = NULL;', 'SELECT * FROM items WHERE owner_id IS NULL;', 'NULL é testado com IS NULL.'),
        issue('SELECT name item_name FROM items ORDER BY item_name;', 'SELECT name AS item_name FROM items ORDER BY item_name;', 'AS deixa o alias explícito e legível.'),
        issue("SELECT * FROM items WHERE type = 'weapon' OR 'armor';", "SELECT * FROM items WHERE type IN ('weapon', 'armor');", 'Cada alternativa precisa comparar a coluna; IN expressa isso diretamente.'),
        issue('SELECT DISTINCT(category), name FROM items;', 'SELECT DISTINCT category, name FROM items;', 'DISTINCT atua sobre a combinação selecionada e não é uma função.'),
      ],
    },
  ],
  intermediate: [
    {
      title: 'Ranking com janelas',
      topics: ['CTE', 'window functions', 'transações'],
      issues: [
        issue('WITH totals AS SELECT player_id, SUM(score) total FROM matches GROUP BY player_id SELECT * FROM totals;', 'WITH totals AS (SELECT player_id, SUM(score) AS total FROM matches GROUP BY player_id) SELECT * FROM totals;', 'A consulta da CTE fica entre parênteses.'),
        issue('SELECT name, RANK() ORDER BY score DESC FROM players;', 'SELECT name, RANK() OVER (ORDER BY score DESC) FROM players;', 'Funções de janela exigem a cláusula OVER.'),
        issue('BEGIN; UPDATE wallets SET coins = coins - 10; COMMIT; UPDATE wallets SET coins = coins + 10;', 'BEGIN; UPDATE wallets SET coins = coins - 10 WHERE id = 1; UPDATE wallets SET coins = coins + 10 WHERE id = 2; COMMIT;', 'Todas as mudanças relacionadas precisam ocorrer antes do COMMIT e com filtros.'),
        issue('SELECT player_id, score, SUM(score) OVER () FROM matches GROUP BY player_id;', 'SELECT player_id, score, SUM(score) OVER (PARTITION BY player_id) FROM matches;', 'A janela deve particionar por jogador sem GROUP BY incompatível.'),
      ],
    },
    {
      title: 'Consultas previsíveis',
      topics: ['subqueries', 'índices', 'upsert'],
      issues: [
        issue('SELECT * FROM players WHERE id = (SELECT player_id FROM matches);', 'SELECT * FROM players WHERE id IN (SELECT player_id FROM matches);', 'Uma subconsulta com várias linhas precisa de IN.'),
        issue('CREATE INDEX players_email_idx ON players;', 'CREATE INDEX players_email_idx ON players (email);', 'O índice precisa indicar a coluna.'),
        issue("INSERT INTO settings (player_id, theme) VALUES (1, 'dark') ON CONFLICT UPDATE theme = 'dark';", "INSERT INTO settings (player_id, theme) VALUES (1, 'dark') ON CONFLICT (player_id) DO UPDATE SET theme = EXCLUDED.theme;", 'O upsert precisa do alvo do conflito e de DO UPDATE SET.'),
        issue('DELETE FROM sessions;', 'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;', 'Uma limpeza deve limitar as linhas que serão removidas.'),
      ],
    },
  ],
  advanced: [
    {
      title: 'Plano de execução',
      topics: ['EXPLAIN', 'índices parciais', 'locking'],
      issues: [
        issue('EXPLAIN ANALYZE SELECT * FROM events WHERE DATE(created_at) = CURRENT_DATE;', "EXPLAIN ANALYZE SELECT * FROM events WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day';", 'Aplicar função na coluna pode impedir o uso eficiente do índice.'),
        issue('CREATE INDEX active_users_idx ON users (active);', 'CREATE INDEX active_users_idx ON users (id) WHERE active = TRUE;', 'Um índice parcial pode focar somente as linhas consultadas.'),
        issue('SELECT balance FROM wallets WHERE id = 1; UPDATE wallets SET balance = balance - 10 WHERE id = 1;', 'BEGIN; SELECT balance FROM wallets WHERE id = 1 FOR UPDATE; UPDATE wallets SET balance = balance - 10 WHERE id = 1; COMMIT;', 'A linha precisa ser bloqueada dentro da transação antes da atualização concorrente.'),
        issue('VACUUM FULL events;', 'VACUUM (ANALYZE) events;', 'VACUUM FULL bloqueia e reescreve a tabela; manutenção comum deve evitar esse custo.'),
      ],
    },
    {
      title: 'Integridade em escala',
      topics: ['constraints', 'isolamento', 'particionamento'],
      issues: [
        issue('ALTER TABLE wallets ADD CONSTRAINT positive_balance CHECK (balance);', 'ALTER TABLE wallets ADD CONSTRAINT positive_balance CHECK (balance >= 0);', 'CHECK precisa de uma expressão booleana completa.'),
        issue('SET TRANSACTION ISOLATION LEVEL FAST;', 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;', 'FAST não é um nível de isolamento SQL válido.'),
        issue('CREATE TABLE events_2026 PARTITION OF events;', "CREATE TABLE events_2026 PARTITION OF events FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');", 'A partição por faixa precisa declarar seus limites.'),
        issue('GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;', 'GRANT SELECT, INSERT, UPDATE ON app_tables TO app_user;', 'O princípio do menor privilégio evita conceder ALL indiscriminadamente.'),
      ],
    },
  ],
}

const blueprints: Record<
  BugLanguage,
  Record<BugDifficulty, [BugBlueprint, BugBlueprint]>
> = {
  python: pythonBlueprints,
  javascript: javascriptBlueprints,
  'html-css': htmlCssBlueprints,
  sql: sqlBlueprints,
}

function createDefinition(
  language: BugLanguage,
  difficulty: BugDifficulty,
  codeSize: BugCodeSize,
  variant: number,
): BugDefinition {
  const blueprint = blueprints[language][difficulty][variant]
  const bugCount = bugCountBySize[codeSize]
  const selectedIssues = blueprint.issues.slice(0, bugCount)
  const languageLabel = languageLabels[language]
  const difficultyLabel = difficultyLabels[difficulty]
  const codeSizeLabel = sizeLabels[codeSize]

  return {
    id: `bug-v1-${language}-${difficulty}-${codeSize}-${variant + 1}`,
    title: `${blueprint.title} · código ${codeSizeLabel}`,
    language,
    difficulty,
    codeSize,
    description: `Analise este exercício de ${languageLabel} no nível ${difficultyLabel} e corrija ${bugCount} falhas relacionadas a ${blueprint.topics.join(', ')}.`,
    brokenCode: selectedIssues.map((item) => item.broken).join('\n\n'),
    bugCount,
    topics: blueprint.topics,
    expectedFix: selectedIssues.map((item) => item.fixed).join('\n\n'),
    hint: `Revise ${blueprint.topics.join(', ')} e compare o papel de cada linha antes de editar.`,
    explanation: `As ${bugCount} correções restauram sintaxe, tipos e comportamento esperado sem reescrever a solução inteira.`,
    bugExplanations: selectedIssues.map((item) => item.explanation),
    tags: [language, difficulty, codeSize, ...blueprint.topics],
  }
}

export function buildBugCatalogAdditions(existingBugs: Bug[]): BugDefinition[] {
  const additions: BugDefinition[] = []

  languages.forEach((language) => {
    difficulties.forEach((difficulty) => {
      sizes.forEach((codeSize) => {
        const existingCount = existingBugs.filter(
          (bug) =>
            bug.language === language &&
            bug.difficulty === difficulty &&
            bug.codeSize === codeSize,
        ).length
        const needed = Math.max(0, 2 - existingCount)

        for (let variant = 0; variant < needed; variant += 1) {
          additions.push(createDefinition(language, difficulty, codeSize, variant))
        }
      })
    })
  })

  return additions
}
