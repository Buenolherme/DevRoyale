export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: AchievementRarity
  unlockedAt?: string
  xpReward: number
}
