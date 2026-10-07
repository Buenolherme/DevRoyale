import type { BugLanguage } from '@/types'
import { normalizePracticeSource } from './practiceSource'

export function normalizeBugFix(code: string, language: BugLanguage): string {
  return normalizePracticeSource(code, language)
}

export function validateBugFix(userFix: string, expectedFix: string, language: BugLanguage): boolean {
  return Boolean(userFix.trim()) && normalizeBugFix(userFix, language) === normalizeBugFix(expectedFix, language)
}
