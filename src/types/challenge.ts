export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'
export type ChallengeStatus = 'available' | 'in_progress' | 'completed'

export interface Challenge {
  id: string
  title: string
  description: string
  difficulty: ChallengeDifficulty
  xpReward: number
  status: ChallengeStatus
  category: string
  timeLimit?: number
}
