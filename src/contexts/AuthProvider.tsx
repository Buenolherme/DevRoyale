import { useCallback, useState, type ReactNode } from 'react'
import type { LoginInput, RegisterInput, AuthUser } from '@/types/auth'
import { getSessionUser, loginUser, logoutUser, registerUser } from '@/lib/auth-service'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getSessionUser())
  const [isLoading] = useState(false)

  const login = useCallback(async (input: LoginInput) => {
    const loggedUser = await loginUser(input)
    setUser(loggedUser)
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const newUser = await registerUser(input)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    logoutUser()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
