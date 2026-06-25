/**
 * Serviço de autenticação V1.0 — localStorage (mock).
 *
 * Migração futura para Supabase:
 * - register() → supabase.auth.signUp() + insert em profiles
 * - login()    → supabase.auth.signInWithPassword()
 * - logout()   → supabase.auth.signOut()
 * - getSessionUser() → supabase.auth.getSession() + select profile
 */

import type { AuthUser, LoginInput, RegisterInput } from '@/types/auth'
import { normalizeEmail, isValidEmail } from '@/utils/validation'

const USERS_STORAGE_KEY = 'devroyale_users'
const SESSION_STORAGE_KEY = 'devroyale_session'

const INITIAL_LEVEL = 1
const INITIAL_XP = 0
const INITIAL_XP_TO_NEXT = 500

interface StoredUser extends AuthUser {
  passwordHash: string
}

export type AuthErrorCode = 'EMAIL_EXISTS' | 'USER_NOT_FOUND' | 'WRONG_PASSWORD' | 'VALIDATION'

export class AuthServiceError extends Error {
  code: AuthErrorCode

  constructor(message: string, code: AuthErrorCode) {
    super(message)
    this.name = 'AuthServiceError'
    this.code = code
  }
}

/** Hash simples apenas para mock local — substituir por Supabase Auth */
function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i)
    hash |= 0
  }
  return `mock_${hash.toString(36)}`
}

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredUser[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

function toPublicUser(stored: StoredUser): AuthUser {
  return {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    knowledgeLevel: stored.knowledgeLevel,
    mainLanguage: stored.mainLanguage,
    level: stored.level,
    xp: stored.xp,
    xpToNextLevel: stored.xpToNextLevel,
    totalXpEarned: stored.totalXpEarned,
    createdAt: stored.createdAt,
  }
}

function setSession(userId: string): void {
  localStorage.setItem(SESSION_STORAGE_KEY, userId)
}

function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

function validateRegisterInput(input: RegisterInput): void {
  if (!input.name.trim()) {
    throw new AuthServiceError('Nome é obrigatório.', 'VALIDATION')
  }
  if (!input.email.trim()) {
    throw new AuthServiceError('E-mail é obrigatório.', 'VALIDATION')
  }
  if (!isValidEmail(input.email)) {
    throw new AuthServiceError('Informe um e-mail válido.', 'VALIDATION')
  }
  if (!input.password) {
    throw new AuthServiceError('Senha é obrigatória.', 'VALIDATION')
  }
  if (input.password.length < 6) {
    throw new AuthServiceError('A senha deve ter pelo menos 6 caracteres.', 'VALIDATION')
  }
  if (input.password !== input.confirmPassword) {
    throw new AuthServiceError('As senhas não coincidem.', 'VALIDATION')
  }
  if (!input.knowledgeLevel) {
    throw new AuthServiceError('Selecione seu grau de conhecimento.', 'VALIDATION')
  }
  if (!input.mainLanguage) {
    throw new AuthServiceError('Selecione sua linguagem principal.', 'VALIDATION')
  }
}

function validateLoginInput(input: LoginInput): void {
  if (!input.email.trim()) {
    throw new AuthServiceError('E-mail é obrigatório.', 'VALIDATION')
  }
  if (!input.password) {
    throw new AuthServiceError('Senha é obrigatória.', 'VALIDATION')
  }
}

export function getSessionUser(): AuthUser | null {
  const userId = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!userId) return null

  const users = getStoredUsers()
  const found = users.find((u) => u.id === userId)
  if (!found) {
    clearSession()
    return null
  }

  return toPublicUser(found)
}

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  validateRegisterInput(input)

  const email = normalizeEmail(input.email)
  const users = getStoredUsers()

  if (users.some((u) => u.email === email)) {
    throw new AuthServiceError(
      'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
      'EMAIL_EXISTS',
    )
  }

  const newUser: StoredUser = {
    id: generateId(),
    name: input.name.trim(),
    email,
    knowledgeLevel: input.knowledgeLevel as AuthUser['knowledgeLevel'],
    mainLanguage: input.mainLanguage as AuthUser['mainLanguage'],
    level: INITIAL_LEVEL,
    xp: INITIAL_XP,
    xpToNextLevel: INITIAL_XP_TO_NEXT,
    totalXpEarned: INITIAL_XP,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(input.password),
  }

  users.push(newUser)
  saveStoredUsers(users)
  setSession(newUser.id)

  return toPublicUser(newUser)
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  validateLoginInput(input)

  const email = normalizeEmail(input.email)
  const users = getStoredUsers()
  const found = users.find((u) => u.email === email)

  if (!found) {
    throw new AuthServiceError(
      'Não encontramos uma conta com este e-mail. Verifique ou cadastre-se.',
      'USER_NOT_FOUND',
    )
  }

  if (found.passwordHash !== hashPassword(input.password)) {
    throw new AuthServiceError('Senha incorreta. Tente novamente.', 'WRONG_PASSWORD')
  }

  setSession(found.id)
  return toPublicUser(found)
}

export function logoutUser(): void {
  clearSession()
}
