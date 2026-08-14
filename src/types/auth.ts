import type { Session } from '@supabase/supabase-js'
import type { Profile } from './profile'

export type KnowledgeLevel = 'never' | 'beginner' | 'basic' | 'intermediate' | 'advanced'

export type MainLanguage =
  | 'python'
  | 'javascript'
  | 'sql'
  | 'html-css'
  | 'java'
  | 'react'
  | 'other'

export interface AuthUser {
  id: string
  name: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  knowledgeLevel: KnowledgeLevel
  mainLanguage: MainLanguage
  level: number
  xp: number
  xpToNextLevel: number
  totalXpEarned: number
  createdAt: string
}

export interface RegisterInput {
  name: string
  username: string
  email: string
  password: string
  confirmPassword: string
  knowledgeLevel: KnowledgeLevel | ''
  mainLanguage: MainLanguage | ''
}

export interface RegisterResult {
  requiresEmailConfirmation: boolean
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  authenticated: boolean
}

export const KNOWLEDGE_LEVEL_OPTIONS: { value: KnowledgeLevel; label: string }[] = [
  { value: 'never', label: 'Nunca programei' },
  { value: 'beginner', label: 'Iniciante' },
  { value: 'basic', label: 'Básico' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
]

export const MAIN_LANGUAGE_OPTIONS: { value: MainLanguage; label: string }[] = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'sql', label: 'SQL' },
  { value: 'html-css', label: 'HTML/CSS' },
  { value: 'java', label: 'Java' },
  { value: 'react', label: 'React' },
  { value: 'other', label: 'Outro' },
]

export function getKnowledgeLevelLabel(level: KnowledgeLevel): string {
  return KNOWLEDGE_LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? level
}

export function getMainLanguageLabel(language: MainLanguage): string {
  return MAIN_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language
}
