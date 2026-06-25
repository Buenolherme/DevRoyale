import type {
  SaveStudyHistoryInput,
  SaveStudyHistoryResult,
  StudyHistoryRecord,
  StudyLevelId,
  StudyTopicId,
} from '@/types'

export const STUDY_HISTORY_STORAGE_KEY = 'devroyale_study_history_v1'

type StudyHistoryStorage = Record<string, StudyHistoryRecord[]>

const anonymousUserIds = new Set(['guest', 'anonymous', 'visitor'])

const studyTopicIds: StudyTopicId[] = [
  'python',
  'javascript',
  'html-css',
  'sql',
  'git-github',
  'logic',
  'frontend',
  'backend',
]

const studyLevelIds: StudyLevelId[] = [
  'never-coded',
  'basic',
  'intermediate',
  'advanced',
]

function hasPersistentStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isStudyTopicId(value: unknown): value is StudyTopicId {
  return typeof value === 'string' && studyTopicIds.includes(value as StudyTopicId)
}

function isStudyLevelId(value: unknown): value is StudyLevelId {
  return typeof value === 'string' && studyLevelIds.includes(value as StudyLevelId)
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ]
}

function normalizeHistoryRecord(value: unknown, userId: string): StudyHistoryRecord | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Partial<StudyHistoryRecord>
  if (
    typeof record.id !== 'string' ||
    record.userId !== userId ||
    !isStudyTopicId(record.topicId) ||
    typeof record.topicLabel !== 'string' ||
    !isStudyLevelId(record.levelId) ||
    typeof record.levelLabel !== 'string' ||
    typeof record.lessonId !== 'string' ||
    typeof record.lessonTitle !== 'string' ||
    typeof record.lessonTheme !== 'string' ||
    typeof record.completedAt !== 'string' ||
    Number.isNaN(new Date(record.completedAt).getTime())
  ) {
    return null
  }

  return {
    id: record.id,
    userId,
    topicId: record.topicId,
    topicLabel: record.topicLabel,
    levelId: record.levelId,
    levelLabel: record.levelLabel,
    lessonId: record.lessonId,
    lessonTitle: record.lessonTitle,
    lessonTheme: record.lessonTheme,
    completedAt: record.completedAt,
    strengths: normalizeStringList(record.strengths),
    reinforcements: normalizeStringList(record.reinforcements),
  }
}

function normalizeUserHistory(value: unknown, userId: string): StudyHistoryRecord[] {
  if (!Array.isArray(value)) return []

  const uniqueLessons = new Map<string, StudyHistoryRecord>()

  value.forEach((item) => {
    const record = normalizeHistoryRecord(item, userId)
    if (!record) return

    const completionKey = getStudyCompletionKey(record)
    const current = uniqueLessons.get(completionKey)

    if (!current || record.completedAt > current.completedAt) {
      uniqueLessons.set(completionKey, record)
    }
  })

  return [...uniqueLessons.values()].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )
}

function readStudyHistoryStorage(): StudyHistoryStorage {
  if (!hasPersistentStorage()) return {}

  try {
    const raw = window.localStorage.getItem(STUDY_HISTORY_STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).map(([userId, history]) => [
        userId,
        normalizeUserHistory(history, userId),
      ]),
    )
  } catch {
    return {}
  }
}

function writeStudyHistoryStorage(storage: StudyHistoryStorage): boolean {
  if (!hasPersistentStorage()) return false

  try {
    window.localStorage.setItem(STUDY_HISTORY_STORAGE_KEY, JSON.stringify(storage))
    return true
  } catch {
    return false
  }
}

function createHistoryRecordId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `study-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeUserId(userId?: string | null): string | null {
  if (typeof userId !== 'string') return null

  const normalized = userId.trim()
  if (normalized.length === 0 || anonymousUserIds.has(normalized.toLowerCase())) {
    return null
  }

  return normalized
}

export function getStudyCompletionKey(
  completion: Pick<StudyHistoryRecord, 'topicId' | 'levelId' | 'lessonId'>,
): string {
  return `${completion.topicId}:${completion.levelId}:${completion.lessonId}`
}

export function getStudyHistoryByUser(userId?: string | null): StudyHistoryRecord[] {
  const normalizedUserId = normalizeUserId(userId)
  if (!normalizedUserId) return []

  const storage = readStudyHistoryStorage()
  return normalizeUserHistory(storage[normalizedUserId], normalizedUserId)
}

export function getCompletedStudyLessons(userId?: string | null): StudyHistoryRecord[] {
  return getStudyHistoryByUser(userId)
}

export function getCompletedStudyLessonIds(userId?: string | null): string[] {
  return getCompletedStudyLessons(userId).map((record) => record.lessonId)
}

export function isStudyLessonCompleted(
  userId: string | null | undefined,
  completion: Pick<StudyHistoryRecord, 'topicId' | 'levelId' | 'lessonId'>,
): boolean {
  const completionKey = getStudyCompletionKey(completion)

  return getStudyHistoryByUser(userId).some(
    (record) => getStudyCompletionKey(record) === completionKey,
  )
}

export function saveCompletedStudyLesson(
  userId: string | null | undefined,
  input: SaveStudyHistoryInput,
): SaveStudyHistoryResult {
  const normalizedUserId = normalizeUserId(userId)
  if (!normalizedUserId) {
    return {
      persisted: false,
      alreadyCompleted: false,
      record: null,
      history: [],
      reason: 'anonymous-user',
    }
  }

  const storage = readStudyHistoryStorage()
  const currentHistory = normalizeUserHistory(storage[normalizedUserId], normalizedUserId)
  const completionKey = getStudyCompletionKey(input)
  const existingRecord = currentHistory.find(
    (record) => getStudyCompletionKey(record) === completionKey,
  )

  if (existingRecord) {
    return {
      persisted: true,
      alreadyCompleted: true,
      record: existingRecord,
      history: currentHistory,
    }
  }

  const record: StudyHistoryRecord = {
    ...input,
    id: createHistoryRecordId(),
    userId: normalizedUserId,
    completedAt: new Date().toISOString(),
    strengths: normalizeStringList(input.strengths),
    reinforcements: normalizeStringList(input.reinforcements),
  }
  const nextHistory = [record, ...currentHistory]
  const persisted = writeStudyHistoryStorage({
    ...storage,
    [normalizedUserId]: nextHistory,
  })

  return {
    persisted,
    alreadyCompleted: false,
    record: persisted ? record : null,
    history: persisted ? nextHistory : currentHistory,
    reason: persisted ? undefined : 'storage-unavailable',
  }
}
