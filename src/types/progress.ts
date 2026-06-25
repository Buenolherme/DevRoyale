import type { AchievementRarity } from './achievement'

export type ProgressSource = 'study' | 'bug' | 'battle'
export type ProgressActivitySource = ProgressSource | 'achievement'
export type ProgressActivityType = 'lesson' | 'bug' | 'battle' | 'achievement'

export type ProgressMetadataValue = string | number | boolean | null
export type ProgressMetadata = Record<string, ProgressMetadataValue>

export type ProgressAchievementMetric =
  | 'total-completions'
  | 'completed-lessons'
  | 'completed-bugs'
  | 'completed-battles'
  | 'won-battles'
  | 'total-xp'
  | 'level'

export interface ProgressAchievementCondition {
  metric: ProgressAchievementMetric
  target: number
  label: string
}

export interface ProgressAchievementDefinition {
  id: string
  name: string
  description: string
  rarity: AchievementRarity
  condition: ProgressAchievementCondition
}

export interface UnlockedProgressAchievement extends ProgressAchievementDefinition {
  unlockedAt: string
}

export interface ProgressActivity {
  id: string
  userId: string
  type: ProgressActivityType
  source: ProgressActivitySource
  sourceId: string
  title: string
  xpAwarded: number
  completedAt: string
  metadata: ProgressMetadata
}

export interface UserProgress {
  userId: string
  totalXP: number
  level: number
  currentLevelXP: number
  nextLevelXP: number
  completedLessons: string[]
  completedBugs: string[]
  completedBattles: string[]
  unlockedAchievements: UnlockedProgressAchievement[]
  lastActivityAt: string | null
  activityHistory: ProgressActivity[]
}

export interface LevelProgress {
  level: number
  currentLevelXP: number
  nextLevelXP: number
  currentLevelThreshold: number
  nextLevelThreshold: number
}

export interface ProgressMutationResult {
  persisted: boolean
  duplicate: boolean
  xpAwarded: number
  previousLevel: number
  leveledUp: boolean
  progress: UserProgress
  newAchievements: UnlockedProgressAchievement[]
  reason?: 'anonymous-user' | 'storage-unavailable'
}

export interface AchievementSummary {
  total: number
  unlocked: number
  locked: number
  unlockedAchievements: UnlockedProgressAchievement[]
  nextAchievements: ProgressAchievementDefinition[]
}

export interface AchievementMetricProgress {
  current: number
  target: number
  remaining: number
  percentage: number
  completed: boolean
}
