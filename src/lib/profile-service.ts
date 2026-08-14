import { supabase } from '@/lib/supabase'
import type {
  Database,
  DatabaseProfile,
  Profile,
  UpdateProfileInput,
} from '@/types/profile'

const PROFILE_COLUMNS =
  'id, username, display_name, avatar_url, bio, created_at, updated_at'

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/
export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 80
export const PROFILE_BIO_MAX_LENGTH = 180
export const PROFILE_AVATAR_URL_MAX_LENGTH = 2048

export type ProfileErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'USERNAME_INVALID'
  | 'USERNAME_EXISTS'
  | 'VALIDATION'
  | 'NETWORK'
  | 'UNEXPECTED'

export class ProfileServiceError extends Error {
  code: ProfileErrorCode

  constructor(message: string, code: ProfileErrorCode) {
    super(message)
    this.name = 'ProfileServiceError'
    this.code = code
  }
}

function toProfile(row: DatabaseProfile): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function errorDetails(error: unknown): { code?: string; message: string } {
  if (!error || typeof error !== 'object') {
    return { message: String(error ?? '') }
  }

  const candidate = error as { code?: unknown; message?: unknown }
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : '',
  }
}

function isNetworkError(error: unknown): boolean {
  const { message } = errorDetails(error)
  return (
    error instanceof TypeError ||
    /failed to fetch|network request failed|fetch failed|networkerror/i.test(message)
  )
}

function mapProfileError(error: unknown): ProfileServiceError {
  const details = errorDetails(error)

  if (details.code === '23505') {
    return new ProfileServiceError(
      'Este username já está sendo utilizado. Escolha outro.',
      'USERNAME_EXISTS',
    )
  }

  if (isNetworkError(error)) {
    return new ProfileServiceError(
      'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
      'NETWORK',
    )
  }

  return new ProfileServiceError(
    'Não foi possível acessar o perfil agora. Tente novamente.',
    'UNEXPECTED',
  )
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username))
}

function normalizeDisplayName(displayName: string): string {
  const normalized = displayName.trim()

  if (!normalized) {
    throw new ProfileServiceError('Nome é obrigatório.', 'VALIDATION')
  }

  if (normalized.length > PROFILE_DISPLAY_NAME_MAX_LENGTH) {
    throw new ProfileServiceError(
      `O nome deve ter no máximo ${PROFILE_DISPLAY_NAME_MAX_LENGTH} caracteres.`,
      'VALIDATION',
    )
  }

  return normalized
}

function normalizeAvatarUrl(avatarUrl: string | null): string | null {
  const normalized = avatarUrl?.trim() ?? ''
  if (!normalized) return null

  if (normalized.length > PROFILE_AVATAR_URL_MAX_LENGTH) {
    throw new ProfileServiceError('A URL do avatar é muito longa.', 'VALIDATION')
  }

  try {
    const url = new URL(normalized)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
  } catch {
    throw new ProfileServiceError('Informe uma URL válida para o avatar.', 'VALIDATION')
  }

  return normalized
}

function normalizeBio(bio: string | null): string | null {
  const normalized = bio?.trim() ?? ''
  if (!normalized) return null

  if (normalized.length > PROFILE_BIO_MAX_LENGTH) {
    throw new ProfileServiceError(
      `A bio deve ter no máximo ${PROFILE_BIO_MAX_LENGTH} caracteres.`,
      'VALIDATION',
    )
  }

  return normalized
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw mapProfileError(error)
  return data ? toProfile(data) : null
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new ProfileServiceError('Entre na sua conta para acessar o perfil.', 'NOT_AUTHENTICATED')
  }

  return getProfile(data.user.id)
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username)
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new ProfileServiceError(
      'Use de 3 a 24 caracteres: letras minúsculas, números ou underscore.',
      'USERNAME_INVALID',
    )
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalized)
    .limit(1)
    .maybeSingle()

  if (error) throw mapProfileError(error)
  return data === null
}

export async function updateCurrentProfile(input: UpdateProfileInput): Promise<Profile> {
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw new ProfileServiceError('Entre na sua conta para editar o perfil.', 'NOT_AUTHENTICATED')
  }

  const updates: Database['public']['Tables']['profiles']['Update'] = {
    updated_at: new Date().toISOString(),
  }

  if (input.username !== undefined) {
    const username = normalizeUsername(input.username)
    if (!USERNAME_PATTERN.test(username)) {
      throw new ProfileServiceError(
        'Use de 3 a 24 caracteres: letras minúsculas, números ou underscore.',
        'USERNAME_INVALID',
      )
    }
    updates.username = username
  }

  if (input.displayName !== undefined) {
    updates.display_name = normalizeDisplayName(input.displayName)
  }

  if (input.avatarUrl !== undefined) {
    updates.avatar_url = normalizeAvatarUrl(input.avatarUrl)
  }

  if (input.bio !== undefined) {
    updates.bio = normalizeBio(input.bio)
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', authData.user.id)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) throw mapProfileError(error)
  return toProfile(data)
}
