import type { BattleChallenge } from '@/types/battle'
import { buildBattleCatalogAdditions } from './mockBattleChallengesExpansion'

type LegacyBattleChallenge = Omit<BattleChallenge, 'description' | 'tags'>

const originalMockBattleChallenges: LegacyBattleChallenge[] = [
  {
    id: 'python-never-hello',
    title: 'Primeira mensagem em Python',
    language: 'python',
    difficulty: 'never',
    statement: 'Mostre a mensagem "Hello, World!" no terminal.',
    instructions: [
      'Use a função print.',
      'Escreva a mensagem exatamente como aparece no desafio.',
    ],
    starterCode: '# Mostre sua primeira mensagem em Python\n',
    expectedAnswer: 'print("Hello, World!")',
    hint: 'A função print recebe o texto entre parênteses.',
    xp: 20,
  },
  {
    id: 'python-beginner-reverse',
    title: 'Inverter uma palavra',
    language: 'python',
    difficulty: 'never',
    statement: 'Crie uma função que receba uma palavra e retorne seus caracteres invertidos.',
    instructions: [
      'Complete a função inverter_texto.',
      'Retorne uma nova string com os caracteres na ordem inversa.',
    ],
    starterCode: `def inverter_texto(texto):
    # Escreva sua solução aqui
    pass
`,
    expectedAnswer: `def inverter_texto(texto):
    return texto[::-1]
`,
    hint: 'O fatiamento [::-1] percorre uma string de trás para frente.',
    xp: 50,
  },
  {
    id: 'python-beginner-sum',
    title: 'Somar dois números',
    language: 'python',
    difficulty: 'never',
    statement: 'Complete a função para retornar a soma de dois números.',
    instructions: [
      'Use os parâmetros numero_a e numero_b.',
      'Retorne o resultado da soma.',
    ],
    starterCode: `def somar(numero_a, numero_b):
    # Retorne a soma
    pass
`,
    expectedAnswer: `def somar(numero_a, numero_b):
    return numero_a + numero_b
`,
    hint: 'Use o operador + entre os dois parâmetros.',
    xp: 50,
  },
  {
    id: 'python-basic-vowels',
    title: 'Contador de vogais',
    language: 'python',
    difficulty: 'basic',
    statement: 'Conte quantas vogais existem em um texto.',
    instructions: [
      'Considere as vogais a, e, i, o e u.',
      'Ignore diferenças entre letras maiúsculas e minúsculas.',
      'Retorne a quantidade encontrada.',
    ],
    starterCode: `def contar_vogais(texto):
    vogais = "aeiou"
    # Continue aqui
`,
    expectedAnswer: `def contar_vogais(texto):
    vogais = "aeiou"
    return sum(1 for letra in texto.lower() if letra in vogais)
    `,
    hint: 'Converta o texto para minúsculas e percorra cada letra.',
    xp: 90,
  },
  {
    id: 'python-intermediate-frequency',
    title: 'Frequência de palavras',
    language: 'python',
    difficulty: 'intermediate',
    statement: 'Crie um dicionário com a frequência de cada palavra de uma frase.',
    instructions: [
      'Separe a frase em palavras.',
      'Normalize todas para minúsculas.',
      'Retorne um dicionário no formato palavra: quantidade.',
    ],
    starterCode: `def frequencia_palavras(frase):
    frequencias = {}
    # Continue aqui
    return frequencias
`,
    expectedAnswer: `def frequencia_palavras(frase):
    frequencias = {}
    for palavra in frase.lower().split():
        frequencias[palavra] = frequencias.get(palavra, 0) + 1
    return frequencias
    `,
    hint: 'O método get permite iniciar uma contagem quando a chave ainda não existe.',
    xp: 160,
  },
  {
    id: 'javascript-never-hello',
    title: 'Primeira mensagem em JavaScript',
    language: 'javascript',
    difficulty: 'never',
    statement: 'Mostre a mensagem "Hello, World!" no console.',
    instructions: [
      'Use console.log.',
      'Escreva a mensagem exatamente como aparece no desafio.',
    ],
    starterCode: '// Mostre sua primeira mensagem em JavaScript\n',
    expectedAnswer: 'console.log("Hello, World!");',
    hint: 'Passe o texto entre os parênteses de console.log.',
    xp: 20,
  },
  {
    id: 'javascript-beginner-double',
    title: 'Dobrar um número',
    language: 'javascript',
    difficulty: 'never',
    statement: 'Complete a função para retornar o dobro de um número.',
    instructions: [
      'Use o parâmetro numero.',
      'Retorne o valor multiplicado por dois.',
    ],
    starterCode: `function dobrar(numero) {
  // Escreva sua solução aqui
}
`,
    expectedAnswer: `function dobrar(numero) {
  return numero * 2;
}
`,
    hint: 'Use o operador de multiplicação *.',
    xp: 50,
  },
  {
    id: 'javascript-beginner-greeting',
    title: 'Saudação personalizada',
    language: 'javascript',
    difficulty: 'never',
    statement: 'Retorne uma saudação usando o nome recebido pela função.',
    instructions: [
      'Use o parâmetro nome.',
      'Retorne o texto no formato "Olá, nome!".',
    ],
    starterCode: `function saudar(nome) {
  // Retorne a saudação
}
`,
    expectedAnswer: `function saudar(nome) {
  return \`Olá, \${nome}!\`;
}
`,
    hint: 'Template strings usam crases e a sintaxe ${valor}.',
    xp: 50,
  },
  {
    id: 'javascript-basic-unique',
    title: 'Remover valores duplicados',
    language: 'javascript',
    difficulty: 'basic',
    statement: 'Crie uma função que retorne um array sem valores repetidos.',
    instructions: [
      'Receba o array pelo parâmetro valores.',
      'Mantenha uma ocorrência de cada valor.',
      'Retorne um novo array.',
    ],
    starterCode: `function removerDuplicados(valores) {
  // Continue aqui
}
`,
    expectedAnswer: `function removerDuplicados(valores) {
  return [...new Set(valores)];
}
    `,
    hint: 'A estrutura Set armazena apenas valores únicos.',
    xp: 90,
  },
  {
    id: 'javascript-intermediate-cart',
    title: 'Total do carrinho',
    language: 'javascript',
    difficulty: 'intermediate',
    statement: 'Calcule o total de um carrinho considerando preço e quantidade.',
    instructions: [
      'Cada item possui as propriedades preco e quantidade.',
      'Some preco multiplicado por quantidade para todos os itens.',
      'Retorne o total calculado.',
    ],
    starterCode: `function calcularTotal(itens) {
  // Continue aqui
}
`,
    expectedAnswer: `function calcularTotal(itens) {
  return itens.reduce(
    (total, item) => total + item.preco * item.quantidade,
    0
  );
}
    `,
    hint: 'Use reduce para acumular o valor de todos os itens.',
    xp: 160,
  },
  {
    id: 'sql-never-hello',
    title: 'Primeira consulta SQL',
    language: 'sql',
    difficulty: 'never',
    statement: 'Retorne o texto "Hello, World!" usando uma consulta SQL.',
    instructions: [
      'Use o comando SELECT.',
      'Retorne somente o texto solicitado.',
    ],
    starterCode: '-- Escreva sua primeira consulta SQL\n',
    expectedAnswer: "SELECT 'Hello, World!';",
    hint: 'O SELECT também pode retornar um texto literal.',
    xp: 20,
  },
  {
    id: 'sql-beginner-active-users',
    title: 'Usuários ativos',
    language: 'sql',
    difficulty: 'never',
    statement: 'Liste nome e email dos usuários que estão ativos.',
    instructions: [
      'Consulte a tabela usuarios.',
      'Selecione somente as colunas nome e email.',
      'Filtre registros com ativo igual a 1.',
    ],
    starterCode: `SELECT
  -- escolha as colunas
FROM usuarios
-- adicione o filtro
;
`,
    expectedAnswer: `SELECT nome, email
FROM usuarios
WHERE ativo = 1;
`,
    hint: 'Use WHERE para filtrar os registros ativos.',
    xp: 50,
  },
  {
    id: 'sql-beginner-products',
    title: 'Produtos em ordem alfabética',
    language: 'sql',
    difficulty: 'never',
    statement: 'Liste os nomes dos produtos em ordem alfabética.',
    instructions: [
      'Consulte a tabela produtos.',
      'Selecione a coluna nome.',
      'Ordene o resultado de A a Z.',
    ],
    starterCode: `SELECT nome
FROM produtos
-- ordene o resultado
;
`,
    expectedAnswer: `SELECT nome
FROM produtos
ORDER BY nome ASC;
`,
    hint: 'ORDER BY com ASC organiza os valores em ordem crescente.',
    xp: 50,
  },
  {
    id: 'sql-basic-category-count',
    title: 'Produtos por categoria',
    language: 'sql',
    difficulty: 'basic',
    statement: 'Conte quantos produtos existem em cada categoria.',
    instructions: [
      'Consulte a tabela produtos.',
      'Agrupe os registros pela coluna categoria.',
      'Retorne categoria e a quantidade correspondente.',
    ],
    starterCode: `SELECT
  categoria,
  -- conte os produtos
FROM produtos
-- agrupe aqui
;
`,
    expectedAnswer: `SELECT categoria, COUNT(*) AS quantidade
FROM produtos
GROUP BY categoria;
    `,
    hint: 'Combine COUNT(*) com GROUP BY categoria.',
    xp: 90,
  },
  {
    id: 'sql-intermediate-orders',
    title: 'Pedidos com clientes',
    language: 'sql',
    difficulty: 'intermediate',
    statement: 'Liste cada pedido junto ao nome do cliente responsável.',
    instructions: [
      'Use as tabelas pedidos e clientes.',
      'Relacione pedidos.cliente_id com clientes.id.',
      'Retorne o id do pedido, o nome do cliente e o total.',
    ],
    starterCode: `SELECT
  p.id,
  -- nome do cliente
  p.total
FROM pedidos AS p
-- relacione clientes aqui
;
`,
    expectedAnswer: `SELECT p.id, c.nome, p.total
FROM pedidos AS p
INNER JOIN clientes AS c ON c.id = p.cliente_id;
    `,
    hint: 'Use INNER JOIN e conecte as chaves do cliente.',
    xp: 160,
  },
  {
    id: 'html-css-never-hello',
    title: 'Primeiro título HTML',
    language: 'html-css',
    difficulty: 'never',
    statement: 'Crie um título principal com o texto "Hello, World!".',
    instructions: [
      'Use uma tag de título de nível 1.',
      'Escreva o texto exatamente como solicitado.',
    ],
    starterCode: '<!-- Crie seu primeiro título HTML -->\n',
    expectedAnswer: '<h1>Hello, World!</h1>',
    hint: 'A tag de título principal é h1.',
    xp: 20,
  },
  {
    id: 'html-css-beginner-button',
    title: 'Botão de batalha',
    language: 'html-css',
    difficulty: 'never',
    statement: 'Crie um botão vermelho com o texto "Entrar na Batalha".',
    instructions: [
      'Crie um elemento button com a classe battle-button.',
      'Adicione fundo vermelho, texto branco e espaçamento interno.',
    ],
    starterCode: `<button class="battle-button">Entrar na Batalha</button>

<style>
  .battle-button {
    /* Estilize aqui */
  }
</style>
`,
    expectedAnswer: `<button class="battle-button">Entrar na Batalha</button>

<style>
  .battle-button {
    background: #c83232;
    color: white;
    padding: 12px 20px;
  }
</style>
`,
    hint: 'Use background, color e padding na classe do botão.',
    xp: 50,
  },
  {
    id: 'html-css-beginner-card',
    title: 'Card de perfil',
    language: 'html-css',
    difficulty: 'never',
    statement: 'Monte um card simples com nome e nível do jogador.',
    instructions: [
      'Use uma div com a classe profile-card.',
      'Inclua um h2 com o nome e um parágrafo com o nível.',
      'Adicione borda e cantos arredondados.',
    ],
    starterCode: `<div class="profile-card">
  <!-- Conteúdo do perfil -->
</div>

<style>
  .profile-card {
    /* Estilize aqui */
  }
</style>
`,
    expectedAnswer: `<div class="profile-card">
  <h2>Dev Guerreiro</h2>
  <p>Nível 1</p>
</div>

<style>
  .profile-card {
    border: 1px solid #d6a84a;
    border-radius: 12px;
    padding: 16px;
  }
</style>
`,
    hint: 'Coloque os textos dentro da div e use border, border-radius e padding.',
    xp: 50,
  },
  {
    id: 'html-css-basic-grid',
    title: 'Grid de desafios',
    language: 'html-css',
    difficulty: 'basic',
    statement: 'Organize três desafios em uma grade responsiva.',
    instructions: [
      'Use display grid no container.',
      'Crie colunas que se adaptem ao espaço disponível.',
      'Mantenha um espaço de 16px entre os cards.',
    ],
    starterCode: `<section class="challenge-grid">
  <article>Desafio 1</article>
  <article>Desafio 2</article>
  <article>Desafio 3</article>
</section>

<style>
  .challenge-grid {
    /* Crie a grade */
  }
</style>
`,
    expectedAnswer: `<section class="challenge-grid">
  <article>Desafio 1</article>
  <article>Desafio 2</article>
  <article>Desafio 3</article>
</section>

<style>
  .challenge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }
</style>
    `,
    hint: 'Use repeat, auto-fit e minmax em grid-template-columns.',
    xp: 90,
  },
  {
    id: 'html-css-intermediate-form',
    title: 'Formulário acessível',
    language: 'html-css',
    difficulty: 'intermediate',
    statement: 'Crie um formulário de contato com campos corretamente identificados.',
    instructions: [
      'Inclua campos para nome e email.',
      'Associe cada label ao input correspondente.',
      'Adicione um botão de envio.',
      'Organize o formulário em uma coluna com espaçamento.',
    ],
    starterCode: `<form class="contact-form">
  <!-- Campos do formulário -->
</form>

<style>
  .contact-form {
    /* Organize os campos */
  }
</style>
`,
    expectedAnswer: `<form class="contact-form">
  <label for="name">Nome</label>
  <input id="name" name="name" type="text">

  <label for="email">Email</label>
  <input id="email" name="email" type="email">

  <button type="submit">Enviar</button>
</form>

<style>
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
    `,
    hint: 'O atributo for da label deve usar o mesmo valor do id do input.',
    xp: 160,
  },
]

const normalizedOriginalMockBattleChallenges: BattleChallenge[] =
  originalMockBattleChallenges.map((challenge) => ({
    ...challenge,
    description: challenge.statement,
    tags: [challenge.language, challenge.difficulty, 'battle'],
  }))

export const mockBattleChallenges: BattleChallenge[] = [
  ...normalizedOriginalMockBattleChallenges,
  ...buildBattleCatalogAdditions(normalizedOriginalMockBattleChallenges),
]
