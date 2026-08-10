import type {
  BattleChallenge,
  BattleLanguage,
  BattlePatternRule,
  BattleValidationStrategy,
} from '@/types'

export interface BattleValidationResult {
  isValid: boolean
  message?: string
}

interface FunctionSignature {
  name: string
  parameters: string[]
}

interface ExplicitTechniqueRule {
  instruction: RegExp
  code: RegExp
  description: string
}

const EMPTY_EDITOR_PLACEHOLDER = 'DIGITE SEU CÓDIGO AQUI'

const explicitTechniqueRules: ExplicitTechniqueRule[] = [
  {
    instruction: /use (?:a função )?print\b/i,
    code: /\bprint\s*\(/i,
    description: 'Use a função print, como solicitado.',
  },
  {
    instruction: /use console\.log\b/i,
    code: /\bconsole\s*\.\s*log\s*\(/i,
    description: 'Use console.log, como solicitado.',
  },
  {
    instruction: /use const\b/i,
    code: /\bconst\b/i,
    description: 'Declare o valor com const, como solicitado.',
  },
  {
    instruction: /use (?:uma condição com )?if\b/i,
    code: /\bif\s*\(?/i,
    description: 'Use uma condição if, como solicitado.',
  },
  {
    instruction: /use filter\b/i,
    code: /\.filter\s*\(/i,
    description: 'Use filter, como solicitado.',
  },
  {
    instruction: /use reduce\b/i,
    code: /\.reduce\s*\(/i,
    description: 'Use reduce, como solicitado.',
  },
  {
    instruction: /use trim\b/i,
    code: /\.trim\s*\(/i,
    description: 'Use trim, como solicitado.',
  },
  {
    instruction: /use toLowerCase\b/i,
    code: /\.toLowerCase\s*\(/i,
    description: 'Use toLowerCase, como solicitado.',
  },
  {
    instruction: /use async\s*\/\s*await\b/i,
    code: /\basync\b[\s\S]*\bawait\b/i,
    description: 'Use async/await, como solicitado.',
  },
  {
    instruction: /use await\b/i,
    code: /\bawait\b/i,
    description: 'Use await, como solicitado.',
  },
  {
    instruction: /use (?:o comando )?select\b/i,
    code: /\bselect\b/i,
    description: 'Use SELECT, como solicitado.',
  },
  {
    instruction: /use where\b/i,
    code: /\bwhere\b/i,
    description: 'Use WHERE, como solicitado.',
  },
  {
    instruction: /use (?:inner )?join\b/i,
    code: /\bjoin\b/i,
    description: 'Use JOIN, como solicitado.',
  },
  {
    instruction: /use rank\b/i,
    code: /\brank\s*\(/i,
    description: 'Use RANK, como solicitado.',
  },
  {
    instruction: /use percentile_cont\b/i,
    code: /\bpercentile_cont\s*\(/i,
    description: 'Use PERCENTILE_CONT, como solicitado.',
  },
  {
    instruction: /use with\b/i,
    code: /\bwith\b/i,
    description: 'Use WITH, como solicitado.',
  },
  {
    instruction: /use uma transação\b/i,
    code: /\bbegin\b[\s\S]*\bcommit\b/i,
    description: 'Use uma transação com BEGIN e COMMIT, como solicitado.',
  },
  {
    instruction: /use (?:css )?grid\b/i,
    code: /display\s*:\s*grid/i,
    description: 'Use CSS Grid, como solicitado.',
  },
  {
    instruction: /use flexbox\b/i,
    code: /display\s*:\s*flex/i,
    description: 'Use Flexbox, como solicitado.',
  },
  {
    instruction: /use dialog\b/i,
    code: /<\s*dialog\b/i,
    description: 'Use o elemento dialog, como solicitado.',
  },
]

function normalizeQuotes(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/["']/g, '"')
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .trim()
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizeHtmlCss(value: string): string {
  return value
    .replace(/>\s+</g, '><')
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .replace(/<\s+/g, '<')
    .replace(/\s+>/g, '>')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*,\s*/g, ',')
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function stripComments(value: string, language: BattleLanguage): string {
  if (language === 'python') {
    return value.replace(/^\s*#.*$/gm, '')
  }

  if (language === 'sql') {
    return value
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
  }

  if (language === 'html-css') {
    return value
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
  }

  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function hasMeaningfulCode(answer: string, language: BattleLanguage): boolean {
  const meaningfulAnswer = stripComments(answer, language)
    .replace(new RegExp(EMPTY_EDITOR_PLACEHOLDER, 'gi'), '')
    .replace(/\b(?:pass|todo)\b/gi, '')
    .replace(/[\s;{}()[\]]/g, '')

  return meaningfulAnswer.length > 0
}

function looksLikeSelectedLanguage(answer: string, language: BattleLanguage): boolean {
  const source = stripComments(answer, language).trim()
  if (!source) return false

  if (language === 'sql') {
    return /^(?:begin\b[\s\S]*)?(?:with|select|insert|update|delete|begin)\b/i.test(source)
  }

  if (language === 'html-css') {
    return /<\/?[a-z][^>]*>|(?:^|})\s*(?:[.#:@a-z][^{]*)\s*{/i.test(source)
  }

  const beginsAsSql = /^(?:with|select|insert|update|delete|begin)\b/i.test(source)
  const containsMarkup = /<\/?(?:html|body|section|article|div|h\d|p|button|form|input|label)\b/i.test(source)
  if (beginsAsSql || containsMarkup) return false

  if (language === 'python') {
    if (/\bfunction\s+[a-z_$]|\b(?:const|let|var)\s+[a-z_$]|console\s*\.\s*log|=>/i.test(source)) {
      return false
    }

    return /\b(?:def|print|return|for|while|if|import|from|class|lambda)\b|^[a-z_]\w*\s*=/im.test(source)
  }

  if (/\bdef\s+[a-z_]\w*\s*\(|\bprint\s*\(/i.test(source)) return false

  return /\b(?:function|const|let|var|return|for|while|if|async|await|console)\b|=>/i.test(source)
}

function matchesPattern(source: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, 'iu').test(source)
  } catch {
    return source.toLowerCase().includes(pattern.toLowerCase())
  }
}

function validatePatternRules(
  answer: string,
  requiredPatterns: BattlePatternRule[] = [],
  forbiddenPatterns: BattlePatternRule[] = [],
): BattleValidationResult | null {
  const forbiddenRule = forbiddenPatterns.find((rule) =>
    rule.anyOf.some((pattern) => matchesPattern(answer, pattern)),
  )
  if (forbiddenRule) {
    return {
      isValid: false,
      message: `A solução usa algo não permitido: ${forbiddenRule.description}`,
    }
  }

  const missingRule = requiredPatterns.find((rule) =>
    !rule.anyOf.some((pattern) => matchesPattern(answer, pattern)),
  )
  if (missingRule) {
    return {
      isValid: false,
      message: `Revise esta restrição do desafio: ${missingRule.description}`,
    }
  }

  return null
}

function validateExplicitTechniques(
  answer: string,
  challenge: BattleChallenge,
): BattleValidationResult | null {
  const instructions = challenge.instructions.join(' ')
  const missingTechnique = explicitTechniqueRules.find(
    (rule) => rule.instruction.test(instructions) && !rule.code.test(answer),
  )

  if (missingTechnique) {
    return { isValid: false, message: missingTechnique.description }
  }

  if (/não compare null com\s*=/i.test(instructions) && /=\s*null\b/i.test(answer)) {
    return {
      isValid: false,
      message: 'Use IS NULL; o desafio não permite comparar NULL com =.',
    }
  }

  return null
}

function resolveStrategy(challenge: BattleChallenge): BattleValidationStrategy {
  if (challenge.validationRules?.strategy) return challenge.validationRules.strategy
  if (challenge.language === 'sql') return 'query'
  if (challenge.language === 'html-css') return 'markup'

  const referenceSolution = challenge.referenceSolution ?? challenge.expectedAnswer
  const isFunction =
    challenge.language === 'python'
      ? /(?:async\s+)?def\s+[a-zA-Z_]\w*\s*\(/.test(referenceSolution)
      : /(?:async\s+)?function\s+[a-zA-Z_$][\w$]*\s*\(/.test(referenceSolution)

  return isFunction ? 'function' : 'output'
}

function extractFunctionSignature(
  source: string,
  language: BattleLanguage,
  preferredName?: string,
): FunctionSignature | null {
  if (language === 'python') {
    const functionMatch = source.match(/(?:async\s+)?def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*:/)
    if (functionMatch) {
      return {
        name: functionMatch[1],
        parameters: functionMatch[2].split(',').map((value) => value.trim()).filter(Boolean),
      }
    }

    if (preferredName) {
      const lambdaPattern = new RegExp(`${preferredName}\\s*=\\s*lambda\\s*([^:]*):`, 'i')
      const lambdaMatch = source.match(lambdaPattern)
      if (lambdaMatch) {
        return {
          name: preferredName,
          parameters: lambdaMatch[1].split(',').map((value) => value.trim()).filter(Boolean),
        }
      }
    }

    return null
  }

  const functionMatch = source.match(/(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)/)
  if (functionMatch) {
    return {
      name: functionMatch[1],
      parameters: functionMatch[2].split(',').map((value) => value.trim()).filter(Boolean),
    }
  }

  if (preferredName) {
    const escapedName = preferredName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const arrowPattern = new RegExp(
      `(?:const|let|var)\\s+${escapedName}\\s*=\\s*(?:async\\s*)?(?:\\(([^)]*)\\)|([a-zA-Z_$][\\w$]*))\\s*=>`,
      'i',
    )
    const arrowMatch = source.match(arrowPattern)
    if (arrowMatch) {
      const parameters = arrowMatch[1] ?? arrowMatch[2] ?? ''
      return {
        name: preferredName,
        parameters: parameters.split(',').map((value) => value.trim()).filter(Boolean),
      }
    }
  }

  return null
}

function countOccurrences(source: string, value: string): number {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return source.match(new RegExp(`\\b${escapedValue}\\b`, 'g'))?.length ?? 0
}

function validateFunctionSolution(
  answer: string,
  challenge: BattleChallenge,
): BattleValidationResult {
  const referenceSolution = challenge.referenceSolution ?? challenge.expectedAnswer
  const referenceSignature = extractFunctionSignature(
    referenceSolution,
    challenge.language,
    challenge.validationRules?.functionName,
  )
  const requiredFunctionName =
    challenge.validationRules?.functionName ?? referenceSignature?.name
  const answerSignature = extractFunctionSignature(
    answer,
    challenge.language,
    requiredFunctionName,
  )

  if (!answerSignature) {
    return {
      isValid: false,
      message: requiredFunctionName
        ? `Crie a função ${requiredFunctionName} para resolver este desafio.`
        : 'Crie a função solicitada no enunciado.',
    }
  }

  if (requiredFunctionName && answerSignature.name !== requiredFunctionName) {
    return {
      isValid: false,
      message: `Mantenha o nome da função como ${requiredFunctionName}.`,
    }
  }

  if (
    referenceSignature &&
    answerSignature.parameters.length !== referenceSignature.parameters.length
  ) {
    return {
      isValid: false,
      message: `A função deve receber ${referenceSignature.parameters.length} parâmetro(s).`,
    }
  }

  const meaningfulSource = stripComments(answer, challenge.language)
  const referenceReturnsValue = /\breturn\b/.test(referenceSolution)
  const hasImplicitReturn =
    challenge.language === 'python'
      ? /\blambda\b/.test(meaningfulSource)
      : /=>\s*(?!\{)[^\n;]+/.test(meaningfulSource)
  if (
    referenceReturnsValue &&
    !/\breturn\b/.test(meaningfulSource) &&
    !hasImplicitReturn
  ) {
    return {
      isValid: false,
      message: 'A função precisa retornar o resultado solicitado.',
    }
  }

  if (/\breturn\s+(?:none|null|undefined)\s*;?\s*}?\s*$/i.test(meaningfulSource)) {
    return {
      isValid: false,
      message: 'A função ainda não retorna um resultado válido para o desafio.',
    }
  }

  const prompt = normalizeSearchText(
    [challenge.title, challenge.statement, ...challenge.instructions].join(' '),
  )
  const semanticRules: Array<{
    prompt: RegExp
    code: RegExp
    description: string
  }> = [
    {
      prompt: /invert|ordem inversa/,
      code: /\[\s*::\s*-1\s*\]|\breversed\b|\.reverse\s*\(|\bfor\b|\bwhile\b/i,
      description: 'inverter a ordem dos valores',
    },
    {
      prompt: /somar|soma|total|carrinho/,
      code: /\+|\bsum\s*\(|\.reduce\s*\(|\bfor\b|\bwhile\b/i,
      description: 'calcular a soma solicitada',
    },
    {
      prompt: /dobro|triplo/,
      code: /\*|\+/,
      description: 'calcular o múltiplo solicitado',
    },
    {
      prompt: /saudacao|saudar/,
      code: /ola|olá|\+|`/i,
      description: 'montar a saudação solicitada',
    },
    {
      prompt: /media/,
      code: /\/|\bmean\s*\(|\bstatistics\b/i,
      description: 'calcular a média dos valores',
    },
    {
      prompt: /vogal/,
      code: /aeiou|vogal/i,
      description: 'identificar as vogais consideradas',
    },
    {
      prompt: /duplicad|sem valores repetidos/,
      code: /\bset\s*\(|\bSet\s*\(|\.filter\s*\(|\.reduce\s*\(|\bfor\b|\bwhile\b/i,
      description: 'remover valores repetidos',
    },
    {
      prompt: /numeros pares|filtrar pares/,
      code: /%\s*2|\.filter\s*\(|\bfor\b|\bwhile\b/i,
      description: 'identificar números pares',
    },
    {
      prompt: /contagem regressiva/,
      code: /\brange\s*\(|\bfor\b|\bwhile\b|\.reverse\s*\(/i,
      description: 'construir a contagem regressiva',
    },
    {
      prompt: /frequencia|agrupar|agrup|quantas vezes/,
      code: /\bfor\b|\.reduce\s*\(|\bCounter\b|\bMap\b|\.get\s*\(|\[[^\]]+\]\s*=/i,
      description: 'acumular os valores por chave',
    },
    {
      prompt: /assincron|coroutine|requisi|concorrencia/,
      code: /\basync\b|\bawait\b|\bPromise\b|\bgather\s*\(/i,
      description: 'tratar a operação assíncrona',
    },
    {
      prompt: /imutavel|sem alterar o objeto original|nao altere os argumentos/,
      code: /\.\.\.|\.copy\s*\(|\bcopy\b|Object\.assign|structuredClone|\{\s*\*\*/i,
      description: 'preservar os dados recebidos',
    },
    {
      prompt: /cache|memoiz/,
      code: /\bcache\b|\bMap\b|lru_cache|memo/i,
      description: 'armazenar resultados no cache',
    },
  ]

  const missingSemanticRule = semanticRules.find(
    (rule) => rule.prompt.test(prompt) && !rule.code.test(meaningfulSource),
  )
  if (missingSemanticRule) {
    return {
      isValid: false,
      message: `A solução ainda não demonstra como ${missingSemanticRule.description}.`,
    }
  }

  if (/use recursao/.test(prompt) && requiredFunctionName) {
    if (countOccurrences(meaningfulSource, requiredFunctionName) < 2) {
      return {
        isValid: false,
        message: 'O desafio exige recursão; a função deve chamar a si mesma.',
      }
    }
  }

  return { isValid: true }
}

function extractOutputExpression(answer: string, language: BattleLanguage): string | null {
  const pattern =
    language === 'python'
      ? /\bprint\s*\(([\s\S]*?)\)\s*(?:\n|$)/i
      : /\bconsole\s*\.\s*log\s*\(([\s\S]*?)\)\s*;?/i

  return answer.match(pattern)?.[1]?.trim() ?? null
}

function extractStringAssignments(source: string): Map<string, string> {
  const assignments = new Map<string, string>()
  const pattern = /(?:\b(?:const|let|var)\s+)?([a-zA-Z_$][\w$]*)\s*=\s*[fF]?(["'`])([\s\S]*?)\2\s*;?/g

  for (const match of source.matchAll(pattern)) {
    assignments.set(match[1], match[3])
  }

  return assignments
}

function resolveTextExpression(expression: string, source: string): string | null {
  const assignments = extractStringAssignments(source)
  const normalizedExpression = expression.trim()
  const directVariable = assignments.get(normalizedExpression)
  if (directVariable !== undefined) return directVariable

  const quotedMatch = normalizedExpression.match(/^f?(["'`])([\s\S]*)\1$/i)
  if (quotedMatch) {
    return quotedMatch[2]
      .replace(/\$\{\s*([a-zA-Z_$][\w$]*)\s*\}/g, (_, name: string) => assignments.get(name) ?? `{${name}}`)
      .replace(/\{\s*([a-zA-Z_$][\w$]*)\s*\}/g, (_, name: string) => assignments.get(name) ?? `{${name}}`)
  }

  const parts = normalizedExpression.split(/\s*\+\s*/)
  if (parts.length > 1) {
    const resolvedParts = parts.map((part) => {
      const quotedPart = part.match(/^["'`]([\s\S]*)["'`]$/)
      if (quotedPart) return quotedPart[1]
      return assignments.get(part)
    })

    if (resolvedParts.every((part) => part !== undefined)) {
      return resolvedParts.join('')
    }
  }

  return null
}

function evaluateSafeArithmetic(expression: string, values: Map<string, number>): number | null {
  const replacedExpression = expression.replace(/\b[a-zA-Z_$][\w$]*\b/g, (name) => {
    const value = values.get(name)
    return value === undefined ? name : String(value)
  })

  if (!/^[\d+\-*/%().\s]+$/.test(replacedExpression)) return null
  const compactExpression = replacedExpression.replace(/\s+/g, '')
  const rawTokens = compactExpression.match(/\d+(?:\.\d+)?|[()+\-*/%]/g)
  if (!rawTokens || rawTokens.join('') !== compactExpression) return null

  let tokenIndex = 0

  const parseFactor = (): number | null => {
    const token = rawTokens[tokenIndex]
    if (token === '+' || token === '-') {
      tokenIndex += 1
      const factor = parseFactor()
      return factor === null ? null : token === '-' ? -factor : factor
    }

    if (token === '(') {
      tokenIndex += 1
      const value = parseExpression()
      if (rawTokens[tokenIndex] !== ')') return null
      tokenIndex += 1
      return value
    }

    if (token === undefined || !/^\d+(?:\.\d+)?$/.test(token)) return null
    tokenIndex += 1
    return Number(token)
  }

  const parseTerm = (): number | null => {
    let value = parseFactor()
    if (value === null) return null

    while (['*', '/', '%'].includes(rawTokens[tokenIndex])) {
      const operator = rawTokens[tokenIndex]
      tokenIndex += 1
      const rightValue = parseFactor()
      if (rightValue === null) return null

      if (operator === '*') value *= rightValue
      if (operator === '/') value /= rightValue
      if (operator === '%') value %= rightValue
    }

    return value
  }

  const parseExpression = (): number | null => {
    let value = parseTerm()
    if (value === null) return null

    while (['+', '-'].includes(rawTokens[tokenIndex])) {
      const operator = rawTokens[tokenIndex]
      tokenIndex += 1
      const rightValue = parseTerm()
      if (rightValue === null) return null
      value = operator === '+' ? value + rightValue : value - rightValue
    }

    return value
  }

  const result = parseExpression()
  return result !== null && tokenIndex === rawTokens.length && Number.isFinite(result)
    ? result
    : null
}

function resolveNumericExpression(expression: string, source: string): number | null {
  const values = new Map<string, number>()
  const assignmentPattern = /(?:\b(?:const|let|var)\s+)?([a-zA-Z_$][\w$]*)\s*=\s*([^;\n]+)/g

  for (const match of source.matchAll(assignmentPattern)) {
    const value = evaluateSafeArithmetic(match[2], values)
    if (value !== null) values.set(match[1], value)
  }

  return evaluateSafeArithmetic(expression, values)
}

function getExpectedOutput(challenge: BattleChallenge): unknown {
  if (challenge.expectedOutput !== undefined) return challenge.expectedOutput
  if (challenge.testCases?.length === 1) return challenge.testCases[0].expectedOutput

  const quotedOutput = challenge.statement.match(/[“"]([^”"]+)[”"]/)?.[1]
  if (quotedOutput) return quotedOutput

  return undefined
}

function validateOutputSolution(
  answer: string,
  challenge: BattleChallenge,
): BattleValidationResult {
  const outputExpression = extractOutputExpression(answer, challenge.language)
  if (!outputExpression) {
    return {
      isValid: false,
      message:
        challenge.language === 'python'
          ? 'Mostre o resultado com print, conforme o desafio.'
          : 'Mostre o resultado com console.log, conforme o desafio.',
    }
  }

  const expectedOutput = getExpectedOutput(challenge)
  if (expectedOutput === undefined) return { isValid: true }

  if (typeof expectedOutput === 'number') {
    const actualOutput = resolveNumericExpression(outputExpression, answer)
    return actualOutput === expectedOutput
      ? { isValid: true }
      : {
          isValid: false,
          message: `A execução precisa produzir o resultado ${expectedOutput}.`,
        }
  }

  const actualOutput = resolveTextExpression(outputExpression, answer)
  const normalizedExpected = normalizeWhitespace(normalizeQuotes(String(expectedOutput)))
    .toLocaleLowerCase('pt-BR')
  const normalizedActual = actualOutput
    ? normalizeWhitespace(normalizeQuotes(actualOutput)).toLocaleLowerCase('pt-BR')
    : ''

  return normalizedActual === normalizedExpected
    ? { isValid: true }
    : {
        isValid: false,
        message: `A execução precisa produzir exatamente: ${String(expectedOutput)}`,
      }
}

function extractSqlTables(source: string): string[] {
  const cteNames = new Set(
    [...source.matchAll(/(?:\bwith\s+(?:recursive\s+)?|,)\s*([a-zA-Z_]\w*)\s+as\s*\(/gi)]
      .map((match) => match[1].toLowerCase()),
  )

  return [...source.matchAll(/\b(?:from|join|update|into)\s+([a-zA-Z_]\w*)/gi)]
    .map((match) => match[1].toLowerCase())
    .filter((tableName) => !cteNames.has(tableName))
}

function extractSelectIdentifiers(source: string): string[] {
  const selectMatch = source.match(/\bselect\s+([\s\S]*?)\s+from\b/i)
  if (!selectMatch || selectMatch[1].trim() === '*') return []

  const sqlWords = new Set([
    'as', 'distinct', 'count', 'sum', 'avg', 'min', 'max', 'case', 'when', 'then',
    'else', 'end', 'over', 'partition', 'by', 'order', 'asc', 'desc', 'null', 'true',
    'false',
  ])

  const withoutStrings = selectMatch[1].replace(/["'][\s\S]*?["']/g, '')
  const identifiers = [...withoutStrings.matchAll(/[a-zA-Z_]\w*/g)]
    .map((match) => match[0].toLowerCase())
    .filter((identifier) => identifier.length > 1 && !sqlWords.has(identifier))

  return [...new Set(identifiers)]
}

function validateSqlSolution(
  answer: string,
  challenge: BattleChallenge,
): BattleValidationResult {
  const source = stripComments(answer, 'sql').toLowerCase()
  const reference = stripComments(
    challenge.referenceSolution ?? challenge.expectedAnswer,
    'sql',
  ).toLowerCase()
  const referenceCommand = reference.match(/\b(select|insert|update|delete)\b/)?.[1]

  if (referenceCommand && !new RegExp(`\\b${referenceCommand}\\b`, 'i').test(source)) {
    return {
      isValid: false,
      message: `A solução precisa usar ${referenceCommand.toUpperCase()} para este desafio.`,
    }
  }

  const missingTable = extractSqlTables(reference).find(
    (table) => !new RegExp(`\\b${table}\\b`, 'i').test(source),
  )
  if (missingTable) {
    return {
      isValid: false,
      message: `A consulta precisa usar a tabela ${missingTable}.`,
    }
  }

  const missingIdentifier = extractSelectIdentifiers(reference).find(
    (identifier) => !new RegExp(`\\b${identifier}\\b`, 'i').test(source),
  )
  if (missingIdentifier) {
    return {
      isValid: false,
      message: `A saída da consulta precisa incluir ${missingIdentifier}.`,
    }
  }

  const prompt = normalizeSearchText(
    [challenge.statement, ...challenge.instructions].join(' '),
  )
  const queryCriteria: Array<{ prompt: RegExp; code: RegExp; description: string }> = [
    { prompt: /filtr|apenas|cujo|acima de|ativo|nulo/, code: /\bwhere\b/i, description: 'aplicar o filtro com WHERE' },
    { prompt: /ordem|ordene|maior para o menor/, code: /\border\s+by\b/i, description: 'ordenar o resultado com ORDER BY' },
    { prompt: /agrup|por categoria|cada categoria/, code: /\bgroup\s+by\b/i, description: 'agrupar os registros com GROUP BY' },
    { prompt: /conte|contar|quantos|contagem/, code: /\bcount\s*\(/i, description: 'calcular a contagem com COUNT' },
    { prompt: /limite|cinco/, code: /\blimit\s+5\b/i, description: 'limitar o resultado a cinco linhas' },
    { prompt: /cte/, code: /\bwith\b/i, description: 'estruturar a consulta com WITH' },
    { prompt: /recursiv/, code: /\bwith\s+recursive\b/i, description: 'usar uma CTE recursiva' },
    { prompt: /transacao/, code: /\bbegin\b[\s\S]*\bcommit\b/i, description: 'executar a atualização em uma transação' },
    { prompt: /upsert|conflito/, code: /\bon\s+conflict\b/i, description: 'tratar o conflito do upsert' },
  ]
  const missingCriterion = queryCriteria.find(
    (criterion) => criterion.prompt.test(prompt) && !criterion.code.test(source),
  )
  if (missingCriterion) {
    return {
      isValid: false,
      message: `A consulta precisa ${missingCriterion.description}.`,
    }
  }

  const expectedOutput = getExpectedOutput(challenge)
  if (
    typeof expectedOutput === 'string' &&
    !normalizeQuotes(source).includes(normalizeQuotes(expectedOutput).toLowerCase())
  ) {
    return {
      isValid: false,
      message: `A consulta precisa retornar exatamente: ${expectedOutput}`,
    }
  }

  return { isValid: true }
}

function extractTagNames(source: string): string[] {
  return [...source.matchAll(/<\s*([a-z][\w-]*)\b/gi)]
    .map((match) => match[1].toLowerCase())
    .filter((tagName) => tagName !== 'style')
}

function extractVisibleTexts(source: string): string[] {
  const withoutStyles = source.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  return [...withoutStyles.matchAll(/>([^<]+)</g)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
}

function extractRequiredAttributes(reference: string): Array<{
  name: string
  value?: string
}> {
  const supportedAttributes = new Set([
    'aria-labelledby', 'class', 'for', 'href', 'id', 'name', 'open', 'type',
  ])
  const attributes: Array<{ name: string; value?: string }> = []

  for (const tagMatch of reference.matchAll(/<\s*[a-z][\w-]*\b([^>]*)>/gi)) {
    const attributeSource = tagMatch[1]
    for (const attributeMatch of attributeSource.matchAll(/([:\w-]+)(?:\s*=\s*["']([^"']*)["'])?/g)) {
      const name = attributeMatch[1].toLowerCase()
      if (supportedAttributes.has(name)) {
        attributes.push({ name, value: attributeMatch[2] })
      }
    }
  }

  return attributes
}

function extractCssDeclarations(source: string): Array<{ property: string; value: string }> {
  const styleContent = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join('\n')
  const declarations: Array<{ property: string; value: string }> = []

  for (const blockMatch of styleContent.matchAll(/{([^{}]*)}/g)) {
    for (const declarationMatch of blockMatch[1].matchAll(/([\w-]+)\s*:\s*([^;}]+)/g)) {
      declarations.push({
        property: declarationMatch[1].toLowerCase(),
        value: normalizeWhitespace(declarationMatch[2]).toLowerCase(),
      })
    }
  }

  return declarations
}

function getRequiredCssProperties(prompt: string): string[] {
  const requirements: Array<{ prompt: RegExp; properties: string[] }> = [
    { prompt: /fundo|background/, properties: ['background'] },
    { prompt: /texto branco|cor do texto|destaque|contraste/, properties: ['color'] },
    { prompt: /espacamento interno/, properties: ['padding'] },
    { prompt: /borda/, properties: ['border'] },
    { prompt: /cantos arredondados/, properties: ['border-radius'] },
    { prompt: /css grid|grade|colunas/, properties: ['display', 'grid-template-columns'] },
    { prompt: /flexbox|linha flexivel|navegacao flexivel/, properties: ['display'] },
    { prompt: /quebr.*linha/, properties: ['flex-wrap'] },
    { prompt: /em uma coluna|organize.*coluna/, properties: ['display', 'flex-direction'] },
    { prompt: /espaco de|espacamento entre|com espacamento|\bgap\b/, properties: ['gap'] },
    { prompt: /container query|container alcançar|defina o container/, properties: ['container-type'] },
    { prompt: /animacao|anime/, properties: ['animation'] },
  ]

  return [...new Set(
    requirements
      .filter((requirement) => requirement.prompt.test(prompt))
      .flatMap((requirement) => requirement.properties),
  )]
}

function hasCssProperty(
  declarations: Array<{ property: string; value: string }>,
  property: string,
): boolean {
  if (property === 'background') {
    return declarations.some((declaration) =>
      declaration.property === 'background' || declaration.property === 'background-color',
    )
  }

  return declarations.some((declaration) => declaration.property === property)
}

function validateMarkupSolution(
  answer: string,
  challenge: BattleChallenge,
): BattleValidationResult {
  const reference = challenge.referenceSolution ?? challenge.expectedAnswer
  const answerTags = extractTagNames(answer)
  const missingTag = [...new Set(extractTagNames(reference))].find(
    (tagName) => !answerTags.includes(tagName),
  )
  if (missingTag) {
    return {
      isValid: false,
      message: `Inclua o elemento <${missingTag}> solicitado pelo desafio.`,
    }
  }

  const normalizedAnswer = normalizeWhitespace(answer).toLocaleLowerCase('pt-BR')
  const missingText = extractVisibleTexts(reference).find(
    (text) => !normalizedAnswer.includes(text.toLocaleLowerCase('pt-BR')),
  )
  if (missingText) {
    return {
      isValid: false,
      message: `O conteúdo precisa incluir exatamente: ${missingText}`,
    }
  }

  const missingAttribute = extractRequiredAttributes(reference).find(({ name, value }) => {
    if (value === undefined) return !new RegExp(`\\b${name}\\b`, 'i').test(answer)
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return !new RegExp(`${name}\\s*=\\s*["'][^"']*${escapedValue}[^"']*["']`, 'i').test(answer)
  })
  if (missingAttribute) {
    return {
      isValid: false,
      message: missingAttribute.value === undefined
        ? `Inclua o atributo ${missingAttribute.name}.`
        : `Use ${missingAttribute.name}="${missingAttribute.value}" no elemento correspondente.`,
    }
  }

  const prompt = normalizeSearchText(
    [challenge.statement, ...challenge.instructions].join(' '),
  )
  const answerDeclarations = extractCssDeclarations(answer)
  const missingProperty = getRequiredCssProperties(prompt).find(
    (property) => !hasCssProperty(answerDeclarations, property),
  )
  if (missingProperty) {
    return {
      isValid: false,
      message: `A estilização precisa definir a propriedade ${missingProperty}.`,
    }
  }

  if (/tokens|variaveis/.test(prompt)) {
    const hasCustomProperty = answerDeclarations.some((declaration) =>
      declaration.property.startsWith('--'),
    )
    if (!hasCustomProperty || !/\bvar\s*\(/i.test(answer)) {
      return {
        isValid: false,
        message: 'Defina variáveis CSS e aplique os tokens com var(...).',
      }
    }
  }

  const colorRequirements: Array<{ prompt: RegExp; code: RegExp; description: string }> = [
    {
      prompt: /vermelh/,
      code: /\b(?:red|crimson|firebrick|darkred)\b|#(?:f00|ff0000|c83232|b91c1c|dc2626)\b|rgb\(\s*(?:1\d\d|2[0-5]\d)\s*,/i,
      description: 'uma tonalidade vermelha',
    },
    {
      prompt: /dourad/,
      code: /\b(?:gold|goldenrod)\b|#(?:d4af37|d6a84a|f3d27a)\b/i,
      description: 'uma tonalidade dourada',
    },
    {
      prompt: /texto branco/,
      code: /\bwhite\b|#(?:fff|ffffff)\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/i,
      description: 'texto branco',
    },
  ]
  const missingColor = colorRequirements.find(
    (requirement) => requirement.prompt.test(prompt) && !requirement.code.test(answer),
  )
  if (missingColor) {
    return {
      isValid: false,
      message: `A estilização precisa usar ${missingColor.description}.`,
    }
  }

  const exactValues = [...prompt.matchAll(/\b\d+(?:\.\d+)?(?:px|rem|fr|s)\b/g)]
    .map((match) => match[0])
  const missingValue = exactValues.find(
    (value) => !normalizeSearchText(answer).includes(value),
  )
  if (missingValue) {
    return {
      isValid: false,
      message: `Use o valor ${missingValue}, conforme solicitado no desafio.`,
    }
  }

  const requiredAtRules = ['@layer', '@container', '@keyframes', '@media'].filter(
    (atRule) => reference.toLowerCase().includes(atRule),
  )
  const missingAtRule = requiredAtRules.find(
    (atRule) => !answer.toLowerCase().includes(atRule),
  )
  if (missingAtRule) {
    return {
      isValid: false,
      message: `A solução precisa incluir ${missingAtRule}.`,
    }
  }

  return { isValid: true }
}

export function normalizeBattleAnswer(answer: string, language: BattleLanguage): string {
  const withNormalizedQuotes = normalizeQuotes(answer)
  const languageNormalized =
    language === 'html-css' ? normalizeHtmlCss(withNormalizedQuotes) : withNormalizedQuotes

  return normalizeWhitespace(languageNormalized)
}

export function validateBattleSolution(
  answer: string,
  challenge: BattleChallenge,
): BattleValidationResult {
  if (!hasMeaningfulCode(answer, challenge.language)) {
    return {
      isValid: false,
      message: 'Digite sua solução no editor antes de executar o código.',
    }
  }

  if (!looksLikeSelectedLanguage(answer, challenge.language)) {
    const languageLabels: Record<BattleLanguage, string> = {
      python: 'Python',
      javascript: 'JavaScript',
      sql: 'SQL',
      'html-css': 'HTML/CSS',
    }

    return {
      isValid: false,
      message: `A solução precisa estar escrita em ${languageLabels[challenge.language]}.`,
    }
  }

  const patternFailure = validatePatternRules(
    answer,
    challenge.requiredPatterns,
    challenge.forbiddenPatterns,
  )
  if (patternFailure) return patternFailure

  const techniqueFailure = validateExplicitTechniques(answer, challenge)
  if (techniqueFailure) return techniqueFailure

  const referenceSolution = challenge.referenceSolution ?? challenge.expectedAnswer
  if (
    normalizeBattleAnswer(answer, challenge.language) ===
    normalizeBattleAnswer(referenceSolution, challenge.language)
  ) {
    return { isValid: true }
  }

  const strategy = resolveStrategy(challenge)
  if (strategy === 'function') return validateFunctionSolution(answer, challenge)
  if (strategy === 'query') return validateSqlSolution(answer, challenge)
  if (strategy === 'markup') return validateMarkupSolution(answer, challenge)
  return validateOutputSolution(answer, challenge)
}

export function validateBattleAnswer(
  answer: string,
  challengeOrExpectedAnswer: BattleChallenge | string,
  legacyLanguage?: BattleLanguage,
): boolean {
  if (typeof challengeOrExpectedAnswer === 'string') {
    if (!legacyLanguage) return false
    return (
      normalizeBattleAnswer(answer, legacyLanguage) ===
      normalizeBattleAnswer(challengeOrExpectedAnswer, legacyLanguage)
    )
  }

  return validateBattleSolution(answer, challengeOrExpectedAnswer).isValid
}
