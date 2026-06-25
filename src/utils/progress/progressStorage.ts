import type { UserProgress } from '@/types'

export type UserProgressStorage = Record<string, UserProgress>

export function hasPersistentProgressStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readProgressStorage(storageKey: string): UserProgressStorage {
  if (!hasPersistentProgressStorage()) return {}

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as UserProgressStorage
  } catch {
    return {}
  }
}

export function writeProgressStorage(
  storageKey: string,
  storage: UserProgressStorage,
): boolean {
  if (!hasPersistentProgressStorage()) return false

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(storage))
    return true
  } catch {
    return false
  }
}
