import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const migration = fs.readFileSync(
  new URL('../supabase/migrations/20260814020000_real_multiplayer_battles.sql', import.meta.url),
  'utf8',
)

function parseDollarJson(tag) {
  const match = migration.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`))
  assert(match, `Bloco JSON $${tag}$ ausente`)
  return JSON.parse(match[1])
}

const catalog = parseDollarJson('catalog')
const judgeTests = parseDollarJson('tests')
const privateTests = judgeTests.filter((test) => !test.is_public)
const publicJudgeTests = judgeTests.filter((test) => test.is_public)
const activeCatalog = catalog.filter((challenge) => challenge.is_active)
const inactiveSlugs = catalog
  .filter((challenge) => !challenge.is_active)
  .map((challenge) => challenge.slug)
  .sort()

assert.equal(catalog.length, 56, 'O catálogo V1.5 deve continuar com 56 entradas')
assert.equal(activeCatalog.length, 52, 'A porta multiplayer deve manter 52 desafios ativos')
assert.equal(privateTests.length, 66, 'A migration deve conter 66 casos privados sem duplicatas desnecessárias')
assert.equal(publicJudgeTests.length, 52, 'Cada desafio ativo deve ter um caso público server-side')
assert.deepEqual(inactiveSlugs, [
  'battle-v1-javascript-advanced-3',
  'battle-v1-javascript-intermediate-2',
  'battle-v1-python-advanced-2',
  'battle-v1-sql-advanced-2',
])

for (const language of ['python', 'javascript', 'sql', 'html-css']) {
  for (const difficulty of ['never', 'basic', 'intermediate', 'advanced']) {
    assert(
      activeCatalog.some((challenge) => (
        challenge.language === language && challenge.difficulty === difficulty
      )),
      `Pool vazia: ${language}/${difficulty}`,
    )
  }
}

for (const challenge of catalog) {
  assert(!('expected' in challenge), `Expected privado vazou no catálogo: ${challenge.slug}`)
  assert(!('referenceSolution' in challenge), `Solução vazou no catálogo: ${challenge.slug}`)
  assert(
    challenge.public_examples.every((example) => !('validatorConfig' in example)),
    `Validator config vazou no catálogo: ${challenge.slug}`,
  )
}

function testFingerprint(test) {
  return JSON.stringify({
    input: test.input,
    expected: test.expected,
    validator_config: test.validator_config,
  })
}

const challengesWithoutDistinctHiddenCase = activeCatalog
  .filter((challenge) => {
    const publicFingerprints = publicJudgeTests
      .filter((test) => test.slug === challenge.slug)
      .map(testFingerprint)
    return privateTests
      .filter((test) => test.slug === challenge.slug)
      .every((test) => publicFingerprints.includes(testFingerprint(test)))
  })
  .map((challenge) => challenge.slug)
  .sort()

assert.deepEqual(challengesWithoutDistinctHiddenCase, [
  'battle-v1-html-css-never-2',
  'battle-v1-javascript-never-1',
  'battle-v1-javascript-never-2',
  'battle-v1-python-never-1',
  'battle-v1-python-never-2',
  'html-css-never-hello',
  'javascript-never-hello',
  'python-never-hello',
  'sql-never-hello',
])

assert.match(migration, /set status = 'in_match', countdown_started_at = null/)
assert.match(migration, /battle-rate:/)
assert.match(migration, /claim_stale_multiplayer_submission_internal/)
assert.match(migration, /for update of submissions skip locked/)

const validatorSource = fs.readFileSync(
  new URL('../supabase/functions/judge-submission/_shared/validators.ts', import.meta.url),
  'utf8',
)
const validatorJavaScript = ts.transpileModule(validatorSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const validators = await import(
  `data:text/javascript;base64,${Buffer.from(validatorJavaScript).toString('base64')}`
)

assert.equal(
  validators.validateHtmlCss('<main>ok</main><script>alert(1)</script>', {
    forbidden: [{ description: 'scripts', anyOf: ['<script\\b'] }],
  }).status,
  'validation_error',
  'HTML com script precisa ser rejeitado sem execução',
)
assert.equal(
  validators.validateHtmlCss('<main class="arena">ok</main>', {
    required: [{ description: 'arena', anyOf: ['<main[^>]*class="arena"'] }],
  }).status,
  'accepted',
)
assert.equal(
  validators.validateHtmlCss('<a href="java&#x73;cript&#58;alert(1)">x</a>').status,
  'validation_error',
  'Entidades HTML não podem contornar a proibição de javascript:',
)
assert.equal(
  validators.validateHtmlCss('<svg onload = "alert(1)"></svg>').status,
  'validation_error',
  'Event handlers não podem contornar o validator',
)

const basePayload = {
  submissionId: '00000000-0000-4000-8000-000000000001',
  matchId: '00000000-0000-4000-8000-000000000002',
  roundId: '00000000-0000-4000-8000-000000000003',
  userId: '00000000-0000-4000-8000-000000000004',
  mode: 'submit',
  difficulty: 'advanced',
  tests: [],
}

const sqlRequest = validators.buildExecutionRequest({
  ...basePayload,
  sourceCode: 'select value from sample;',
  language: 'sql',
  validationType: 'sql_result',
  judgeConfig: {},
}, {
  input: { setupSql: 'create table sample(value text);' },
  expected: [],
})
assert.equal(sqlRequest.language, 'python')
assert.match(sqlRequest.sourceCode, /sqlite3\.connect\(':memory:'\)/)
assert.doesNotMatch(sqlRequest.sourceCode, /supabase|postgres/i)
assert.throws(() => validators.buildExecutionRequest({
  ...basePayload,
  sourceCode: "ATTACH DATABASE 'outside.db' AS outside;",
  language: 'sql',
  validationType: 'sql_result',
  judgeConfig: {},
}, { input: {}, expected: [] }), /sql_validation_error/)

const queueRequest = validators.buildExecutionRequest({
  ...basePayload,
  sourceCode: 'async function executar(tarefas) { return Promise.all(tarefas.map(t => t())) }',
  language: 'javascript',
  validationType: 'function_tests',
  judgeConfig: { functionName: 'executar', harness: 'javascript_concurrency_queue' },
}, {
  input: { tasks: [{ value: 'A', delayMs: 1 }] },
  expected: { results: ['A'], withinLimit: true },
})
assert.match(queueRequest.sourceCode, /__devroyaleMaxActive <= 2/)

const nearMiss = validators.compareExecution({
  token: 'local',
  statusId: 3,
  statusDescription: 'Accepted',
  stdout: 'ola luna',
  stderr: '',
  compileOutput: '',
  message: '',
  time: 0.01,
  memory: 1024,
}, { input: {}, expected: 'Olá, Luna!' }, 'program_output', 'basic')
assert.equal(nearMiss.status, 'wrong_answer')
assert.match(nearMiss.message, /muito perto/i)

const secretInput = 'HIDDEN-ARGUMENT-DO-NOT-LEAK'
const hiddenRuntimeError = validators.sanitizeSubmissionOutcome({
  status: 'runtime_error',
  message: `Error: ${secretInput}`,
  stdout: secretInput,
  executionTime: 0.01,
  memoryUsed: 1024,
}, 'submit')
assert.doesNotMatch(JSON.stringify(hiddenRuntimeError), new RegExp(secretInput))
assert.equal(hiddenRuntimeError.message, 'Sua solução encontrou um erro durante os testes.')
assert.equal(hiddenRuntimeError.stdout, undefined)

console.log('Multiplayer judge checks: 56 catalog, 52 active, 66 private tests, 43 challenges with distinct hidden cases, sanitizer and recovery invariants OK.')
