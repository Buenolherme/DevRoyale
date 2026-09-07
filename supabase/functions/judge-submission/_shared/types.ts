export type SubmissionMode = 'run' | 'submit'
export type SubmissionStatus =
  | 'queued'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'compile_error'
  | 'runtime_error'
  | 'time_limit'
  | 'validation_error'
  | 'internal_error'

export type ValidationType =
  | 'program_output'
  | 'function_tests'
  | 'sql_result'
  | 'html_css_structure'

export type BattleLanguage = 'python' | 'javascript' | 'sql' | 'html-css'
export type BattleDifficulty = 'never' | 'basic' | 'intermediate' | 'advanced'

export interface JudgeSubmissionRequest {
  matchId: string
  roundId: string
  sourceCode: string
  mode: SubmissionMode
  requestId: string
}

export interface StoredSubmission {
  id: string
  status: SubmissionStatus
  mode: SubmissionMode
  public_message: string | null
  stdout: string | null
}

export interface ChallengeTest {
  input: Record<string, unknown>
  expected: unknown
  validatorConfig?: ValidatorConfig
  weight?: number
}

export interface PatternRule {
  description: string
  anyOf: string[]
}

export interface ValidatorConfig {
  required?: PatternRule[]
  forbidden?: PatternRule[]
  sortRows?: boolean
}

export interface JudgePayload {
  submissionId: string
  matchId: string
  roundId: string
  userId: string
  mode: SubmissionMode
  sourceCode: string
  language: BattleLanguage
  difficulty: BattleDifficulty
  validationType: ValidationType
  judgeConfig: {
    functionName?: string
    harness?: 'javascript_concurrency_queue' | 'javascript_memoization'
  }
  tests: ChallengeTest[]
}

export interface JudgeExecutionRequest {
  language: 'python' | 'javascript'
  sourceCode: string
  stdin?: string
}

export interface JudgeExecutionResult {
  token: string
  statusId: number
  statusDescription: string
  stdout: string
  stderr: string
  compileOutput: string
  message: string
  time: number | null
  memory: number | null
}

export interface CodeJudgeProvider {
  submit(request: JudgeExecutionRequest): Promise<string>
  getResult(token: string): Promise<JudgeExecutionResult>
}

export interface ValidationOutcome {
  status: SubmissionStatus
  message: string
  stdout?: string
  executionTime?: number | null
  memoryUsed?: number | null
}
