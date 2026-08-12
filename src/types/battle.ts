export type BattleLanguage = 'python' | 'javascript' | 'sql' | 'html-css'

export type BattleDifficulty =
  | 'never'
  | 'basic'
  | 'intermediate'
  | 'advanced'

export type BattleValidationStrategy =
  | 'output'
  | 'function'
  | 'query'
  | 'markup'

export type BattleHints = [string, string, string]

export interface BattleTestCase {
  description: string
  input?: unknown
  expectedOutput: unknown
}

export interface BattlePatternRule {
  description: string
  anyOf: string[]
}

export interface BattleValidationRules {
  strategy?: BattleValidationStrategy
  functionName?: string
}

export interface BattleChallenge {
  id: string
  title: string
  language: BattleLanguage
  difficulty: BattleDifficulty
  description: string
  statement: string
  instructions: string[]
  starterCode: string
  expectedAnswer: string
  allowHints?: boolean
  hints?: BattleHints
  expectedOutput?: unknown
  testCases?: BattleTestCase[]
  validationRules?: BattleValidationRules
  forbiddenPatterns?: BattlePatternRule[]
  requiredPatterns?: BattlePatternRule[]
  referenceSolution?: string
  hint: string
  xp: number
  tags: string[]
}
