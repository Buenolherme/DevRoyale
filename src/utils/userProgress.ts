import type {
  AchievementSummary,
  AchievementMetricProgress,
  ProgressAchievementDefinition,
  ProgressActivity,
  ProgressActivitySource,
  ProgressActivityType,
  ProgressMetadata,
  ProgressMutationResult,
  ProgressSource,
  StudyLevelId,
  UnlockedProgressAchievement,
  UserProgress,
} from '@/types'
import { getStudyHistoryByUser } from './studyHistory'
import {
  PROGRESS_ACHIEVEMENTS,
  STUDY_LESSON_XP_BY_LEVEL,
} from './progress/achievementDefinitions'
import { calculateLevel } from './progress/levelUtils'
import {
  hasPersistentProgressStorage,
  readProgressStorage,
  writeProgressStorage,
} from './progress/progressStorage'

export {
  PROGRESS_ACHIEVEMENTS,
  STUDY_LESSON_XP_BY_LEVEL,
  calculateLevel,
}

export const USER_PROGRESS_STORAGE_KEY = 'devroyale_user_progress_v1'

const LEGACY_BUG_PROGRESS_STORAGE_KEY = 'devroyale_bug_arena_progress'
const LEGACY_STUDY_PROGRESS_STORAGE_KEY = 'devroyale_study_progress'
const anonymousUserIds = new Set(['guest', 'anonymous', 'visitor'])

type CompletionKey = 'completedLessons' | 'completedBugs' | 'completedBattles'

const completionKeyBySource: Record<ProgressSource, CompletionKey> = {
  study: 'completedLessons',
  bug: 'completedBugs',
  battle: 'completedBattles',
}

const activityTypeBySource: Record<ProgressSource, ProgressActivityType> = {
  study: 'lesson',
  bug: 'bug',
  battle: 'battle',
}

function normalizeUserId(userId?: string | null): string | null {
  if (typeof userId !== 'string') return null

  const normalized = userId.trim()
  if (!normalized || anonymousUserIds.has(normalized.toLowerCase())) return null
  return normalized
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}

function normalizeMetadata(value: unknown): ProgressMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | number | boolean | null] => {
      const item = entry[1]
      return item === null || ['string', 'number', 'boolean'].includes(typeof item)
    }),
  )
}

function createActivityId(source: ProgressActivitySource, sourceId: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `${source}-${sourceId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEmptyProgress(userId: string): UserProgress {
  const level = calculateLevel(0)

  return {
    userId,
    totalXP: 0,
    level: level.level,
    currentLevelXP: level.currentLevelXP,
    nextLevelXP: level.nextLevelXP,
    completedLessons: [],
    completedBugs: [],
    completedBattles: [],
    unlockedAchievements: [],
    lastActivityAt: null,
    activityHistory: [],
  }
}

function normalizeActivity(value: unknown, userId: string): ProgressActivity | null {
  if (!value || typeof value !== 'object') return null

  const activity = value as Partial<ProgressActivity>
  const validSources: ProgressActivitySource[] = ['study', 'bug', 'battle', 'achievement']
  const validTypes: ProgressActivityType[] = ['lesson', 'bug', 'battle', 'achievement']
  if (
    typeof activity.id !== 'string' ||
    !validSources.includes(activity.source as ProgressActivitySource) ||
    typeof activity.sourceId !== 'string' ||
    typeof activity.completedAt !== 'string' ||
    Number.isNaN(new Date(activity.completedAt).getTime())
  ) {
    return null
  }

  const source = activity.source as ProgressActivitySource
  const metadata = normalizeMetadata(activity.metadata)
  const type = validTypes.includes(activity.type as ProgressActivityType)
    ? (activity.type as ProgressActivityType)
    : source === 'achievement'
      ? 'achievement'
      : activityTypeBySource[source]
  const metadataTitle = metadata.lesson ?? metadata.title
  const achievementTitle =
    source === 'achievement'
      ? PROGRESS_ACHIEVEMENTS.find((achievement) => achievement.id === activity.sourceId)?.name
      : undefined

  return {
    id: activity.id,
    userId,
    type,
    source,
    sourceId: activity.sourceId,
    title:
      typeof activity.title === 'string'
        ? activity.title
        : typeof metadataTitle === 'string'
          ? metadataTitle
          : achievementTitle ?? activity.sourceId,
    xpAwarded:
      typeof activity.xpAwarded === 'number' && Number.isFinite(activity.xpAwarded)
        ? Math.max(0, Math.floor(activity.xpAwarded))
        : 0,
    completedAt: activity.completedAt,
    metadata,
  }
}

function normalizeUnlockedAchievements(value: unknown): UnlockedProgressAchievement[] {
  if (!Array.isArray(value)) return []

  const unlockedIds = new Set<string>()
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []

    const achievement = item as Partial<UnlockedProgressAchievement>
    const definition = PROGRESS_ACHIEVEMENTS.find((entry) => entry.id === achievement.id)
    if (
      !definition ||
      typeof achievement.unlockedAt !== 'string' ||
      Number.isNaN(new Date(achievement.unlockedAt).getTime()) ||
      unlockedIds.has(definition.id)
    ) {
      return []
    }

    unlockedIds.add(definition.id)
    return [{ ...definition, unlockedAt: achievement.unlockedAt }]
  })
}

function normalizeProgress(value: unknown, userId: string): UserProgress | null {
  if (!value || typeof value !== 'object') return null

  const progress = value as Partial<UserProgress>
  if (progress.userId !== userId) return null

  const totalXP =
    typeof progress.totalXP === 'number' && Number.isFinite(progress.totalXP)
      ? Math.max(0, Math.floor(progress.totalXP))
      : 0
  const level = calculateLevel(totalXP)
  const parsedActivityHistory = Array.isArray(progress.activityHistory)
    ? progress.activityHistory
        .map((activity) => normalizeActivity(activity, userId))
        .filter((activity): activity is ProgressActivity => Boolean(activity))
        .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    : []
  const activityKeys = new Set<string>()
  const activityHistory = parsedActivityHistory.filter((activity) => {
    const key = `${activity.source}:${activity.sourceId}`
    if (activityKeys.has(key)) return false

    activityKeys.add(key)
    return true
  })
  const unlockedAchievements = normalizeUnlockedAchievements(progress.unlockedAchievements)
  const recordedAchievementIds = new Set(
    activityHistory
      .filter((activity) => activity.type === 'achievement')
      .map((activity) => activity.sourceId),
  )
  const missingAchievementActivities: ProgressActivity[] = unlockedAchievements
    .filter((achievement) => !recordedAchievementIds.has(achievement.id))
    .map((achievement) => ({
      id: `migration-achievement-${achievement.id}`,
      userId,
      type: 'achievement',
      source: 'achievement',
      sourceId: achievement.id,
      title: achievement.name,
      xpAwarded: 0,
      completedAt: achievement.unlockedAt,
      metadata: {
        migrated: true,
        rarity: achievement.rarity,
        description: achievement.description,
      },
    }))
  const normalizedActivityHistory = [...missingAchievementActivities, ...activityHistory].sort(
    (left, right) => right.completedAt.localeCompare(left.completedAt),
  )

  return {
    userId,
    totalXP,
    level: level.level,
    currentLevelXP: level.currentLevelXP,
    nextLevelXP: level.nextLevelXP,
    completedLessons: normalizeStringList(progress.completedLessons),
    completedBugs: normalizeStringList(progress.completedBugs),
    completedBattles: normalizeStringList(progress.completedBattles),
    unlockedAchievements,
    lastActivityAt:
      normalizedActivityHistory[0]?.completedAt ??
      (typeof progress.lastActivityAt === 'string' ? progress.lastActivityAt : null),
    activityHistory: normalizedActivityHistory,
  }
}

function getLegacyBugProgress(userId: string): { fixedBugIds: string[]; xp: number } {
  if (!hasPersistentProgressStorage()) return { fixedBugIds: [], xp: 0 }

  try {
    const raw = window.localStorage.getItem(LEGACY_BUG_PROGRESS_STORAGE_KEY)
    if (!raw) return { fixedBugIds: [], xp: 0 }

    const parsed = JSON.parse(raw) as Record<string, { fixedBugIds?: unknown; xp?: unknown }>
    const progress = parsed?.[userId]
    return {
      fixedBugIds: normalizeStringList(progress?.fixedBugIds),
      xp:
        typeof progress?.xp === 'number' && Number.isFinite(progress.xp)
          ? Math.max(0, Math.floor(progress.xp))
          : 0,
    }
  } catch {
    return { fixedBugIds: [], xp: 0 }
  }
}

function getLegacyStudyXP(userId: string): number {
  if (!hasPersistentProgressStorage()) return 0

  try {
    const raw = window.localStorage.getItem(LEGACY_STUDY_PROGRESS_STORAGE_KEY)
    if (!raw) return 0

    const parsed = JSON.parse(raw) as Record<string, { xp?: unknown }>
    const xp = parsed?.[userId]?.xp
    return typeof xp === 'number' && Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0
  } catch {
    return 0
  }
}

function getAchievementMetric(progress: UserProgress, achievement: ProgressAchievementDefinition) {
  switch (achievement.condition.metric) {
    case 'total-completions':
      return (
        progress.completedLessons.length +
        progress.completedBugs.length +
        progress.completedBattles.length
      )
    case 'completed-lessons':
      return progress.completedLessons.length
    case 'completed-bugs':
      return progress.completedBugs.length
    case 'completed-battles':
      return progress.completedBattles.length
    case 'won-battles':
      return progress.activityHistory.filter(
        (activity) =>
          activity.type === 'battle' && activity.metadata.outcome === 'victory',
      ).length
    case 'total-xp':
      return progress.totalXP
    case 'level':
      return progress.level
  }
}

export function getAchievementProgress(
  progress: UserProgress,
  achievement: ProgressAchievementDefinition,
): AchievementMetricProgress {
  const current = getAchievementMetric(progress, achievement)
  const target = Math.max(1, achievement.condition.target)

  return {
    current,
    target,
    remaining: Math.max(0, target - current),
    percentage: Math.min(100, Math.round((current / target) * 100)),
    completed: current >= target,
  }
}

function unlockEligibleAchievements(
  progress: UserProgress,
  unlockedAt: string,
): { progress: UserProgress; newAchievements: UnlockedProgressAchievement[] } {
  const unlockedIds = new Set(progress.unlockedAchievements.map((achievement) => achievement.id))
  const newAchievements = PROGRESS_ACHIEVEMENTS.filter(
    (achievement) =>
      !unlockedIds.has(achievement.id) &&
      getAchievementMetric(progress, achievement) >= achievement.condition.target,
  ).map((achievement) => ({ ...achievement, unlockedAt }))
  const achievementActivities: ProgressActivity[] = newAchievements.map((achievement) => ({
    id: createActivityId('achievement', achievement.id),
    userId: progress.userId,
    type: 'achievement',
    source: 'achievement',
    sourceId: achievement.id,
    title: achievement.name,
    xpAwarded: 0,
    completedAt: unlockedAt,
    metadata: {
      rarity: achievement.rarity,
      description: achievement.description,
    },
  }))

  return {
    progress: {
      ...progress,
      unlockedAchievements: [...progress.unlockedAchievements, ...newAchievements],
      lastActivityAt: achievementActivities.length ? unlockedAt : progress.lastActivityAt,
      activityHistory: [...achievementActivities, ...progress.activityHistory],
    },
    newAchievements,
  }
}

function migrateLegacyProgress(userId: string): UserProgress {
  const studyHistory = getStudyHistoryByUser(userId)
  const legacyBugProgress = getLegacyBugProgress(userId)
  const legacyStudyXP = getLegacyStudyXP(userId)
  const migratedAt = new Date().toISOString()
  const activityHistory: ProgressActivity[] = [
    ...studyHistory.map((record) => ({
      id: `migration-study-${record.id}`,
      userId,
      type: 'lesson' as const,
      source: 'study' as const,
      sourceId: record.lessonId,
      title: record.lessonTitle,
      xpAwarded: 0,
      completedAt: record.completedAt,
      metadata: {
        migrated: true,
        topic: record.topicLabel,
        level: record.levelLabel,
        lesson: record.lessonTitle,
      },
    })),
    ...legacyBugProgress.fixedBugIds.map((bugId) => ({
      id: `migration-bug-${bugId}`,
      userId,
      type: 'bug' as const,
      source: 'bug' as const,
      sourceId: bugId,
      title: bugId,
      xpAwarded: 0,
      completedAt: migratedAt,
      metadata: { migrated: true },
    })),
  ].sort((left, right) => right.completedAt.localeCompare(left.completedAt))
  const totalXP = legacyBugProgress.xp + legacyStudyXP
  const level = calculateLevel(totalXP)
  const baseProgress: UserProgress = {
    userId,
    totalXP,
    level: level.level,
    currentLevelXP: level.currentLevelXP,
    nextLevelXP: level.nextLevelXP,
    completedLessons: [...new Set(studyHistory.map((record) => record.lessonId))],
    completedBugs: legacyBugProgress.fixedBugIds,
    completedBattles: [],
    unlockedAchievements: [],
    lastActivityAt: activityHistory[0]?.completedAt ?? null,
    activityHistory,
  }

  return unlockEligibleAchievements(baseProgress, migratedAt).progress
}

export function getUserProgress(userId?: string | null): UserProgress {
  const normalizedUserId = normalizeUserId(userId)
  if (!normalizedUserId) return createEmptyProgress('guest')

  const storage = readProgressStorage(USER_PROGRESS_STORAGE_KEY)
  const current = normalizeProgress(storage[normalizedUserId], normalizedUserId)
  if (current) return current

  const migrated = migrateLegacyProgress(normalizedUserId)
  writeProgressStorage(USER_PROGRESS_STORAGE_KEY, {
    ...storage,
    [normalizedUserId]: migrated,
  })
  return migrated
}

export function hasCompletedSource(
  userId: string | null | undefined,
  source: ProgressSource,
  sourceId: string,
): boolean {
  const normalizedUserId = normalizeUserId(userId)
  if (!normalizedUserId) return false

  const progress = getUserProgress(normalizedUserId)
  return progress[completionKeyBySource[source]].includes(sourceId)
}

function completeSource(
  userId: string | null | undefined,
  amount: number,
  source: ProgressSource,
  sourceId: string,
  metadata: ProgressMetadata = {},
): ProgressMutationResult {
  const normalizedUserId = normalizeUserId(userId)
  if (!normalizedUserId) {
    return {
      persisted: false,
      duplicate: false,
      xpAwarded: 0,
      previousLevel: 1,
      leveledUp: false,
      progress: createEmptyProgress('guest'),
      newAchievements: [],
      reason: 'anonymous-user',
    }
  }

  const progress = getUserProgress(normalizedUserId)
  const completionKey = completionKeyBySource[source]
  if (progress[completionKey].includes(sourceId)) {
    return {
      persisted: true,
      duplicate: true,
      xpAwarded: 0,
      previousLevel: progress.level,
      leveledUp: false,
      progress,
      newAchievements: [],
    }
  }

  const completedAt = new Date().toISOString()
  const xpAwarded = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0))
  const totalXP = progress.totalXP + xpAwarded
  const level = calculateLevel(totalXP)
  const activity: ProgressActivity = {
    id: createActivityId(source, sourceId),
    userId: normalizedUserId,
    type: activityTypeBySource[source],
    source,
    sourceId,
    title:
      typeof metadata.lesson === 'string'
        ? metadata.lesson
        : typeof metadata.title === 'string'
          ? metadata.title
          : sourceId,
    xpAwarded,
    completedAt,
    metadata: normalizeMetadata(metadata),
  }
  const nextProgress: UserProgress = {
    ...progress,
    totalXP,
    level: level.level,
    currentLevelXP: level.currentLevelXP,
    nextLevelXP: level.nextLevelXP,
    [completionKey]: [...progress[completionKey], sourceId],
    lastActivityAt: completedAt,
    activityHistory: [activity, ...progress.activityHistory],
  }
  const achievementResult = unlockEligibleAchievements(nextProgress, completedAt)
  const storage = readProgressStorage(USER_PROGRESS_STORAGE_KEY)
  const persisted = writeProgressStorage(USER_PROGRESS_STORAGE_KEY, {
    ...storage,
    [normalizedUserId]: achievementResult.progress,
  })

  return {
    persisted,
    duplicate: false,
    xpAwarded: persisted ? xpAwarded : 0,
    previousLevel: progress.level,
    leveledUp: persisted && achievementResult.progress.level > progress.level,
    progress: persisted ? achievementResult.progress : progress,
    newAchievements: persisted ? achievementResult.newAchievements : [],
    reason: persisted ? undefined : 'storage-unavailable',
  }
}

export function addXP(
  userId: string | null | undefined,
  amount: number,
  source: ProgressSource,
  sourceId: string,
  metadata: ProgressMetadata = {},
): ProgressMutationResult {
  return completeSource(userId, amount, source, sourceId, metadata)
}

export function markSourceCompleted(
  userId: string | null | undefined,
  source: ProgressSource,
  sourceId: string,
  metadata: ProgressMetadata = {},
): ProgressMutationResult {
  return completeSource(userId, 0, source, sourceId, metadata)
}

export function checkAchievements(userId?: string | null): UnlockedProgressAchievement[] {
  const normalizedUserId = normalizeUserId(userId)
  if (!normalizedUserId) return []

  const progress = getUserProgress(normalizedUserId)
  const result = unlockEligibleAchievements(progress, new Date().toISOString())
  if (!result.newAchievements.length) return []

  const storage = readProgressStorage(USER_PROGRESS_STORAGE_KEY)
  const persisted = writeProgressStorage(USER_PROGRESS_STORAGE_KEY, {
    ...storage,
    [normalizedUserId]: result.progress,
  })
  return persisted ? result.newAchievements : []
}

export function getAchievementSummary(userId?: string | null): AchievementSummary {
  const progress = getUserProgress(userId)
  const unlockedIds = new Set(progress.unlockedAchievements.map((achievement) => achievement.id))

  return {
    total: PROGRESS_ACHIEVEMENTS.length,
    unlocked: progress.unlockedAchievements.length,
    locked: PROGRESS_ACHIEVEMENTS.length - progress.unlockedAchievements.length,
    unlockedAchievements: progress.unlockedAchievements,
    nextAchievements: PROGRESS_ACHIEVEMENTS.filter(
      (achievement) => !unlockedIds.has(achievement.id),
    ),
  }
}

export function getStudyLessonXP(levelId: StudyLevelId): number {
  return STUDY_LESSON_XP_BY_LEVEL[levelId]
}
