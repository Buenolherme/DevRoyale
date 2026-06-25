import type { BattleChallenge, BattleDifficulty, BattleLanguage } from '@/types'

type TargetBattleDifficulty = BattleDifficulty

interface BattleSeed {
  title: string
  statement: string
  instructions: string[]
  starterCode: string
  expectedAnswer: string
  hint: string
}

const languages: BattleLanguage[] = ['python', 'javascript', 'html-css', 'sql']
const difficulties: TargetBattleDifficulty[] = [
  'never',
  'basic',
  'intermediate',
  'advanced',
]

const xpByDifficulty: Record<TargetBattleDifficulty, number> = {
  never: 15,
  basic: 25,
  intermediate: 40,
  advanced: 60,
}

const seed = (
  title: string,
  statement: string,
  starterCode: string,
  expectedAnswer: string,
  hint: string,
  instructions: string[],
): BattleSeed => ({ title, statement, starterCode, expectedAnswer, hint, instructions })

const pythonSeeds: Record<TargetBattleDifficulty, BattleSeed[]> = {
  never: [
    seed('Saudação personalizada', 'Crie uma variável com o nome Luna e mostre “Olá, Luna!”.', '# Defina o nome e mostre a saudação\n', 'nome = "Luna"\nprint(f"Olá, {nome}!")', 'Uma f-string permite inserir a variável dentro do texto.', ['Crie a variável nome.', 'Use print para exibir a mensagem exata.']),
    seed('Dobro de um número', 'Guarde o número 7 e mostre o dobro dele.', '# Calcule o dobro de 7\n', 'numero = 7\ndobro = numero * 2\nprint(dobro)', 'Multiplicar por 2 produz o dobro.', ['Use uma variável numérica.', 'Mostre o resultado 14.']),
    seed('Maioridade simples', 'Mostre “maior” quando a idade 20 for pelo menos 18.', '# Verifique a idade\n', 'idade = 20\nif idade >= 18:\n    print("maior")', 'Use uma condição com >=.', ['Defina idade como número.', 'Use if e mostre a palavra solicitada.']),
  ],
  basic: [
    seed('Somar números positivos', 'Crie uma função que some apenas os números positivos de uma lista.', 'def somar_positivos(numeros):\n    # Retorne a soma\n    pass\n', 'def somar_positivos(numeros):\n    return sum(numero for numero in numeros if numero > 0)', 'Filtre os valores dentro de uma expressão geradora.', ['Receba uma lista.', 'Ignore zero e números negativos.', 'Retorne a soma.']),
    seed('Nomes com três letras', 'Retorne apenas nomes que tenham três ou mais caracteres.', 'def nomes_validos(nomes):\n    # Filtre os nomes\n    pass\n', 'def nomes_validos(nomes):\n    return [nome for nome in nomes if len(nome) >= 3]', 'Uma compreensão de lista pode filtrar pelo len.', ['Preserve a ordem.', 'Considere nomes com exatamente três letras.', 'Retorne uma nova lista.']),
    seed('Contagem regressiva', 'Crie uma função que devolva uma lista de n até zero.', 'def contagem(n):\n    # Monte a contagem regressiva\n    pass\n', 'def contagem(n):\n    return list(range(n, -1, -1))', 'range aceita início, limite exclusivo e passo.', ['Inclua o número inicial.', 'Inclua zero.', 'Retorne uma lista.']),
  ],
  intermediate: [
    seed('Frequência de palavras', 'Conte quantas vezes cada palavra aparece em uma lista.', 'def frequencias(palavras):\n    resultado = {}\n    # Complete o dicionário\n', 'def frequencias(palavras):\n    resultado = {}\n    for palavra in palavras:\n        resultado[palavra] = resultado.get(palavra, 0) + 1\n    return resultado', 'get permite começar a contagem de uma chave ausente em zero.', ['Use um dicionário.', 'Conte todas as ocorrências.', 'Retorne o resultado.']),
    seed('Média segura', 'Calcule a média; para uma lista vazia, retorne 0.', 'def media_segura(valores):\n    # Evite divisão por zero\n    pass\n', 'def media_segura(valores):\n    if not valores:\n        return 0\n    return sum(valores) / len(valores)', 'Trate a lista vazia antes da divisão.', ['Aceite números inteiros ou decimais.', 'Retorne 0 para lista vazia.', 'Não altere a lista.']),
    seed('Mesclar inventários', 'Some quantidades de itens presentes em dois inventários.', 'def mesclar(primeiro, segundo):\n    # Combine os dicionários\n    pass\n', 'def mesclar(primeiro, segundo):\n    resultado = primeiro.copy()\n    for item, quantidade in segundo.items():\n        resultado[item] = resultado.get(item, 0) + quantidade\n    return resultado', 'Comece com uma cópia e acumule as chaves do segundo dicionário.', ['Não altere os argumentos.', 'Some chaves repetidas.', 'Preserve chaves exclusivas.']),
  ],
  advanced: [
    seed('Percorrer árvore de categorias', 'Retorne todos os nomes de uma árvore aninhada em pré-ordem.', 'def nomes_da_arvore(no):\n    # no possui name e children\n    pass\n', 'def nomes_da_arvore(no):\n    nomes = [no["name"]]\n    for filho in no.get("children", []):\n        nomes.extend(nomes_da_arvore(filho))\n    return nomes', 'Visite o nó atual e depois chame a função para cada filho.', ['Use recursão.', 'Aceite nós sem children.', 'Mantenha a ordem de visita.']),
    seed('Coletar tarefas assíncronas', 'Execute várias coroutines em paralelo e preserve a ordem dos resultados.', 'import asyncio\n\nasync def coletar(coroutines):\n    # Aguarde todas\n    pass\n', 'import asyncio\n\nasync def coletar(coroutines):\n    return await asyncio.gather(*coroutines)', 'asyncio.gather recebe as coroutines desempacotadas.', ['Use await.', 'Execute as tarefas de forma concorrente.', 'Retorne os resultados na ordem de entrada.']),
    seed('Cache limitado', 'Crie uma função Fibonacci com cache de no máximo 128 resultados.', 'from functools import lru_cache\n\n# Implemente fibonacci\n', 'from functools import lru_cache\n\n@lru_cache(maxsize=128)\ndef fibonacci(n):\n    if n < 2:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)', 'Combine um caso-base com lru_cache.', ['Use recursão.', 'Defina os casos 0 e 1.', 'Limite o cache a 128.']),
  ],
}

const javascriptSeeds: Record<TargetBattleDifficulty, BattleSeed[]> = {
  never: [
    seed('Saudação no console', 'Crie uma constante com o nome Luna e mostre “Olá, Luna!”.', '// Defina o nome e mostre a saudação\n', 'const nome = "Luna";\nconsole.log(`Olá, ${nome}!`);', 'Template strings interpolam valores com ${...}.', ['Use const.', 'Mostre a mensagem exata no console.']),
    seed('Triplo do valor', 'Guarde o número 6 e mostre o triplo dele.', '// Calcule o triplo de 6\n', 'const numero = 6;\nconst triplo = numero * 3;\nconsole.log(triplo);', 'Multiplique o número por 3.', ['Crie duas constantes.', 'Mostre o resultado 18.']),
    seed('Acesso liberado', 'Mostre “liberado” quando a idade 21 for pelo menos 18.', '// Verifique a idade\n', 'const idade = 21;\nif (idade >= 18) {\n  console.log("liberado");\n}', 'Use if com o operador >=.', ['Defina a idade.', 'Crie uma condição.', 'Mostre a palavra solicitada.']),
  ],
  basic: [
    seed('Filtrar pares', 'Crie uma função que retorne apenas os números pares.', 'function filtrarPares(numeros) {\n  // Retorne os pares\n}\n', 'function filtrarPares(numeros) {\n  return numeros.filter(numero => numero % 2 === 0);\n}', 'filter mantém os itens para os quais a callback retorna true.', ['Use filter.', 'Não altere o array original.', 'Retorne um novo array.']),
    seed('Total do carrinho', 'Some os preços de todos os itens de um carrinho.', 'function totalCarrinho(itens) {\n  // Some os preços\n}\n', 'function totalCarrinho(itens) {\n  return itens.reduce((total, item) => total + item.preco, 0);\n}', 'reduce pode acumular cada preço começando em zero.', ['Receba objetos com preco.', 'Use um acumulador inicial.', 'Retorne o total.']),
    seed('Normalizar nomes', 'Retorne todos os nomes sem espaços nas pontas e em minúsculas.', 'function normalizar(nomes) {\n  // Transforme cada nome\n}\n', 'function normalizar(nomes) {\n  return nomes.map(nome => nome.trim().toLowerCase());\n}', 'map cria um novo array aplicando a mesma transformação.', ['Use trim.', 'Use toLowerCase.', 'Preserve a quantidade de itens.']),
  ],
  intermediate: [
    seed('Agrupar por categoria', 'Agrupe produtos em um objeto usando a categoria como chave.', 'function agrupar(produtos) {\n  // Monte os grupos\n}\n', 'function agrupar(produtos) {\n  return produtos.reduce((grupos, produto) => {\n    const categoria = produto.categoria;\n    grupos[categoria] ??= [];\n    grupos[categoria].push(produto);\n    return grupos;\n  }, {});\n}', 'O acumulador pode criar o array da categoria sob demanda.', ['Use reduce.', 'Não perca produtos repetidos.', 'Retorne um objeto de arrays.']),
    seed('Buscar dados com fallback', 'Retorne os dados da API; se a resposta falhar, retorne um array vazio.', 'async function carregar(url) {\n  // Faça a requisição\n}\n', 'async function carregar(url) {\n  const resposta = await fetch(url);\n  if (!resposta.ok) return [];\n  return resposta.json();\n}', 'Verifique response.ok antes de ler o JSON.', ['Use async/await.', 'Trate resposta não OK.', 'Retorne o JSON em caso de sucesso.']),
    seed('Atualização imutável', 'Atualize o score de um jogador sem alterar o objeto original.', 'function atualizarScore(jogador, score) {\n  // Retorne um novo objeto\n}\n', 'function atualizarScore(jogador, score) {\n  return { ...jogador, score };\n}', 'Spread copia as propriedades antes de sobrescrever score.', ['Não altere jogador.', 'Preserve outras propriedades.', 'Retorne um novo objeto.']),
  ],
  advanced: [
    seed('Fila com limite de concorrência', 'Execute tarefas assíncronas com no máximo duas em andamento.', 'async function executar(tarefas) {\n  // Limite a concorrência\n}\n', 'async function executar(tarefas) {\n  const resultados = [];\n  for (let i = 0; i < tarefas.length; i += 2) {\n    resultados.push(...await Promise.all(tarefas.slice(i, i + 2).map(tarefa => tarefa())));\n  }\n  return resultados;\n}', 'Processe o array em lotes de duas tarefas.', ['Limite cada lote a duas tarefas.', 'Preserve a ordem dos lotes.', 'Retorne todos os resultados.']),
    seed('Memoização por argumentos', 'Crie um wrapper que memorize resultados usando os argumentos como chave.', 'function memoizar(fn) {\n  // Implemente o cache\n}\n', 'function memoizar(fn) {\n  const cache = new Map();\n  return (...args) => {\n    const chave = JSON.stringify(args);\n    if (!cache.has(chave)) cache.set(chave, fn(...args));\n    return cache.get(chave);\n  };\n}', 'Map permite distinguir uma chave ainda não calculada de um valor falsy.', ['Mantenha o cache no closure.', 'Aceite vários argumentos.', 'Não recalcule chaves conhecidas.']),
    seed('Cancelar requisição lenta', 'Implemente uma requisição que seja cancelada após um tempo limite.', 'async function buscarComTimeout(url, ms) {\n  // Use AbortController\n}\n', 'async function buscarComTimeout(url, ms) {\n  const controller = new AbortController();\n  const timer = setTimeout(() => controller.abort(), ms);\n  try {\n    return await fetch(url, { signal: controller.signal });\n  } finally {\n    clearTimeout(timer);\n  }\n}', 'AbortController fornece o signal usado pelo fetch.', ['Crie o controller.', 'Cancele após ms.', 'Sempre limpe o timer.']),
  ],
}

const htmlCssSeeds: Record<TargetBattleDifficulty, BattleSeed[]> = {
  never: [
    seed('Título e descrição', 'Crie uma seção com título “Arena” e parágrafo “Treine seu código”.', '<!-- Crie a seção -->\n', '<section>\n  <h1>Arena</h1>\n  <p>Treine seu código</p>\n</section>', 'Use section, h1 e p.', ['Use HTML semântico.', 'Mantenha os textos exatos.']),
    seed('Link para estudos', 'Crie um link “Estudar” apontando para /estudos.', '<!-- Crie o link -->\n', '<a href="/estudos">Estudar</a>', 'O destino do link fica no atributo href.', ['Use a tag a.', 'Defina o href.', 'Use o texto solicitado.']),
    seed('Botão dourado', 'Crie um botão “Batalhar” com fundo dourado.', '<!-- Crie e estilize o botão -->\n', '<button class="battle-button">Batalhar</button>\n\n<style>\n  .battle-button {\n    background: gold;\n  }\n</style>', 'Associe uma classe ao botão e selecione-a com ponto no CSS.', ['Crie o botão.', 'Use uma classe.', 'Aplique background dourado.']),
  ],
  basic: [
    seed('Cards em linha', 'Organize três cards em uma linha flexível com espaço de 16px.', '<section class="cards">\n  <article>A</article>\n  <article>B</article>\n  <article>C</article>\n</section>\n\n<style>\n  .cards {\n    /* Organize os cards */\n  }\n</style>', '<section class="cards">\n  <article>A</article>\n  <article>B</article>\n  <article>C</article>\n</section>\n\n<style>\n  .cards {\n    display: flex;\n    gap: 16px;\n  }\n</style>', 'Flexbox e gap resolvem a distribuição.', ['Use display flex.', 'Use gap de 16px.', 'Preserve os três cards.']),
    seed('Campo de e-mail acessível', 'Crie label e input de e-mail corretamente associados.', '<form>\n  <!-- Adicione o campo -->\n</form>', '<form>\n  <label for="email">Email</label>\n  <input id="email" name="email" type="email">\n</form>', 'O for da label deve coincidir com o id do input.', ['Use type email.', 'Associe label e input.', 'Defina name.']),
    seed('Navegação responsiva', 'Crie uma navegação flexível que quebre linha quando faltar espaço.', '<nav class="menu">\n  <a href="/">Home</a>\n  <a href="/estudos">Estudos</a>\n</nav>\n\n<style>\n  .menu {\n    /* Torne responsivo */\n  }\n</style>', '<nav class="menu">\n  <a href="/">Home</a>\n  <a href="/estudos">Estudos</a>\n</nav>\n\n<style>\n  .menu {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 12px;\n  }\n</style>', 'flex-wrap permite quebrar os itens.', ['Use Flexbox.', 'Permita quebra de linha.', 'Adicione espaço de 12px.']),
  ],
  intermediate: [
    seed('Grade automática', 'Crie uma grade de cards com colunas mínimas de 220px e responsivas.', '<section class="grid">\n  <article>A</article><article>B</article><article>C</article>\n</section>\n<style>\n.grid { /* Implemente */ }\n</style>', '<section class="grid">\n  <article>A</article><article>B</article><article>C</article>\n</section>\n<style>\n.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 16px;\n}\n</style>', 'Combine repeat, auto-fit e minmax.', ['Use CSS Grid.', 'Mínimo de 220px.', 'Use gap de 16px.']),
    seed('Modal semântico', 'Crie um dialog aberto com título associado por aria-labelledby.', '<!-- Crie o modal -->\n', '<dialog open aria-labelledby="modal-title">\n  <h2 id="modal-title">Resultado</h2>\n  <p>Desafio concluído.</p>\n</dialog>', 'dialog oferece semântica de modal e pode apontar para o título.', ['Use dialog.', 'Associe o título.', 'Mantenha o texto.']),
    seed('Tema com variáveis', 'Defina tokens de fundo e destaque e use-os em um card.', '<article class="card">Scout</article>\n<style>\n  /* Defina e use os tokens */\n</style>', '<article class="card">Scout</article>\n<style>\n  :root {\n    --surface: #171717;\n    --accent: #d4af37;\n  }\n  .card {\n    background: var(--surface);\n    color: var(--accent);\n  }\n</style>', 'Custom properties são definidas em :root e lidas com var.', ['Crie dois tokens.', 'Use ambos no card.', 'Mantenha contraste.']),
  ],
  advanced: [
    seed('Camadas de estilo', 'Organize reset e componentes com @layer e estilize um botão.', '<button class="button">Entrar</button>\n<style>\n  /* Organize as camadas */\n</style>', '<button class="button">Entrar</button>\n<style>\n  @layer reset, components;\n  @layer reset {\n    button { font: inherit; }\n  }\n  @layer components {\n    .button { color: gold; }\n  }\n</style>', '@layer declara uma ordem previsível para a cascata.', ['Declare a ordem das camadas.', 'Inclua reset e components.', 'Estilize o botão na camada correta.']),
    seed('Card com container query', 'Mude o card para duas colunas quando seu container alcançar 500px.', '<section class="wrapper"><article class="card">Conteúdo</article></section>\n<style>\n  /* Implemente a consulta */\n</style>', '<section class="wrapper"><article class="card">Conteúdo</article></section>\n<style>\n  .wrapper { container-type: inline-size; }\n  @container (min-width: 500px) {\n    .card { display: grid; grid-template-columns: 1fr 1fr; }\n  }\n</style>', 'O pai define container-type; o filho responde em @container.', ['Defina o container.', 'Use limite de 500px.', 'Crie duas colunas.']),
    seed('Movimento respeitoso', 'Crie uma animação e desative-a para quem prefere movimento reduzido.', '<div class="pulse">XP</div>\n<style>\n  /* Anime com segurança */\n</style>', '<div class="pulse">XP</div>\n<style>\n  .pulse { animation: pulse 1s infinite; }\n  @keyframes pulse { to { transform: scale(1.05); } }\n  @media (prefers-reduced-motion: reduce) {\n    .pulse { animation: none; }\n  }\n</style>', 'Use prefers-reduced-motion: reduce para remover a animação.', ['Defina keyframes.', 'Aplique a animação.', 'Respeite movimento reduzido.']),
  ],
}

const sqlSeeds: Record<TargetBattleDifficulty, BattleSeed[]> = {
  never: [
    seed('Listar jogadores', 'Selecione as colunas name e level da tabela players.', '-- Escreva a consulta\n', 'SELECT name, level FROM players;', 'Liste as colunas após SELECT e a tabela após FROM.', ['Selecione somente name e level.', 'Use a tabela players.']),
    seed('Jogadores ativos', 'Selecione todos os jogadores cujo campo active seja verdadeiro.', '-- Filtre jogadores ativos\n', 'SELECT * FROM players WHERE active = TRUE;', 'A condição fica após WHERE.', ['Selecione todas as colunas.', 'Filtre active igual a TRUE.']),
    seed('Top cinco pontuações', 'Liste cinco scores do maior para o menor.', '-- Ordene e limite os resultados\n', 'SELECT * FROM scores ORDER BY points DESC LIMIT 5;', 'ORDER BY DESC ordena de forma decrescente.', ['Ordene por points.', 'Use ordem decrescente.', 'Limite a cinco linhas.']),
  ],
  basic: [
    seed('Total por categoria', 'Conte produtos por categoria e ordene da maior contagem para a menor.', '-- Agrupe os produtos\n', 'SELECT category, COUNT(*) AS total\nFROM products\nGROUP BY category\nORDER BY total DESC;', 'GROUP BY cria um grupo por categoria.', ['Use COUNT(*).', 'Agrupe por category.', 'Ordene pelo alias total.']),
    seed('Pedidos com clientes', 'Liste order id e customer name relacionando orders e customers.', '-- Relacione as tabelas\n', 'SELECT orders.id, customers.name\nFROM orders\nJOIN customers ON customers.id = orders.customer_id;', 'A condição do JOIN conecta a chave do cliente.', ['Use JOIN.', 'Relacione os IDs.', 'Selecione apenas as colunas pedidas.']),
    seed('Itens sem dono', 'Selecione itens cujo owner_id esteja nulo.', '-- Busque itens sem dono\n', 'SELECT * FROM items WHERE owner_id IS NULL;', 'NULL é testado com IS NULL.', ['Use WHERE.', 'Não compare NULL com =.']),
  ],
  intermediate: [
    seed('Ranking por equipe', 'Numere jogadores por score dentro de cada equipe.', '-- Use uma função de janela\n', 'SELECT name, team_id,\n       RANK() OVER (PARTITION BY team_id ORDER BY score DESC) AS position\nFROM players;', 'PARTITION BY reinicia o ranking para cada equipe.', ['Use RANK.', 'Particione por team_id.', 'Ordene score de forma decrescente.']),
    seed('Totais com CTE', 'Crie uma CTE com o total de cada pedido e retorne apenas totais acima de 100.', '-- Estruture a consulta em etapas\n', 'WITH totals AS (\n  SELECT order_id, SUM(price * quantity) AS total\n  FROM order_items\n  GROUP BY order_id\n)\nSELECT * FROM totals WHERE total > 100;', 'A CTE calcula os totais antes do filtro externo.', ['Use WITH.', 'Agrupe por order_id.', 'Filtre total acima de 100.']),
    seed('Atualização protegida', 'Desconte 10 moedas da carteira 1 dentro de uma transação e sem permitir saldo negativo.', '-- Faça uma atualização atômica\n', 'BEGIN;\nUPDATE wallets\nSET balance = balance - 10\nWHERE id = 1 AND balance >= 10;\nCOMMIT;', 'A condição de saldo pode fazer parte do próprio UPDATE.', ['Use uma transação.', 'Filtre a carteira 1.', 'Garanta saldo mínimo.']),
  ],
  advanced: [
    seed('Hierarquia recursiva', 'Liste uma categoria e todas as suas descendentes a partir do id 1.', '-- Use uma CTE recursiva\n', 'WITH RECURSIVE tree AS (\n  SELECT id, parent_id, name FROM categories WHERE id = 1\n  UNION ALL\n  SELECT c.id, c.parent_id, c.name\n  FROM categories c\n  JOIN tree t ON c.parent_id = t.id\n)\nSELECT * FROM tree;', 'A parte recursiva relaciona parent_id ao nó já visitado.', ['Use WITH RECURSIVE.', 'Defina caso inicial e recursivo.', 'Retorne a árvore.']),
    seed('Mediana de pontuações', 'Calcule a mediana dos scores usando PostgreSQL.', '-- Calcule o percentil contínuo\n', 'SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) AS median\nFROM matches;', 'PERCENTILE_CONT com 0.5 representa a mediana.', ['Use PERCENTILE_CONT.', 'Ordene por score.', 'Defina o alias median.']),
    seed('Upsert de preferências', 'Insira o tema dark para o jogador 1 ou atualize o registro existente.', '-- Faça um upsert\n', "INSERT INTO preferences (player_id, theme)\nVALUES (1, 'dark')\nON CONFLICT (player_id)\nDO UPDATE SET theme = EXCLUDED.theme;", 'ON CONFLICT define como tratar a chave já existente.', ['Insira player_id e theme.', 'Use player_id como conflito.', 'Atualize pelo valor EXCLUDED.']),
  ],
}

const seeds: Record<BattleLanguage, Record<TargetBattleDifficulty, BattleSeed[]>> = {
  python: pythonSeeds,
  javascript: javascriptSeeds,
  'html-css': htmlCssSeeds,
  sql: sqlSeeds,
}

function createChallenge(
  language: BattleLanguage,
  difficulty: TargetBattleDifficulty,
  variant: number,
): BattleChallenge {
  const challengeSeed = seeds[language][difficulty][variant]

  return {
    id: `battle-v1-${language}-${difficulty}-${variant + 1}`,
    language,
    difficulty,
    title: challengeSeed.title,
    description: challengeSeed.statement,
    statement: challengeSeed.statement,
    instructions: challengeSeed.instructions,
    starterCode: challengeSeed.starterCode,
    expectedAnswer: challengeSeed.expectedAnswer,
    hint: challengeSeed.hint,
    xp: xpByDifficulty[difficulty],
    tags: [language, difficulty, 'battle', challengeSeed.title.toLowerCase()],
  }
}

export function buildBattleCatalogAdditions(
  existingChallenges: BattleChallenge[],
): BattleChallenge[] {
  const additions: BattleChallenge[] = []
  const existingIds = new Set(existingChallenges.map((challenge) => challenge.id))

  languages.forEach((language) => {
    difficulties.forEach((difficulty) => {
      const generatedCount = difficulty === 'advanced' ? 3 : 2

      for (let variant = 0; variant < generatedCount; variant += 1) {
        const challenge = createChallenge(language, difficulty, variant)
        if (!existingIds.has(challenge.id)) additions.push(challenge)
      }
    })
  })

  return additions
}
