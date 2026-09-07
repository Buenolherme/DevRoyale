import fs from 'node:fs'
import ts from 'typescript'

const migrationPath = new URL(
  '../supabase/migrations/20260814020000_real_multiplayer_battles.sql',
  import.meta.url,
)

function transpile(path) {
  return ts.transpileModule(fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
}

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}

async function loadCatalog() {
  const hintsUrl = dataUrl(transpile('src/data/battleHints.ts'))
  const expansionUrl = dataUrl(transpile('src/data/mockBattleChallengesExpansion.ts'))
  const catalogSource = transpile('src/data/mockBattleChallenges.ts')
    .replace('./battleHints', hintsUrl)
    .replace('./mockBattleChallengesExpansion', expansionUrl)
  return (await import(dataUrl(catalogSource))).mockBattleChallenges
}

const unsupported = new Set([
  'battle-v1-python-advanced-2',
  'battle-v1-javascript-intermediate-2',
  'battle-v1-javascript-advanced-3',
  'battle-v1-sql-advanced-2',
])

const programOutputCases = {
  'battle-v1-python-never-1': 'Olá, Luna!',
  'battle-v1-python-never-2': '14',
  'battle-v1-javascript-never-1': 'Olá, Luna!',
  'battle-v1-javascript-never-2': '18',
}

const functionCases = {
  'python-beginner-reverse': [
    { args: ['DevRoyale'], expected: 'elayoRveD' },
    { args: [''], expected: '' },
    { args: ['ação'], expected: 'oãça' },
  ],
  'python-beginner-sum': [
    { args: [2, 3], expected: 5 },
    { args: [-4, 10], expected: 6 },
    { args: [1.5, 2.25], expected: 3.75 },
  ],
  'python-basic-vowels': [
    { args: ['DevRoyale'], expected: 4 },
    { args: ['BCDF'], expected: 0 },
    { args: ['AEIOU'], expected: 5 },
  ],
  'python-intermediate-frequency': [
    { args: ['Dev dev CODE'], expected: { dev: 2, code: 1 } },
    { args: [''], expected: {} },
    { args: ['um dois um'], expected: { um: 2, dois: 1 } },
  ],
  'battle-v1-python-basic-1': [
    { args: [[-2, 0, 3, 5]], expected: 8 },
    { args: [[]], expected: 0 },
    { args: [[-9, -1]], expected: 0 },
  ],
  'battle-v1-python-basic-2': [
    { args: [['Al', 'Bia', 'Carlos']], expected: ['Bia', 'Carlos'] },
    { args: [['Ana', 'Lu', 'Ivo']], expected: ['Ana', 'Ivo'] },
    { args: [[]], expected: [] },
  ],
  'battle-v1-python-intermediate-1': [
    { args: [['a', 'b', 'a']], expected: { a: 2, b: 1 } },
    { args: [[]], expected: {} },
    { args: [['x', 'x', 'x']], expected: { x: 3 } },
  ],
  'battle-v1-python-intermediate-2': [
    { args: [[2, 4, 6]], expected: 4 },
    { args: [[]], expected: 0 },
    { args: [[1.5, 2.5]], expected: 2 },
  ],
  'battle-v1-python-advanced-1': [
    { args: [{ name: 'A', children: [{ name: 'B' }, { name: 'C', children: [{ name: 'D' }] }] }], expected: ['A', 'B', 'C', 'D'] },
    { args: [{ name: 'Raiz' }], expected: ['Raiz'] },
  ],
  'battle-v1-python-advanced-3': [
    { args: [0], expected: 0 },
    { args: [1], expected: 1 },
    { args: [10], expected: 55 },
  ],
  'javascript-beginner-double': [
    { args: [4], expected: 8 },
    { args: [-3], expected: -6 },
    { args: [1.5], expected: 3 },
  ],
  'javascript-beginner-greeting': [
    { args: ['Luna'], expected: 'Olá, Luna!' },
    { args: ['Dev'], expected: 'Olá, Dev!' },
  ],
  'javascript-basic-unique': [
    { args: [[1, 1, 2, 3, 2]], expected: [1, 2, 3] },
    { args: [['a', 'a', 'b']], expected: ['a', 'b'] },
    { args: [[]], expected: [] },
  ],
  'javascript-intermediate-cart': [
    { args: [[{ preco: 10, quantidade: 2 }, { preco: 5, quantidade: 3 }]], expected: 35 },
    { args: [[]], expected: 0 },
    { args: [[{ preco: 2.5, quantidade: 4 }]], expected: 10 },
  ],
  'battle-v1-javascript-basic-1': [
    { args: [[1, 2, 3, 4]], expected: [2, 4] },
    { args: [[-2, -1, 0]], expected: [-2, 0] },
    { args: [[]], expected: [] },
  ],
  'battle-v1-javascript-basic-2': [
    { args: [[{ preco: 4 }, { preco: 6 }]], expected: 10 },
    { args: [[]], expected: 0 },
    { args: [[{ preco: 1.5 }, { preco: 2.5 }]], expected: 4 },
  ],
  'battle-v1-javascript-intermediate-1': [
    { args: [[{ categoria: 'a', id: 1 }, { categoria: 'b', id: 2 }, { categoria: 'a', id: 3 }]], expected: { a: [{ categoria: 'a', id: 1 }, { categoria: 'a', id: 3 }], b: [{ categoria: 'b', id: 2 }] } },
    { args: [[]], expected: {} },
  ],
}

const specialFunctionCases = {
  'battle-v1-javascript-advanced-1': [
    {
      input: {
        tasks: [
          { value: 'A', delayMs: 8 },
          { value: 'B', delayMs: 3 },
          { value: 'C', delayMs: 5 },
          { value: 'D', delayMs: 2 },
          { value: 'E', delayMs: 1 },
        ],
      },
      expected: { results: ['A', 'B', 'C', 'D', 'E'], withinLimit: true },
    },
  ],
  'battle-v1-javascript-advanced-2': [
    {
      input: { invocations: [[2, 3], [2, 3], [5, 0], [2, 3]] },
      expected: { results: [5, 5, 5, 5], calls: 2 },
    },
    {
      input: { invocations: [[0], [0], [1], [1]] },
      expected: { results: [0, 0, 1, 1], calls: 2 },
    },
  ],
}

const specialHarnesses = {
  'battle-v1-javascript-advanced-1': {
    functionName: 'executar',
    harness: 'javascript_concurrency_queue',
  },
  'battle-v1-javascript-advanced-2': {
    functionName: 'memoizar',
    harness: 'javascript_memoization',
  },
}

const sqlCases = {
  'sql-never-hello': {
    setupSql: '',
    expected: [['Hello, World!']],
  },
  'sql-beginner-active-users': {
    setupSql: "CREATE TABLE usuarios(nome TEXT, email TEXT, ativo INTEGER); INSERT INTO usuarios VALUES ('Ana','ana@dev.test',1),('Bruno','bruno@dev.test',0),('Caio','caio@dev.test',1);",
    expected: [['Ana', 'ana@dev.test'], ['Caio', 'caio@dev.test']],
    sortRows: true,
  },
  'sql-beginner-products': {
    setupSql: "CREATE TABLE produtos(nome TEXT); INSERT INTO produtos VALUES ('Teclado'),('Arena'),('Mouse');",
    expected: [['Arena'], ['Mouse'], ['Teclado']],
  },
  'sql-basic-category-count': {
    setupSql: "CREATE TABLE produtos(id INTEGER, categoria TEXT); INSERT INTO produtos VALUES (1,'livros'),(2,'jogos'),(3,'livros');",
    expected: [['jogos', 1], ['livros', 2]],
    sortRows: true,
  },
  'sql-intermediate-orders': {
    setupSql: "CREATE TABLE clientes(id INTEGER, nome TEXT); CREATE TABLE pedidos(id INTEGER, cliente_id INTEGER, total REAL); INSERT INTO clientes VALUES (1,'Ana'),(2,'Beto'); INSERT INTO pedidos VALUES (10,1,50),(11,2,80);",
    expected: [[10, 'Ana', 50], [11, 'Beto', 80]],
    sortRows: true,
  },
  'battle-v1-sql-never-1': {
    setupSql: "CREATE TABLE players(name TEXT, level INTEGER); INSERT INTO players VALUES ('Luna',3),('Kai',7);",
    expected: [['Kai', 7], ['Luna', 3]],
    sortRows: true,
  },
  'battle-v1-sql-never-2': {
    setupSql: "CREATE TABLE players(id INTEGER, name TEXT, level INTEGER, active BOOLEAN); INSERT INTO players VALUES (1,'Luna',3,TRUE),(2,'Kai',7,FALSE);",
    expected: [[1, 'Luna', 3, 1]],
  },
  'battle-v1-sql-basic-1': {
    setupSql: "CREATE TABLE products(id INTEGER, category TEXT); INSERT INTO products VALUES (1,'games'),(2,'books'),(3,'games');",
    expected: [['games', 2], ['books', 1]],
  },
  'battle-v1-sql-basic-2': {
    setupSql: "CREATE TABLE customers(id INTEGER, name TEXT); CREATE TABLE orders(id INTEGER, customer_id INTEGER); INSERT INTO customers VALUES (1,'Ana'),(2,'Beto'); INSERT INTO orders VALUES (8,2),(7,1);",
    expected: [[7, 'Ana'], [8, 'Beto']],
    sortRows: true,
  },
  'battle-v1-sql-intermediate-1': {
    setupSql: "CREATE TABLE players(name TEXT, team_id INTEGER, score INTEGER); INSERT INTO players VALUES ('A',1,20),('B',1,10),('C',2,30),('D',2,30);",
    expected: [['A', 1, 1], ['B', 1, 2], ['C', 2, 1], ['D', 2, 1]],
    sortRows: true,
  },
  'battle-v1-sql-intermediate-2': {
    setupSql: 'CREATE TABLE order_items(order_id INTEGER, price REAL, quantity INTEGER); INSERT INTO order_items VALUES (1,50,3),(2,20,2),(3,60,2);',
    expected: [[1, 150], [3, 120]],
    sortRows: true,
  },
  'battle-v1-sql-advanced-1': {
    setupSql: "CREATE TABLE categories(id INTEGER, parent_id INTEGER, name TEXT); INSERT INTO categories VALUES (1,NULL,'root'),(2,1,'front'),(3,1,'back'),(4,2,'css'),(9,NULL,'outside');",
    expected: [[1, null, 'root'], [2, 1, 'front'], [3, 1, 'back'], [4, 2, 'css']],
    sortRows: true,
  },
  'battle-v1-sql-advanced-3': {
    setupSql: "CREATE TABLE preferences(player_id INTEGER PRIMARY KEY, theme TEXT); INSERT INTO preferences VALUES (1,'light');",
    verificationSql: 'SELECT player_id, theme FROM preferences WHERE player_id = 1;',
    expected: [[1, 'dark']],
  },
}

const htmlRules = {
  'html-css-never-hello': ['<h1[^>]*>\\s*hello,\\s*world!\\s*</h1>'],
  'html-css-beginner-button': ['<button[^>]*class=["\\x27][^"\\x27]*battle-button', 'entrar na batalha', '\\.battle-button\\s*\\{[^}]*background(?:-color)?\\s*:', '\\.battle-button\\s*\\{[^}]*color\\s*:\\s*(?:white|#fff(?:fff)?)', '\\.battle-button\\s*\\{[^}]*padding\\s*:'],
  'html-css-beginner-card': ['<div[^>]*class=["\\x27][^"\\x27]*profile-card', '<h2[^>]*>\\s*dev guerreiro', '<p[^>]*>\\s*nível 1', '\\.profile-card\\s*\\{[^}]*border\\s*:', '\\.profile-card\\s*\\{[^}]*border-radius\\s*:'],
  'html-css-basic-grid': ['<section[^>]*class=["\\x27][^"\\x27]*challenge-grid', '(?:<article[^>]*>[^<]*</article>.*){3}', '\\.challenge-grid\\s*\\{[^}]*display\\s*:\\s*grid', 'grid-template-columns\\s*:\\s*repeat\\(auto-fit,\\s*minmax\\(180px,\\s*1fr\\)\\)', 'gap\\s*:\\s*16px'],
  'html-css-intermediate-form': ['<form[^>]*class=["\\x27][^"\\x27]*contact-form', '<label[^>]*for=["\\x27]name["\\x27]', '<input[^>]*id=["\\x27]name["\\x27][^>]*type=["\\x27]text["\\x27]', '<label[^>]*for=["\\x27]email["\\x27]', '<input[^>]*id=["\\x27]email["\\x27][^>]*type=["\\x27]email["\\x27]', '<button[^>]*type=["\\x27]submit["\\x27]', '\\.contact-form\\s*\\{[^}]*display\\s*:\\s*flex', 'flex-direction\\s*:\\s*column'],
  'battle-v1-html-css-never-1': ['<section[^>]*>', '<h1[^>]*>\\s*arena\\s*</h1>', '<p[^>]*>\\s*treine seu código\\s*</p>'],
  'battle-v1-html-css-never-2': ['<a[^>]*href=["\\x27]/estudos["\\x27][^>]*>\\s*estudar\\s*</a>'],
  'battle-v1-html-css-basic-1': ['<section[^>]*class=["\\x27][^"\\x27]*cards', '(?:<article[^>]*>[^<]*</article>.*){3}', '\\.cards\\s*\\{[^}]*display\\s*:\\s*flex', 'gap\\s*:\\s*16px'],
  'battle-v1-html-css-basic-2': ['<label[^>]*for=["\\x27]email["\\x27]', '<input[^>]*id=["\\x27]email["\\x27][^>]*name=["\\x27]email["\\x27][^>]*type=["\\x27]email["\\x27]'],
  'battle-v1-html-css-intermediate-1': ['\\.grid\\s*\\{[^}]*display\\s*:\\s*grid', 'grid-template-columns\\s*:\\s*repeat\\(auto-fit,\\s*minmax\\(220px,\\s*1fr\\)\\)', 'gap\\s*:\\s*16px'],
  'battle-v1-html-css-intermediate-2': ['<dialog[^>]*open[^>]*aria-labelledby=["\\x27]modal-title["\\x27]', '<h2[^>]*id=["\\x27]modal-title["\\x27][^>]*>\\s*resultado', '<p[^>]*>\\s*desafio concluído'],
  'battle-v1-html-css-advanced-1': ['@layer\\s+reset\\s*,\\s*components', '@layer\\s+reset\\s*\\{', '@layer\\s+components\\s*\\{', '\\.button\\s*\\{[^}]*color\\s*:\\s*gold'],
  'battle-v1-html-css-advanced-2': ['\\.wrapper\\s*\\{[^}]*container-type\\s*:\\s*inline-size', '@container\\s*\\(min-width\\s*:\\s*500px\\)', '\\.card\\s*\\{[^}]*display\\s*:\\s*grid', 'grid-template-columns\\s*:\\s*1fr\\s+1fr'],
  'battle-v1-html-css-advanced-3': ['@keyframes\\s+pulse', '\\.pulse\\s*\\{[^}]*animation\\s*:', '@media\\s*\\(prefers-reduced-motion\\s*:\\s*reduce\\)', '\\.pulse\\s*\\{[^}]*animation\\s*:\\s*none'],
}

function publicAndPrivateTests(challenge) {
  const specialCases = specialFunctionCases[challenge.id]
  if (specialCases) {
    return { publicExamples: specialCases.slice(0, 1), privateTests: specialCases }
  }

  const mappedFunctionCases = functionCases[challenge.id]
  if (mappedFunctionCases || challenge.validationRules?.strategy === 'function') {
    const cases = mappedFunctionCases ?? []
    const mapped = cases.map(({ args, expected }) => ({ input: { args }, expected }))
    return { publicExamples: mapped.slice(0, 1), privateTests: mapped }
  }

  const mappedOutput = programOutputCases[challenge.id]
  if (mappedOutput !== undefined) {
    const test = { input: { stdin: '' }, expected: mappedOutput }
    return { publicExamples: [test], privateTests: [test] }
  }

  if (challenge.validationRules?.strategy === 'output') {
    const test = { input: { stdin: '' }, expected: challenge.expectedOutput }
    return { publicExamples: [test], privateTests: [test] }
  }

  if (challenge.language === 'sql') {
    const sqlCase = sqlCases[challenge.id]
    if (!sqlCase) return { publicExamples: [], privateTests: [] }
    const test = {
      input: {
        setupSql: sqlCase.setupSql,
        ...(sqlCase.verificationSql ? { verificationSql: sqlCase.verificationSql } : {}),
      },
      expected: sqlCase.expected,
      validatorConfig: { sortRows: Boolean(sqlCase.sortRows) },
    }
    return { publicExamples: [test], privateTests: [test] }
  }

  const required = htmlRules[challenge.id] ?? []
  const test = {
    input: {},
    expected: null,
    validatorConfig: {
      required: required.map((pattern) => ({ description: 'estrutura obrigatória', anyOf: [pattern] })),
      forbidden: [
        { description: 'scripts não são permitidos', anyOf: ['<script\\b', 'on[a-z]+\\s*=', 'javascript\\s*:'] },
      ],
    },
  }
  return { publicExamples: [test], privateTests: [test] }
}

function validationType(challenge) {
  if (challenge.language === 'sql') return 'sql_result'
  if (challenge.language === 'html-css') return 'html_css_structure'
  return challenge.validationRules?.strategy === 'function' ||
    functionCases[challenge.id] || specialFunctionCases[challenge.id]
    ? 'function_tests'
    : 'program_output'
}

const catalog = await loadCatalog()
const publicRows = []
const privateRows = []
const judgeRows = []

for (const challenge of catalog) {
  const supported = !unsupported.has(challenge.id)
  const { publicExamples, privateTests } = publicAndPrivateTests(challenge)
  const isActive = supported && privateTests.length > 0
  publicRows.push({
    slug: challenge.id,
    language: challenge.language,
    difficulty: challenge.difficulty,
    title: challenge.title,
    statement: challenge.statement,
    instructions: challenge.instructions,
    starter_code: challenge.starterCode,
    public_examples: isActive
      ? publicExamples.map(({ validatorConfig, ...example }) => example)
      : [],
    validation_type: validationType(challenge),
    judge_config: specialHarnesses[challenge.id] ?? (
      challenge.validationRules?.functionName
        ? { functionName: challenge.validationRules.functionName }
        : functionCases[challenge.id]
          ? { functionName: challenge.starterCode.match(/(?:def|function)\s+([A-Za-z_$][\w$]*)/)?.[1] }
          : {}
    ),
    is_active: isActive,
  })

  if (isActive) {
    publicExamples.forEach((test, index) => judgeRows.push({
      slug: challenge.id,
      is_public: true,
      ordinal: index + 1,
      input: test.input,
      expected: test.expected,
      validator_config: test.validatorConfig ?? {},
      weight: 1,
    }))
    privateTests.forEach((test, index) => {
      const row = {
        slug: challenge.id,
        is_public: false,
        ordinal: index + 1,
        input: test.input,
        expected: test.expected,
        validator_config: test.validatorConfig ?? {},
        weight: 1,
      }
      privateRows.push(row)
      judgeRows.push(row)
    })
  }
}

const generatedSql = `-- CHALLENGE_SEED_GENERATED_START
insert into public.multiplayer_challenges (
  slug, language, difficulty, title, statement, instructions, starter_code,
  public_examples, validation_type, judge_config, is_active
)
select
  seed.slug,
  seed.language::public.room_language,
  seed.difficulty::public.room_difficulty,
  seed.title,
  seed.statement,
  seed.instructions,
  seed.starter_code,
  seed.public_examples,
  seed.validation_type::public.multiplayer_validation_type,
  seed.judge_config,
  seed.is_active
from jsonb_to_recordset($catalog$${JSON.stringify(publicRows)}$catalog$::jsonb) as seed(
  slug text,
  language text,
  difficulty text,
  title text,
  statement text,
  instructions jsonb,
  starter_code text,
  public_examples jsonb,
  validation_type text,
  judge_config jsonb,
  is_active boolean
);

insert into devroyale_private.multiplayer_challenge_tests (
  challenge_id, is_public, ordinal, input, expected, validator_config, weight
)
select
  challenges.id,
  seed.is_public,
  seed.ordinal,
  seed.input,
  seed.expected,
  seed.validator_config,
  seed.weight
from jsonb_to_recordset($tests$${JSON.stringify(judgeRows)}$tests$::jsonb) as seed(
  slug text,
  is_public boolean,
  ordinal smallint,
  input jsonb,
  expected jsonb,
  validator_config jsonb,
  weight smallint
)
join public.multiplayer_challenges as challenges on challenges.slug = seed.slug;
-- CHALLENGE_SEED_GENERATED_END`

const migration = fs.readFileSync(migrationPath, 'utf8')
const hasGeneratedMarker = migration.includes('-- CHALLENGE_SEED_GENERATED_START')
const hasPlaceholder = migration.includes('-- CHALLENGE_SEED_GENERATED_HERE')

if (!hasGeneratedMarker && !hasPlaceholder) {
  throw new Error('Challenge seed marker not found')
}

const nextMigration = hasGeneratedMarker
  ? migration.replace(
      /-- CHALLENGE_SEED_GENERATED_START[\s\S]*?-- CHALLENGE_SEED_GENERATED_END/,
      generatedSql,
    )
  : migration.replace('-- CHALLENGE_SEED_GENERATED_HERE', generatedSql)

if (nextMigration !== migration) fs.writeFileSync(migrationPath, nextMigration)
console.log(`${nextMigration === migration ? 'Verified' : 'Generated'} ${publicRows.length} challenges, ${publicRows.filter((row) => row.is_active).length} active, ${privateRows.length} hidden and ${judgeRows.length - privateRows.length} public judge tests.`)
