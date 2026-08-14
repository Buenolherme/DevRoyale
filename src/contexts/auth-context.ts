import { createContext } from 'react'
import type {
  AuthState,
  LoginInput,
  RegisterInput,
  RegisterResult,
} from '@/types/auth'
import type { Profile, UpdateProfileInput } from '@/types/profile'

export interface AuthContextValue extends AuthState {
  // Aliases mantidos para compatibilidade com os consumidores da V1.5.
  isAuthenticated: boolean
  isLoading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<RegisterResult>
  logout: () => Promise<void>
  updateProfile: (input: UpdateProfileInput) => Promise<Profile>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
