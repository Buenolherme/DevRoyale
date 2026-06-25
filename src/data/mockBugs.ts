import type { Bug, BugCodeSize, BugCount, BugDifficulty } from '@/types'
import {
  buildBugCatalogAdditions,
  type BugDefinition,
} from './mockBugsExpansion'

const baseXpByDifficulty: Record<BugDifficulty, number> = {
  never: 10,
  basic: 20,
  intermediate: 35,
  advanced: 50,
}

const sizeBonus: Record<BugCodeSize, number> = {
  small: 0,
  medium: 5,
  large: 10,
}

const bugCountRange: Record<BugCodeSize, [minimum: BugCount, maximum: BugCount]> = {
  small: [1, 3],
  medium: [2, 4],
  large: [3, 5],
}

function createBug(definition: BugDefinition): Bug {
  const [minimum, maximum] = bugCountRange[definition.codeSize]

  if (definition.bugCount < minimum || definition.bugCount > maximum) {
    throw new Error(
      `O desafio ${definition.id} precisa ter entre ${minimum} e ${maximum} bugs para o tamanho ${definition.codeSize}.`,
    )
  }

  const baseXp = baseXpByDifficulty[definition.difficulty]
  const multipleBugBonus = definition.bugCount >= 4 ? 10 : 0

  return {
    ...definition,
    baseXp,
    xp: baseXp + sizeBonus[definition.codeSize] + multipleBugBonus,
  }
}

const originalMockBugs: Bug[] = [
  // Python — Nunca programei
  createBug({
    id: 'bug-python-never-print',
    title: 'Mensagem invisível',
    language: 'python',
    difficulty: 'never',
    codeSize: 'small',
    description: 'O programa deveria mostrar uma mensagem, mas o texto não foi definido como string.',
    brokenCode: 'print(Hello, World!)',
    bugCount: 1,
    topics: ['print', 'strings'],
    expectedFix: 'print("Hello, World!")',
    hint: 'Textos precisam ficar entre aspas.',
    explanation: 'O texto precisa ser delimitado para que o Python não tente tratá-lo como variável.',
    bugExplanations: ['Hello, World! estava sem aspas e não era reconhecido como string.'],
    tags: ['sintaxe', 'primeiros-passos', 'texto'],
  }),
  createBug({
    id: 'bug-python-never-greeting',
    title: 'Saudação interrompida',
    language: 'python',
    difficulty: 'never',
    codeSize: 'medium',
    description: 'O programa deveria perguntar o nome e exibir uma saudação completa.',
    brokenCode: 'nome = input("Qual é o seu nome?"\nprint("Olá, " + nome',
    bugCount: 2,
    topics: ['input', 'strings', 'parênteses'],
    expectedFix: 'nome = input("Qual é o seu nome?")\nprint("Olá, " + nome)',
    hint: 'Confira o fechamento dos parênteses nas duas linhas.',
    explanation: 'Cada chamada de função precisa terminar com seu próprio parêntese.',
    bugExplanations: [
      'A chamada de input não fechava o parêntese.',
      'A chamada de print também estava sem o parêntese final.',
    ],
    tags: ['sintaxe', 'entrada', 'saída'],
  }),

  // Python — Básico
  createBug({
    id: 'bug-python-basic-counter',
    title: 'Contador travado',
    language: 'python',
    difficulty: 'basic',
    codeSize: 'small',
    description: 'O laço deveria avançar até 3, mas a variável nunca muda.',
    brokenCode: 'contador = 0\nwhile contador < 3:\n    print(contador)',
    bugCount: 1,
    topics: ['while', 'variáveis', 'incremento'],
    expectedFix: 'contador = 0\nwhile contador < 3:\n    print(contador)\n    contador += 1',
    hint: 'Atualize o contador dentro do laço.',
    explanation: 'Sem incrementar contador, a condição continua verdadeira indefinidamente.',
    bugExplanations: ['Faltava somar 1 ao contador em cada repetição.'],
    tags: ['loop', 'contador', 'lógica'],
  }),
  createBug({
    id: 'bug-python-basic-even-sum',
    title: 'Soma dos pares quebrada',
    language: 'python',
    difficulty: 'basic',
    codeSize: 'medium',
    description: 'O código deveria somar apenas os números pares da lista.',
    brokenCode:
      'numeros = [1, 2, 3, 4, 5, 6]\nsoma = 0\nfor numero in numeros\n    if numero % 2 = 0:\n        soma = numero\nprint(soma)',
    bugCount: 3,
    topics: ['for', 'condicionais', 'operadores'],
    expectedFix:
      'numeros = [1, 2, 3, 4, 5, 6]\nsoma = 0\nfor numero in numeros:\n    if numero % 2 == 0:\n        soma += numero\nprint(soma)',
    hint: 'Revise os dois-pontos, a comparação e a forma de acumular valores.',
    explanation: 'O laço e a condição precisam de sintaxe correta, e a soma deve acumular cada número par.',
    bugExplanations: [
      'O for estava sem dois-pontos.',
      'A condição usava atribuição em vez de comparação.',
      'A soma substituía o total em vez de acumulá-lo.',
    ],
    tags: ['for', 'if', 'acumulador'],
  }),

  // Python — Intermediário
  createBug({
    id: 'bug-python-intermediate-average',
    title: 'Média incompleta',
    language: 'python',
    difficulty: 'intermediate',
    codeSize: 'small',
    description: 'A função soma as notas, mas não calcula a média.',
    brokenCode: 'def media(notas):\n    return sum(notas)',
    bugCount: 1,
    topics: ['funções', 'listas', 'cálculo'],
    expectedFix: 'def media(notas):\n    return sum(notas) / len(notas)',
    hint: 'Média é soma dividida pela quantidade.',
    explanation: 'len informa quantos valores participam da média.',
    bugExplanations: ['O retorno não dividia a soma pela quantidade de notas.'],
    tags: ['função', 'lista', 'matemática'],
  }),
  createBug({
    id: 'bug-python-intermediate-inventory',
    title: 'Estoque sem total',
    language: 'python',
    difficulty: 'intermediate',
    codeSize: 'medium',
    description: 'A função deveria retornar o valor total dos produtos ativos em estoque.',
    brokenCode:
      'def total_estoque(produtos):\n    total = 0\n    for produto in produtos:\n        if produto["ativo"]:\n            total += produto["preco"]\n    print(total)',
    bugCount: 2,
    topics: ['dicionários', 'funções', 'acumuladores'],
    expectedFix:
      'def total_estoque(produtos):\n    total = 0\n    for produto in produtos:\n        if produto["ativo"]:\n            total += produto["preco"] * produto["quantidade"]\n    return total',
    hint: 'Considere a quantidade de cada produto e o valor que a função deve devolver.',
    explanation: 'O total depende de preço e quantidade, e funções reutilizáveis devem retornar o resultado.',
    bugExplanations: [
      'O cálculo ignorava a quantidade disponível.',
      'A função imprimia o total em vez de retorná-lo.',
    ],
    tags: ['dicionário', 'return', 'estoque'],
  }),

  // Python — Avançado
  createBug({
    id: 'bug-python-advanced-filter',
    title: 'Filtro invertido',
    language: 'python',
    difficulty: 'advanced',
    codeSize: 'small',
    description: 'A compreensão deveria retornar somente usuários ativos.',
    brokenCode:
      'def usuarios_ativos(usuarios):\n    return [usuario for usuario in usuarios if not usuario["ativo"]]',
    bugCount: 1,
    topics: ['list comprehension', 'booleanos'],
    expectedFix:
      'def usuarios_ativos(usuarios):\n    return [usuario for usuario in usuarios if usuario["ativo"]]',
    hint: 'O operador not inverte o valor booleano.',
    explanation: 'Remover o not preserva apenas registros cujo campo ativo é verdadeiro.',
    bugExplanations: ['O filtro selecionava usuários inativos por causa do operador not.'],
    tags: ['filtro', 'comprehension', 'boolean'],
  }),
  createBug({
    id: 'bug-python-advanced-orders',
    title: 'Resumo de pedidos corrompido',
    language: 'python',
    difficulty: 'advanced',
    codeSize: 'large',
    description: 'Agrupe pedidos válidos por cliente e ordene os maiores totais primeiro.',
    brokenCode:
      'def resumo_pedidos(pedidos):\n    totais = []\n    for pedido in pedidos:\n        cliente = pedido["cliente"]\n        if cliente in totais:\n            totais[cliente] = 0\n        if pedido["status"] == "cancelado":\n            totais[cliente] = pedido["valor"]\n    return sorted(totais.items(), key=lambda item: item[1])',
    bugCount: 5,
    topics: ['dicionários', 'agregação', 'ordenação'],
    expectedFix:
      'def resumo_pedidos(pedidos):\n    totais = {}\n    for pedido in pedidos:\n        cliente = pedido["cliente"]\n        if cliente not in totais:\n            totais[cliente] = 0\n        if pedido["status"] != "cancelado":\n            totais[cliente] += pedido["valor"]\n    return sorted(totais.items(), key=lambda item: item[1], reverse=True)',
    hint: 'Revise a coleção inicial, a criação da chave, o status, o acumulador e a ordenação.',
    explanation: 'A rotina exige um dicionário acumulador, exclusão de cancelados e ordenação decrescente.',
    bugExplanations: [
      'totais foi iniciado como lista em vez de dicionário.',
      'A chave era inicializada quando já existia, e não quando era nova.',
      'Pedidos cancelados eram incluídos.',
      'O valor anterior era substituído em vez de acumulado.',
      'A ordenação deixava os menores totais primeiro.',
    ],
    tags: ['agregação', 'ordenar', 'dados'],
  }),

  // JavaScript — Nunca programei
  createBug({
    id: 'bug-javascript-never-log',
    title: 'Console silencioso',
    language: 'javascript',
    difficulty: 'never',
    codeSize: 'small',
    description: 'A mensagem deveria aparecer no console como texto.',
    brokenCode: 'console.log(Hello);',
    bugCount: 1,
    topics: ['console', 'strings'],
    expectedFix: 'console.log("Hello");',
    hint: 'Coloque o texto entre aspas.',
    explanation: 'JavaScript interpreta palavras sem aspas como nomes de variáveis.',
    bugExplanations: ['Hello precisava ser uma string.'],
    tags: ['console', 'texto', 'sintaxe'],
  }),
  createBug({
    id: 'bug-javascript-never-greeting',
    title: 'Boas-vindas desmontadas',
    language: 'javascript',
    difficulty: 'never',
    codeSize: 'medium',
    description: 'Duas mensagens simples deveriam ser exibidas corretamente.',
    brokenCode: 'const nome = "Roy";\nconsole.log("Olá, " nome);\nalert(Bem-vindo);',
    bugCount: 2,
    topics: ['strings', 'concatenação', 'alert'],
    expectedFix: 'const nome = "Roy";\nconsole.log("Olá, " + nome);\nalert("Bem-vindo");',
    hint: 'Uma mensagem precisa ser concatenada e a outra precisa de aspas.',
    explanation: 'Textos literais usam aspas e valores podem ser unidos com +.',
    bugExplanations: [
      'Faltava o operador + entre a string e nome.',
      'Bem-vindo estava sem aspas no alert.',
    ],
    tags: ['concatenação', 'alerta', 'string'],
  }),

  // JavaScript — Básico
  createBug({
    id: 'bug-javascript-basic-return',
    title: 'Dobro perdido',
    language: 'javascript',
    difficulty: 'basic',
    codeSize: 'small',
    description: 'A função calcula o dobro, mas não devolve o resultado.',
    brokenCode: 'function dobrar(numero) {\n  numero * 2;\n}',
    bugCount: 1,
    topics: ['funções', 'return'],
    expectedFix: 'function dobrar(numero) {\n  return numero * 2;\n}',
    hint: 'Use return para devolver o valor calculado.',
    explanation: 'Sem return, a função devolve undefined.',
    bugExplanations: ['A expressão era calculada, mas não retornada.'],
    tags: ['função', 'retorno', 'número'],
  }),
  createBug({
    id: 'bug-javascript-basic-score',
    title: 'Placar impossível',
    language: 'javascript',
    difficulty: 'basic',
    codeSize: 'medium',
    description: 'O laço deveria somar corretamente todos os pontos.',
    brokenCode:
      'const pontos = ["10", 20, 30];\nlet total;\nfor (let i = 0; i <= pontos.length; i++) {\n  total += pontos[i];\n}\nconsole.log(total);',
    bugCount: 3,
    topics: ['arrays', 'loops', 'tipos'],
    expectedFix:
      'const pontos = [10, 20, 30];\nlet total = 0;\nfor (let i = 0; i < pontos.length; i++) {\n  total += pontos[i];\n}\nconsole.log(total);',
    hint: 'Revise o tipo do primeiro item, o valor inicial e o limite do laço.',
    explanation: 'Uma soma numérica exige números, acumulador inicial e índices válidos.',
    bugExplanations: [
      'O primeiro ponto era string.',
      'total começava como undefined.',
      'O laço tentava acessar uma posição além do array.',
    ],
    tags: ['array', 'for', 'acumulador'],
  }),

  // JavaScript — Intermediário
  createBug({
    id: 'bug-javascript-intermediate-length',
    title: 'Último item fantasma',
    language: 'javascript',
    difficulty: 'intermediate',
    codeSize: 'small',
    description: 'O laço acessa um índice que não existe no array.',
    brokenCode:
      'const itens = [1, 2, 3];\nfor (let i = 0; i <= itens.length; i++) {\n  console.log(itens[i]);\n}',
    bugCount: 1,
    topics: ['arrays', 'índices', 'for'],
    expectedFix:
      'const itens = [1, 2, 3];\nfor (let i = 0; i < itens.length; i++) {\n  console.log(itens[i]);\n}',
    hint: 'O último índice é length - 1.',
    explanation: 'Usar < evita acessar a posição igual ao tamanho do array.',
    bugExplanations: ['A condição do laço permitia um índice inexistente.'],
    tags: ['off-by-one', 'array', 'loop'],
  }),
  createBug({
    id: 'bug-javascript-intermediate-users',
    title: 'Lista de ativos quebrada',
    language: 'javascript',
    difficulty: 'intermediate',
    codeSize: 'medium',
    description: 'A função deveria filtrar usuários ativos e unir seus nomes.',
    brokenCode:
      'function nomesAtivos(usuarios) {\n  const ativos = usuarios.filte(usuario => usuario.ativo = true);\n  return ativos.map(usuario => usuario.nome).join;\n}',
    bugCount: 3,
    topics: ['filter', 'map', 'join'],
    expectedFix:
      'function nomesAtivos(usuarios) {\n  const ativos = usuarios.filter(usuario => usuario.ativo === true);\n  return ativos.map(usuario => usuario.nome).join(", ");\n}',
    hint: 'Confira o nome do método, o operador da condição e a chamada de join.',
    explanation: 'A cadeia depende de três métodos corretos e de uma comparação sem efeitos colaterais.',
    bugExplanations: [
      'filter estava escrito incorretamente.',
      'A condição atribuía true em vez de comparar.',
      'join não era executado como função.',
    ],
    tags: ['métodos-array', 'comparação', 'transformação'],
  }),

  // JavaScript — Avançado
  createBug({
    id: 'bug-javascript-advanced-cart',
    title: 'Total do carrinho quebrado',
    language: 'javascript',
    difficulty: 'advanced',
    codeSize: 'small',
    description: 'O carrinho deveria considerar preço e quantidade.',
    brokenCode:
      'function totalCarrinho(itens) {\n  return itens.reduce((total, item) => total + item.preco, 0);\n}',
    bugCount: 1,
    topics: ['reduce', 'objetos'],
    expectedFix:
      'function totalCarrinho(itens) {\n  return itens.reduce((total, item) => total + item.preco * item.quantidade, 0);\n}',
    hint: 'Cada item tem preço e quantidade.',
    explanation: 'O subtotal de cada item é preço multiplicado pela quantidade.',
    bugExplanations: ['O reduce ignorava a quantidade de cada produto.'],
    tags: ['reduce', 'carrinho', 'cálculo'],
  }),
  createBug({
    id: 'bug-javascript-advanced-request',
    title: 'Requisição fora de sincronia',
    language: 'javascript',
    difficulty: 'advanced',
    codeSize: 'large',
    description: 'Carregue usuários, valide a resposta e ordene os nomes corretamente.',
    brokenCode:
      'async function carregarUsuarios() {\n  const resposta = fetch("/api/usuarios");\n  if (resposta.ok = false) throw new Error("Falha");\n  const dados = resposta.json;\n  return dados.users.sort((a, b) => a.nome - b.nome);\n}',
    bugCount: 4,
    topics: ['async/await', 'fetch', 'ordenação'],
    expectedFix:
      'async function carregarUsuarios() {\n  const resposta = await fetch("/api/usuarios");\n  if (!resposta.ok) throw new Error("Falha");\n  const dados = await resposta.json();\n  return dados.users.sort((a, b) => a.nome.localeCompare(b.nome));\n}',
    hint: 'Há duas Promises, uma validação e uma comparação de texto para revisar.',
    explanation: 'Fluxos assíncronos precisam aguardar respostas e strings exigem um comparador adequado.',
    bugExplanations: [
      'fetch não era aguardado.',
      'A validação atribuía false ao campo ok.',
      'json não era chamado nem aguardado.',
      'A ordenação tentava subtrair strings.',
    ],
    tags: ['async', 'api', 'promise'],
  }),

  // HTML/CSS — Nunca programei
  createBug({
    id: 'bug-html-css-never-title',
    title: 'Título sem fechamento',
    language: 'html-css',
    difficulty: 'never',
    codeSize: 'small',
    description: 'O título principal foi aberto, mas não foi fechado.',
    brokenCode: '<h1>Hello, World!',
    bugCount: 1,
    topics: ['HTML', 'tags'],
    expectedFix: '<h1>Hello, World!</h1>',
    hint: 'Toda tag aberta precisa ser fechada.',
    explanation: 'A tag </h1> encerra o título principal.',
    bugExplanations: ['Faltava a tag de fechamento do h1.'],
    tags: ['html', 'tag', 'estrutura'],
  }),
  createBug({
    id: 'bug-html-css-never-profile',
    title: 'Perfil incompleto',
    language: 'html-css',
    difficulty: 'never',
    codeSize: 'medium',
    description: 'A imagem precisa ser acessível e o botão deve fechar corretamente.',
    brokenCode: '<img src="avatar.png">\n<button class="acao">Salvar<button>',
    bugCount: 2,
    topics: ['imagens', 'botões', 'acessibilidade'],
    expectedFix: '<img src="avatar.png" alt="Avatar do usuário">\n<button class="acao">Salvar</button>',
    hint: 'Revise o texto alternativo da imagem e o fechamento do botão.',
    explanation: 'Imagens informativas precisam de alt e elementos devem usar a tag de fechamento correta.',
    bugExplanations: [
      'A imagem não tinha texto alternativo.',
      'O botão terminava com outra tag de abertura.',
    ],
    tags: ['acessibilidade', 'imagem', 'button'],
  }),

  // HTML/CSS — Básico
  createBug({
    id: 'bug-html-css-basic-button',
    title: 'Botão sem classe',
    language: 'html-css',
    difficulty: 'basic',
    codeSize: 'small',
    description: 'O CSS existe, mas o botão não recebe a classe esperada.',
    brokenCode:
      '<button>Entrar</button>\n\n<style>\n  .battle-button {\n    color: white;\n  }\n</style>',
    bugCount: 1,
    topics: ['classes', 'seletores'],
    expectedFix:
      '<button class="battle-button">Entrar</button>\n\n<style>\n  .battle-button {\n    color: white;\n  }\n</style>',
    hint: 'A classe no HTML deve ter o mesmo nome do seletor CSS.',
    explanation: 'class conecta o elemento à regra de estilo correspondente.',
    bugExplanations: ['O botão não possuía a classe battle-button.'],
    tags: ['classe', 'css', 'button'],
  }),
  createBug({
    id: 'bug-html-css-basic-card',
    title: 'Card desalinhado',
    language: 'html-css',
    difficulty: 'basic',
    codeSize: 'medium',
    description: 'O card deveria ter estrutura válida, fundo, espaçamento e descrição branca.',
    brokenCode:
      '<div class="card">\n  <h2>Scout</h3>\n  <p class="descricao">Pronto</p>\n</div>\n\n<style>\n  .card { backgound: #222; padding 16px; }\n  .description { color: white; }\n</style>',
    bugCount: 4,
    topics: ['HTML semântico', 'propriedades CSS', 'seletores'],
    expectedFix:
      '<div class="card">\n  <h2>Scout</h2>\n  <p class="descricao">Pronto</p>\n</div>\n\n<style>\n  .card { background: #222; padding: 16px; }\n  .descricao { color: white; }\n</style>',
    hint: 'Há um fechamento, dois nomes CSS e uma pontuação para corrigir.',
    explanation: 'Estrutura HTML e seletores CSS precisam concordar exatamente.',
    bugExplanations: [
      'O h2 era fechado como h3.',
      'background estava escrito incorretamente.',
      'A propriedade padding estava sem dois-pontos.',
      'O seletor não correspondia à classe descricao.',
    ],
    tags: ['card', 'css', 'sintaxe'],
  }),

  // HTML/CSS — Intermediário
  createBug({
    id: 'bug-html-css-intermediate-color',
    title: 'Cor ignorada',
    language: 'html-css',
    difficulty: 'intermediate',
    codeSize: 'small',
    description: 'A propriedade de cor do texto foi escrita com nome inválido.',
    brokenCode: '<p class="alerta">Cuidado</p>\n<style>.alerta { text-color: red; }</style>',
    bugCount: 1,
    topics: ['propriedades CSS', 'cores'],
    expectedFix: '<p class="alerta">Cuidado</p>\n<style>.alerta { color: red; }</style>',
    hint: 'A propriedade correta para texto é color.',
    explanation: 'CSS usa color para alterar a cor do conteúdo textual.',
    bugExplanations: ['text-color não é uma propriedade CSS válida.'],
    tags: ['color', 'propriedade', 'texto'],
  }),
  createBug({
    id: 'bug-html-css-intermediate-flex',
    title: 'Barra flexível rígida',
    language: 'html-css',
    difficulty: 'intermediate',
    codeSize: 'medium',
    description: 'A barra deveria usar Flexbox, espaçamento e quebra de linha.',
    brokenCode:
      '<nav class="menu"><a href="#">Início</a><a href="#">Arena</a></nav>\n<style>\n  .menu {\n    display: flexbox;\n    gap = 16px;\n    flex-wrap: no-wrap;\n  }\n</style>',
    bugCount: 3,
    topics: ['Flexbox', 'responsividade'],
    expectedFix:
      '<nav class="menu"><a href="#">Início</a><a href="#">Arena</a></nav>\n<style>\n  .menu {\n    display: flex;\n    gap: 16px;\n    flex-wrap: wrap;\n  }\n</style>',
    hint: 'Revise o valor de display, a pontuação de gap e o valor de flex-wrap.',
    explanation: 'Flexbox usa display flex e propriedades CSS seguem a forma nome: valor.',
    bugExplanations: [
      'flexbox não é valor válido para display.',
      'gap usava = em vez de dois-pontos.',
      'no-wrap deveria ser wrap para permitir quebra.',
    ],
    tags: ['flexbox', 'menu', 'responsive'],
  }),

  // HTML/CSS — Avançado
  createBug({
    id: 'bug-html-css-advanced-grid',
    title: 'Grade responsiva quebrada',
    language: 'html-css',
    difficulty: 'advanced',
    codeSize: 'medium',
    description: 'A grade deve ter três colunas e virar uma coluna no mobile.',
    brokenCode:
      '<section class="cards"><article>A</article><article>B</article></section>\n<style>\n  .cards { display: block; grid-template-columns: repeat(3, 1fr; }\n  @media (max-width: 600px) { .cards { grid-template-columns: repeat(3, 1fr); } }\n</style>',
    bugCount: 3,
    topics: ['CSS Grid', 'media queries'],
    expectedFix:
      '<section class="cards"><article>A</article><article>B</article></section>\n<style>\n  .cards { display: grid; grid-template-columns: repeat(3, 1fr); }\n  @media (max-width: 600px) { .cards { grid-template-columns: 1fr; } }\n</style>',
    hint: 'Ative Grid, feche repeat e ajuste a coluna do mobile.',
    explanation: 'O container precisa ativar Grid, ter sintaxe válida e reduzir colunas em telas pequenas.',
    bugExplanations: [
      'display block não ativava o Grid.',
      'A função repeat estava sem parêntese final.',
      'O breakpoint mantinha três colunas no mobile.',
    ],
    tags: ['grid', 'media-query', 'layout'],
  }),
  createBug({
    id: 'bug-html-css-advanced-navigation',
    title: 'Navegação inacessível',
    language: 'html-css',
    difficulty: 'advanced',
    codeSize: 'large',
    description: 'Corrija alinhamento, espaçamento, foco e layout mobile do menu.',
    brokenCode:
      '<nav class="menu"><a href="#inicio">Início</a><a href="#arena">Arena</a></nav>\n<style>\n  .menu { display: grid; align-item: center; gap: 16; }\n  .menu a:focus { outline: none; }\n  @media (max-width: 600px) { .menu { grid-template-columns: repeat(2, 1fr); } }\n</style>',
    bugCount: 4,
    topics: ['acessibilidade', 'CSS Grid', 'responsividade'],
    expectedFix:
      '<nav class="menu"><a href="#inicio">Início</a><a href="#arena">Arena</a></nav>\n<style>\n  .menu { display: grid; align-items: center; gap: 16px; }\n  .menu a:focus { outline: 2px solid gold; }\n  @media (max-width: 600px) { .menu { grid-template-columns: 1fr; } }\n</style>',
    hint: 'Há uma propriedade, uma unidade, um foco e um layout mobile incorretos.',
    explanation: 'O menu precisa de CSS válido, foco visível e adaptação real para telas estreitas.',
    bugExplanations: [
      'align-item deveria ser align-items.',
      'O gap estava sem unidade.',
      'O foco removia toda indicação visual.',
      'O mobile continuava com duas colunas.',
    ],
    tags: ['a11y', 'foco', 'responsive'],
  }),

  // SQL — Nunca programei
  createBug({
    id: 'bug-sql-never-select',
    title: 'Consulta sem texto',
    language: 'sql',
    difficulty: 'never',
    codeSize: 'small',
    description: 'A consulta deveria retornar uma mensagem simples.',
    brokenCode: 'SELECT Hello;',
    bugCount: 1,
    topics: ['SELECT', 'strings'],
    expectedFix: "SELECT 'Hello';",
    hint: 'Textos literais em SQL ficam entre aspas.',
    explanation: 'Sem aspas, o banco procura uma coluna chamada Hello.',
    bugExplanations: ['O texto Hello não estava delimitado como string.'],
    tags: ['select', 'literal', 'sintaxe'],
  }),
  createBug({
    id: 'bug-sql-never-users',
    title: 'Tabela desaparecida',
    language: 'sql',
    difficulty: 'never',
    codeSize: 'medium',
    description: 'A consulta deveria selecionar nome e idade da tabela de usuários.',
    brokenCode: 'SELECT nome idade\nFORM usuarios;',
    bugCount: 2,
    topics: ['SELECT', 'FROM', 'colunas'],
    expectedFix: 'SELECT nome, idade\nFROM usuarios;',
    hint: 'Separe as colunas e confira a palavra FROM.',
    explanation: 'Colunas são separadas por vírgula e FROM indica a tabela de origem.',
    bugExplanations: [
      'Faltava uma vírgula entre nome e idade.',
      'FROM estava escrito como FORM.',
    ],
    tags: ['colunas', 'from', 'consulta'],
  }),

  // SQL — Básico
  createBug({
    id: 'bug-sql-basic-where',
    title: 'Usuários demais',
    language: 'sql',
    difficulty: 'basic',
    codeSize: 'small',
    description: 'A consulta deveria listar somente usuários ativos.',
    brokenCode: 'SELECT nome\nFROM usuarios;',
    bugCount: 1,
    topics: ['WHERE', 'filtros'],
    expectedFix: 'SELECT nome\nFROM usuarios\nWHERE ativo = 1;',
    hint: 'Use WHERE para filtrar registros.',
    explanation: 'WHERE limita o resultado aos registros que atendem à condição.',
    bugExplanations: ['Faltava o filtro para usuários ativos.'],
    tags: ['where', 'filtro', 'usuários'],
  }),
  createBug({
    id: 'bug-sql-basic-products',
    title: 'Vitrine sem filtro',
    language: 'sql',
    difficulty: 'basic',
    codeSize: 'medium',
    description: 'Liste produtos de tecnologia com preço mínimo, do maior para o menor.',
    brokenCode:
      'SELECT nome, preco\nFROM produtos\nWHERE preco => 100 AND categoria = tecnologia\nORDER preco DESC;',
    bugCount: 3,
    topics: ['WHERE', 'operadores', 'ORDER BY'],
    expectedFix:
      "SELECT nome, preco\nFROM produtos\nWHERE preco >= 100 AND categoria = 'tecnologia'\nORDER BY preco DESC;",
    hint: 'Revise o operador, o texto da categoria e a cláusula de ordenação.',
    explanation: 'A consulta combina comparação válida, string delimitada e ORDER BY.',
    bugExplanations: [
      'O operador maior ou igual estava invertido.',
      'A categoria textual estava sem aspas.',
      'A ordenação estava sem a palavra BY.',
    ],
    tags: ['filtro', 'ordenação', 'produtos'],
  }),

  // SQL — Intermediário
  createBug({
    id: 'bug-sql-intermediate-order',
    title: 'Ranking fora de ordem',
    language: 'sql',
    difficulty: 'intermediate',
    codeSize: 'small',
    description: 'Os jogadores deveriam aparecer do maior XP para o menor.',
    brokenCode: 'SELECT nome, xp\nFROM jogadores\nORDER BY xp ASC;',
    bugCount: 1,
    topics: ['ORDER BY', 'ranking'],
    expectedFix: 'SELECT nome, xp\nFROM jogadores\nORDER BY xp DESC;',
    hint: 'DESC ordena do maior para o menor.',
    explanation: 'ASC coloca os menores valores primeiro; DESC inverte a ordem.',
    bugExplanations: ['A direção da ordenação estava invertida.'],
    tags: ['ranking', 'order-by', 'xp'],
  }),
  createBug({
    id: 'bug-sql-intermediate-summary',
    title: 'Resumo por categoria quebrado',
    language: 'sql',
    difficulty: 'intermediate',
    codeSize: 'medium',
    description: 'Agrupe produtos por categoria e mostre as categorias mais valiosas primeiro.',
    brokenCode:
      'SELECT categoria, COUNT(id) AS total, SUM(preco) AS valor\nFROM produtos\nWHERE ativo = 1\nGROUP BY id\nORDER BY valor ASC;',
    bugCount: 2,
    topics: ['GROUP BY', 'agregação', 'ORDER BY'],
    expectedFix:
      'SELECT categoria, COUNT(id) AS total, SUM(preco) AS valor\nFROM produtos\nWHERE ativo = 1\nGROUP BY categoria\nORDER BY valor DESC;',
    hint: 'O agrupamento e a direção da ordenação precisam acompanhar o objetivo.',
    explanation: 'O resumo agrupa pela categoria e apresenta os maiores valores primeiro.',
    bugExplanations: [
      'A consulta agrupava por produto, não por categoria.',
      'A ordenação colocava os menores valores primeiro.',
    ],
    tags: ['group-by', 'sum', 'relatório'],
  }),

  // SQL — Avançado
  createBug({
    id: 'bug-sql-advanced-customers',
    title: 'Clientes sumindo do relatório',
    language: 'sql',
    difficulty: 'advanced',
    codeSize: 'large',
    description: 'Liste todos os clientes, incluindo quem não possui pedidos pagos.',
    brokenCode:
      "SELECT c.nome, COUNT(p.id) AS total_pedidos, SUM(p.valor) AS valor_total\nFROM clientes c\nLEFT JOIN pedidos p ON c.id = p.id\nWHERE p.status = 'pago'\nGROUP BY c.nome, p.id\nORDER BY valor_total ASC;",
    bugCount: 4,
    topics: ['LEFT JOIN', 'agregação', 'relatórios'],
    expectedFix:
      "SELECT c.nome, COUNT(p.id) AS total_pedidos, SUM(p.valor) AS valor_total\nFROM clientes c\nLEFT JOIN pedidos p ON c.id = p.cliente_id AND p.status = 'pago'\nGROUP BY c.nome\nORDER BY valor_total DESC;",
    hint: 'Revise a chave do JOIN, a posição do filtro, o agrupamento e a ordenação.',
    explanation: 'Condições sobre a tabela opcional ficam no JOIN para preservar clientes sem pedidos.',
    bugExplanations: [
      'O JOIN relacionava o cliente ao id do pedido.',
      'O WHERE eliminava clientes sem pedidos pagos.',
      'O agrupamento por pedido fragmentava cada cliente.',
      'O relatório ordenava os menores totais primeiro.',
    ],
    tags: ['left-join', 'group-by', 'clientes'],
  }),
  createBug({
    id: 'bug-sql-advanced-analysis',
    title: 'Análise de compradores corrompida',
    language: 'sql',
    difficulty: 'advanced',
    codeSize: 'large',
    description: 'Calcule média e quantidade de pedidos pagos por usuário, do mais ativo para o menos ativo.',
    brokenCode:
      "SELECT u.nome, AVG(p.valor * 0) AS media, COUNT(p.id) AS pedidos\nFROM usuarios u\nINNER JOIN pedidos p ON p.id = u.id\nWHERE p.status != 'pago'\nGROUP BY p.id\nHAVING AVG(p.valor) >= 100\nORDER BY pedidos ASC;",
    bugCount: 5,
    topics: ['INNER JOIN', 'AVG', 'HAVING', 'GROUP BY'],
    expectedFix:
      "SELECT u.nome, AVG(p.valor) AS media, COUNT(p.id) AS pedidos\nFROM usuarios u\nINNER JOIN pedidos p ON p.usuario_id = u.id\nWHERE p.status = 'pago'\nGROUP BY u.id, u.nome\nHAVING AVG(p.valor) >= 100\nORDER BY pedidos DESC;",
    hint: 'Há erros no cálculo, relacionamento, filtro, agrupamento e ordenação.',
    explanation: 'A análise depende de associar pedidos ao usuário correto e agregar somente compras pagas.',
    bugExplanations: [
      'A média zerava todos os valores.',
      'O JOIN usava o id do pedido em vez de usuario_id.',
      'O filtro selecionava pedidos não pagos.',
      'O agrupamento era feito por pedido, não por usuário.',
      'A ordenação colocava os usuários menos ativos primeiro.',
    ],
    tags: ['analytics', 'join', 'having'],
  }),
]

export const mockBugs: Bug[] = [
  ...originalMockBugs,
  ...buildBugCatalogAdditions(originalMockBugs).map(createBug),
]
