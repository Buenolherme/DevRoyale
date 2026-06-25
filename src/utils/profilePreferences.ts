import type { KnowledgeLevel, MainLanguage } from '@/types'

export const PROFILE_PREFERENCES_STORAGE_KEY = 'devroyale_profile_preferences_v1'
export const PROFILE_BIO_MAX_LENGTH = 180
export const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024

export type ProfileExperienceLevel = Exclude<KnowledgeLevel, 'beginner'>

export interface UserProfilePreferences {
  bio: string
  experienceLevel: ProfileExperienceLevel
  favoriteLanguage: MainLanguage
  avatarDataUrl: string | null
}

type ProfilePreferencesStorage = Record<string, UserProfilePreferences>

const experienceLevels: ProfileExperienceLevel[] = [
  'never',
  'basic',
  'intermediate',
  'advanced',
]

const favoriteLanguages: MainLanguage[] = [
  'python',
  'javascript',
  'sql',
  'html-css',
  'java',
  'react',
  'other',
]

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStorage(): ProfilePreferencesStorage {
  if (!hasStorage()) return {}

  try {
    const raw = window.localStorage.getItem(PROFILE_PREFERENCES_STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as ProfilePreferencesStorage)
      : {}
  } catch {
    return {}
  }
}

function normalizeAvatar(value: unknown): string | null {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(value)
    ? value
    : null
}

function normalizePreferences(
  value: unknown,
  fallback: UserProfilePreferences,
): UserProfilePreferences {
  if (!value || typeof value !== 'object') return fallback

  const preferences = value as Partial<UserProfilePreferences>

  return {
    bio:
      typeof preferences.bio === 'string'
        ? preferences.bio.trim().slice(0, PROFILE_BIO_MAX_LENGTH)
        : fallback.bio,
    experienceLevel: experienceLevels.includes(
      preferences.experienceLevel as ProfileExperienceLevel,
    )
      ? (preferences.experienceLevel as ProfileExperienceLevel)
      : fallback.experienceLevel,
    favoriteLanguage: favoriteLanguages.includes(preferences.favoriteLanguage as MainLanguage)
      ? (preferences.favoriteLanguage as MainLanguage)
      : fallback.favoriteLanguage,
    avatarDataUrl: normalizeAvatar(preferences.avatarDataUrl),
  }
}

export function createDefaultProfilePreferences(
  knowledgeLevel: KnowledgeLevel,
  mainLanguage: MainLanguage,
): UserProfilePreferences {
  return {
    bio: '',
    experienceLevel: knowledgeLevel === 'beginner' ? 'basic' : knowledgeLevel,
    favoriteLanguage: mainLanguage,
    avatarDataUrl: null,
  }
}

export function getUserProfilePreferences(
  userId: string,
  fallback: UserProfilePreferences,
): UserProfilePreferences {
  const normalizedUserId = userId.trim()
  if (!normalizedUserId) return fallback

  return normalizePreferences(readStorage()[normalizedUserId], fallback)
}

export function saveUserProfilePreferences(
  userId: string,
  preferences: UserProfilePreferences,
): boolean {
  const normalizedUserId = userId.trim()
  if (
    !normalizedUserId ||
    !hasStorage() ||
    !experienceLevels.includes(preferences.experienceLevel) ||
    !favoriteLanguages.includes(preferences.favoriteLanguage)
  ) {
    return false
  }

  try {
    const storage = readStorage()
    window.localStorage.setItem(
      PROFILE_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        ...storage,
        [normalizedUserId]: normalizePreferences(preferences, {
          bio: '',
          experienceLevel: 'never',
          favoriteLanguage: 'other',
          avatarDataUrl: null,
        }),
      }),
    )
    return true
  } catch {
    return false
  }
}
