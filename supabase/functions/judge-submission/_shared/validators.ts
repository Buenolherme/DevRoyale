import type {
  BattleDifficulty,
  ChallengeTest,
  JudgeExecutionRequest,
  JudgeExecutionResult,
  JudgePayload,
  ValidationOutcome,
  ValidatorConfig,
} from './types.ts'

const SQL_FORBIDDEN = /\b(?:attach|detach|pragma|vacuum|load_extension|drop|alter)\b/i

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    )
  }
  return value
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function normalizeOutput(value: string): string {
  return value.replace(/\r\n?/g, '\n').trimEnd()
}

function normalizeNearMiss(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, '')
}

function safeDiagnostic(result: JudgeExecutionResult): string {
  return (result.compileOutput || result.stderr || result.message)
    .split('\n')
    .filter((line) => !line.includes('__devroyale'))
    .join('\n')
    .slice(0, 1500)
}

export function mapExecutionFailure(result: JudgeExecutionResult): ValidationOutcome | null {
  if (result.statusId === 3) return null
  if (result.statusId === 5) {
    return { status: 'time_limit', message: 'Tempo de execução excedido.' }
  }
  if (result.statusId === 6) {
    return {
      status: 'compile_error',
      message: safeDiagnostic(result) || 'O código não pôde ser compilado.',
    }
  }
  if (result.statusId >= 7 && result.statusId <= 12) {
    return {
      status: 'runtime_error',
      message: safeDiagnostic(result) || 'O código encontrou um erro durante a execução.',
    }
  }
  return {
    status: 'internal_error',
    message: 'O avaliador da Arena está temporariamente indisponível. Tente novamente.',
  }
}

export function buildExecutionRequest(
  payload: JudgePayload,
  test: ChallengeTest,
): JudgeExecutionRequest {
  if (payload.validationType === 'program_output') {
    return {
      language: payload.language === 'javascript' ? 'javascript' : 'python',
      sourceCode: payload.sourceCode,
      stdin: typeof test.input.stdin === 'string' ? test.input.stdin : '',
    }
  }

  if (payload.validationType === 'function_tests') {
    const functionName = payload.judgeConfig.functionName
    if (!functionName || !/^[A-Za-z_$][\w$]*$/.test(functionName)) {
      throw new Error('function_name_invalid')
    }
    const args = Array.isArray(test.input.args) ? test.input.args : []

    if (payload.judgeConfig.harness === 'javascript_concurrency_queue') {
      const tasks = Array.isArray(test.input.tasks) ? test.input.tasks : []
      return {
        language: 'javascript',
        sourceCode: `${payload.sourceCode}\n\nconst __devroyaleTaskSpecs = ${JSON.stringify(tasks)};\nlet __devroyaleActive = 0;\nlet __devroyaleMaxActive = 0;\nconst __devroyaleTasks = __devroyaleTaskSpecs.map(({ value, delayMs }) => () => new Promise((resolve) => {\n  __devroyaleActive += 1;\n  __devroyaleMaxActive = Math.max(__devroyaleMaxActive, __devroyaleActive);\n  setTimeout(() => { __devroyaleActive -= 1; resolve(value); }, delayMs);\n}));\nPromise.resolve(${functionName}(__devroyaleTasks))\n  .then((results) => console.log(JSON.stringify({ results, withinLimit: __devroyaleMaxActive <= 2 })))\n  .catch((error) => { console.error(error); process.exitCode = 1; });\n`,
      }
    }

    if (payload.judgeConfig.harness === 'javascript_memoization') {
      const invocations = Array.isArray(test.input.invocations) ? test.input.invocations : []
      return {
        language: 'javascript',
        sourceCode: `${payload.sourceCode}\n\nconst __devroyaleInvocations = ${JSON.stringify(invocations)};\nlet __devroyaleCalls = 0;\nconst __devroyaleMemoized = ${functionName}((...values) => {\n  __devroyaleCalls += 1;\n  return values.reduce((total, value) => total + value, 0);\n});\nconst __devroyaleResults = __devroyaleInvocations.map((values) => __devroyaleMemoized(...values));\nconsole.log(JSON.stringify({ results: __devroyaleResults, calls: __devroyaleCalls }));\n`,
      }
    }

    if (payload.language === 'python') {
      const encodedArgs = JSON.stringify(JSON.stringify(args))
      return {
        language: 'python',
        sourceCode: `${payload.sourceCode}\n\nimport json as __devroyale_json\n__devroyale_args = __devroyale_json.loads(${encodedArgs})\n__devroyale_result = ${functionName}(*__devroyale_args)\nprint(__devroyale_json.dumps(__devroyale_result, ensure_ascii=False, sort_keys=True, separators=(',', ':')))\n`,
      }
    }

    return {
      language: 'javascript',
      sourceCode: `${payload.sourceCode}\n\nconst __devroyaleArgs = ${JSON.stringify(args)};\nPromise.resolve(${functionName}(...__devroyaleArgs))\n  .then((result) => console.log(JSON.stringify(result)))\n  .catch((error) => { console.error(error); process.exitCode = 1; });\n`,
    }
  }

  if (payload.validationType === 'sql_result') {
    if (SQL_FORBIDDEN.test(payload.sourceCode)) throw new Error('sql_validation_error')
    const setupSql = typeof test.input.setupSql === 'string' ? test.input.setupSql : ''
    const verificationSql = typeof test.input.verificationSql === 'string'
      ? test.input.verificationSql
      : ''
    const playerSql = JSON.stringify(payload.sourceCode)
    return {
      language: 'python',
      sourceCode: `import json\nimport sqlite3\n\n__devroyale_db = sqlite3.connect(':memory:')\n__devroyale_db.executescript(${JSON.stringify(setupSql)})\n${verificationSql ? `__devroyale_db.executescript(${playerSql})\n__devroyale_cursor = __devroyale_db.execute(${JSON.stringify(verificationSql)})\n__devroyale_rows = __devroyale_cursor.fetchall()\n` : `__devroyale_cursor = __devroyale_db.execute(${playerSql})\n__devroyale_rows = __devroyale_cursor.fetchall() if __devroyale_cursor.description else []\n`}print(json.dumps(__devroyale_rows, ensure_ascii=False, separators=(',', ':')))\n`,
    }
  }

  throw new Error('unsupported_external_validation')
}

export function compareExecution(
  result: JudgeExecutionResult,
  test: ChallengeTest,
  validationType: JudgePayload['validationType'],
  difficulty: BattleDifficulty,
): ValidationOutcome {
  const executionFailure = mapExecutionFailure(result)
  if (executionFailure) return executionFailure

  let actual = normalizeOutput(result.stdout)
  let expected = typeof test.expected === 'string'
    ? normalizeOutput(test.expected)
    : canonicalJson(test.expected)

  if (validationType === 'function_tests' || validationType === 'sql_result') {
    try {
      let actualValue = JSON.parse(actual) as unknown
      let expectedValue = test.expected
      if (validationType === 'sql_result' && test.validatorConfig?.sortRows) {
        const sort = (rows: unknown) => Array.isArray(rows)
          ? [...rows].sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))
          : rows
        actualValue = sort(actualValue)
        expectedValue = sort(expectedValue)
      }
      actual = canonicalJson(actualValue)
      expected = canonicalJson(expectedValue)
    } catch {
      return {
        status: 'wrong_answer',
        message: 'A saída da solução não possui o formato esperado.',
        stdout: result.stdout,
      }
    }
  }

  if (actual === expected) {
    return {
      status: 'accepted',
      message: 'Solução aceita.',
      stdout: result.stdout,
      executionTime: result.time,
      memoryUsed: result.memory,
    }
  }

  const nearMiss = difficulty === 'never' || difficulty === 'basic'
    ? normalizeNearMiss(actual) === normalizeNearMiss(expected)
    : false
  return {
    status: 'wrong_answer',
    message: nearMiss
      ? 'Você está muito perto: revise espaços, capitalização ou pontuação.'
      : 'Alguns testes ainda falharam.',
    stdout: result.stdout,
    executionTime: result.time,
    memoryUsed: result.memory,
  }
}

function matchesAny(source: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    try {
      return new RegExp(pattern, 'isu').test(source)
    } catch {
      return false
    }
  })
}

export function validateHtmlCss(source: string, config: ValidatorConfig = {}): ValidationOutcome {
  const forbidden = config.forbidden?.find((rule) => matchesAny(source, rule.anyOf))
  if (forbidden) {
    return {
      status: 'validation_error',
      message: `Conteúdo não permitido: ${forbidden.description}.`,
    }
  }

  const missing = config.required?.find((rule) => !matchesAny(source, rule.anyOf))
  if (missing) {
    return {
      status: 'wrong_answer',
      message: 'A estrutura ainda não atende a todos os requisitos do desafio.',
    }
  }

  return { status: 'accepted', message: 'Estrutura HTML/CSS aceita.' }
}
