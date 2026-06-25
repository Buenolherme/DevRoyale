export type BugLanguage = 'python' | 'javascript' | 'sql' | 'html-css'
export type BugDifficulty = 'never' | 'basic' | 'intermediate' | 'advanced'
export type BugCodeSize = 'small' | 'medium' | 'large'
export type BugCount = 1 | 2 | 3 | 4 | 5

export interface Bug {
  id: string
  title: string
  language: BugLanguage
  difficulty: BugDifficulty
  codeSize: BugCodeSize
  description: string
  brokenCode: string
  bugCount: BugCount
  topics: string[]
  expectedFix: string
  hint: string
  explanation: string
  bugExplanations: string[]
  baseXp: number
  xp: number
  tags: string[]
}
