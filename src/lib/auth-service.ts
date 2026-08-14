import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import {
  ProfileServiceError,
  PROFILE_DISPLAY_NAME_MAX_LENGTH,
  isUsernameAvailable,
  isValidUsername,
  normalizeUsername,
} from '@/lib/profile-service'
import { supabase } from '@/lib/supabase'
import type {
  AuthUser,
  KnowledgeLevel,
  LoginInput,
  MainLanguage,
  RegisterInput,
} from '@/types/auth'
import type { Profile } from '@/types/profile'
import { isValidEmail, normalizeEmail } from '@/utils/validation'

const INITIAL_LEVEL = 1
const INITIAL_XP = 0
const INITIAL_XP_TO_NEXT = 500

const KNOWLEDGE_LEVELS: readonly KnowledgeLevel[] = [
  'never',
  'beginner',
  'basic',
  'intermediate',
  'advanced',
]
const MAIN_LANGUAGES: readonly MainLanguage[] = [
  'python',
  'javascript',
  'sql',
  'html-css',
  'java',
  'react',
  'other',
]

export type AuthErrorCode =
  | 'EMAIL_EXISTS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'INVALID_CREDENTIALS'
  | 'NETWORK'
  | 'RATE_LIMIT'
  | 'USERNAME_EXISTS'
  | 'USERNAME_INVALID'
  | 'VALIDATION'
  | 'WEAK_PASSWORD'
  | 'UNEXPECTED'

export class AuthServiceError extends Error {
  code: AuthErrorCode

  constructor(message: string, code: AuthErrorCode) {
    super(message)
    this.name = 'AuthServiceError'
    this.code = code
  }
}

export interface SignUpResult {
  session: Session | null
  user: SupabaseUser
  requiresEmailConfirmation: boolean
}

function errorDetails(error: unknown): { code?: string; message: string; status?: number } {
  if (!error || typeof error !== 'object') {
    return { message: String(error ?? '') }
  }

  const candidate = error as { code?: unknown; message?: unknown; status?: unknown }
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : '',
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
  }
}

function isNetworkError(error: unknown): boolean {
  const { message } = errorDetails(error)
  return (
    error instanceof TypeError ||
    /failed to fetch|network request failed|fetch failed|networkerror/i.test(message)
  )
}

function mapAuthError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) return error

  if (error instanceof ProfileServiceError) {
    if (error.code === 'USERNAME_INVALID') {
      return new AuthServiceError(error.message, 'USERNAME_INVALID')
    }
    if (error.code === 'USERNAME_EXISTS') {
      return new AuthServiceError(error.message, 'USERNAME_EXISTS')
    }
    if (error.code === 'NETWORK') {
      return new AuthServiceError(error.message, 'NETWORK')
    }
    return new AuthServiceError(
      'Não foi possível validar o username agora. Tente novamente.',
      'UNEXPECTED',
    )
  }

  const { code, message, status } = errorDetails(error)
  const normalizedMessage = message.toLowerCase()

  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    /already registered|already exists|email.*registered/.test(normalizedMessage)
  ) {
    return new AuthServiceError(
      'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
      'EMAIL_EXISTS',
    )
  }

  if (
    code === 'weak_password' ||
    /password.*weak|weak.*password|password should be/.test(normalizedMessage)
  ) {
    return new AuthServiceError(
      'A senha não atende aos requisitos de segurança. Use uma senha mais forte.',
      'WEAK_PASSWORD',
    )
  }

  if (code === 'email_not_confirmed' || /email not confirmed/.test(normalizedMessage)) {
    return new AuthServiceError(
      'Confirme seu e-mail antes de entrar.',
      'EMAIL_NOT_CONFIRMED',
    )
  }

  if (
    code === 'invalid_credentials' ||
    status === 400 && /invalid login credentials/.test(normalizedMessage) ||
    /invalid login credentials|invalid credentials/.test(normalizedMessage)
  ) {
    return new AuthServiceError(
      'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
      'INVALID_CREDENTIALS',
    )
  }

  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    status === 429
  ) {
    return new AuthServiceError(
      'Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.',
      'RATE_LIMIT',
    )
  }

  if (/database error saving new user|duplicate key.*username/.test(normalizedMessage)) {
    return new AuthServiceError(
      'Este username já está sendo utilizado. Escolha outro.',
      'USERNAME_EXISTS',
    )
  }

  if (isNetworkError(error)) {
    return new AuthServiceError(
      'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
      'NETWORK',
    )
  }

  return new AuthServiceError(
    'Ocorreu um erro inesperado. Tente novamente em instantes.',
    'UNEXPECTED',
  )
}

function validateRegisterInput(input: RegisterInput): void {
  if (!input.name.trim()) {
    throw new AuthServiceError('Nome é obrigatório.', 'VALIDATION')
  }
  if (input.name.trim().length > PROFILE_DISPLAY_NAME_MAX_LENGTH) {
    throw new AuthServiceError(
      `O nome deve ter no máximo ${PROFILE_DISPLAY_NAME_MAX_LENGTH} caracteres.`,
      'VALIDATION',
    )
  }
  if (!isValidUsername(input.username)) {
    throw new AuthServiceError(
      'Use de 3 a 24 caracteres: letras minúsculas, números ou underscore.',
      'USERNAME_INVALID',
    )
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
    throw new AuthServiceError('A senha deve ter pelo menos 6 caracteres.', 'WEAK_PASSWORD')
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

function metadataString(user: SupabaseUser, key: string): string | null {
  const value: unknown = user.user_metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function metadataKnowledgeLevel(user: SupabaseUser): KnowledgeLevel {
  const value = metadataString(user, 'knowledge_level')
  return KNOWLEDGE_LEVELS.includes(value as KnowledgeLevel)
    ? (value as KnowledgeLevel)
    : 'basic'
}

function metadataMainLanguage(user: SupabaseUser): MainLanguage {
  const value = metadataString(user, 'main_language')
  return MAIN_LANGUAGES.includes(value as MainLanguage)
    ? (value as MainLanguage)
    : 'other'
}

export function createAuthUser(user: SupabaseUser, profile: Profile | null): AuthUser {
  const email = user.email ?? ''
  const metadataUsername = metadataString(user, 'username') ?? ''
  const username = profile?.username ?? normalizeUsername(metadataUsername)
  const displayName =
    profile?.displayName ??
    metadataString(user, 'display_name') ??
    metadataString(user, 'name') ??
    (username || email.split('@')[0] || 'Dev')

  return {
    id: user.id,
    name: displayName,
    email,
    username,
    displayName,
    avatarUrl: profile?.avatarUrl ?? null,
    bio: profile?.bio ?? null,
    knowledgeLevel: metadataKnowledgeLevel(user),
    mainLanguage: metadataMainLanguage(user),
    level: INITIAL_LEVEL,
    xp: INITIAL_XP,
    xpToNextLevel: INITIAL_XP_TO_NEXT,
    totalXpEarned: INITIAL_XP,
    createdAt: profile?.createdAt ?? user.created_at,
  }
}

export async function signUp(input: RegisterInput): Promise<SignUpResult> {
  validateRegisterInput(input)

  const username = normalizeUsername(input.username)
  const displayName = input.name.trim()

  try {
    if (!(await isUsernameAvailable(username))) {
      throw new AuthServiceError(
        'Este username já está sendo utilizado. Escolha outro.',
        'USERNAME_EXISTS',
      )
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(input.email),
      password: input.password,
      options: {
        data: {
          username,
          display_name: displayName,
          knowledge_level: input.knowledgeLevel,
          main_language: input.mainLanguage,
        },
      },
    })

    if (error) throw error
    if (!data.user) throw new AuthServiceError('Não foi possível criar a conta.', 'UNEXPECTED')

    // O Supabase pode ocultar a existência de uma conta e retornar um usuário sem identidades.
    if (data.user.identities && data.user.identities.length === 0) {
      throw new AuthServiceError(
        'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
        'EMAIL_EXISTS',
      )
    }

    return {
      session: data.session,
      user: data.user,
      requiresEmailConfirmation: data.session === null,
    }
  } catch (error) {
    throw mapAuthError(error)
  }
}

export async function signIn(input: LoginInput): Promise<Session> {
  validateLoginInput(input)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(input.email),
      password: input.password,
    })

    if (error) throw error
    if (!data.session) throw new AuthServiceError('Não foi possível iniciar a sessão.', 'UNEXPECTED')
    return data.session
  } catch (error) {
    throw mapAuthError(error)
  }
}

export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    throw mapAuthError(error)
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  } catch (error) {
    throw mapAuthError(error)
  }
}

export function observeAuthChanges(listener: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session)
  })

  return () => data.subscription.unsubscribe()
}
