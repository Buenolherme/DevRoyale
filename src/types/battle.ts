export type BattleLanguage = 'python' | 'javascript' | 'sql' | 'html-css'

export type BattleDifficulty =
  | 'never'
  | 'basic'
  | 'intermediate'
  | 'advanced'

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
  hint: string
  xp: number
  tags: string[]
}
