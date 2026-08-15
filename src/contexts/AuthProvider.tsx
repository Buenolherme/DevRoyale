import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  createAuthUser,
  getSession,
  observeAuthChanges,
  signIn,
  signOut,
  signUp,
} from '@/lib/auth-service'
import { getProfile, updateCurrentProfile } from '@/lib/profile-service'
import { cancelActiveQueueBestEffort } from '@/lib/matchmaking-service'
import type {
  AuthState,
  LoginInput,
  RegisterInput,
  RegisterResult,
} from '@/types/auth'
import type { UpdateProfileInput } from '@/types/profile'
import { AuthContext } from './auth-context'

const INITIAL_AUTH_STATE: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  authenticated: false,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_AUTH_STATE)
  const hydrationIdRef = useRef(0)
  const mountedRef = useRef(true)

  const hydrateSession = useCallback(async (session: AuthState['session']) => {
    const hydrationId = ++hydrationIdRef.current

    if (!session) {
      if (mountedRef.current) {
        setAuthState({
          user: null,
          session: null,
          profile: null,
          loading: false,
          authenticated: false,
        })
      }
      return
    }

    setAuthState((current) => ({
      ...current,
      session,
      loading: current.user?.id !== session.user.id,
      authenticated: true,
    }))

    let profile = null
    try {
      profile = await getProfile(session.user.id)
    } catch {
      // Uma falha de profile não invalida uma sessão Auth válida.
    }

    if (!mountedRef.current || hydrationId !== hydrationIdRef.current) return

    setAuthState({
      user: createAuthUser(session.user, profile),
      session,
      profile,
      loading: false,
      authenticated: true,
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    const restoreSession = async () => {
      try {
        const session = await getSession()
        if (!cancelled) await hydrateSession(session)
      } catch {
        if (!cancelled) await hydrateSession(null)
      }
    }

    const unsubscribe = observeAuthChanges((session) => {
      // Evita chamadas Supabase dentro do callback síncrono de onAuthStateChange.
      queueMicrotask(() => {
        if (!cancelled) void hydrateSession(session)
      })
    })

    void restoreSession()

    return () => {
      cancelled = true
      mountedRef.current = false
      hydrationIdRef.current += 1
      unsubscribe()
    }
  }, [hydrateSession])

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await signIn(input)
      await hydrateSession(session)
    },
    [hydrateSession],
  )

  const register = useCallback(
    async (input: RegisterInput): Promise<RegisterResult> => {
      const result = await signUp(input)
      if (result.session) await hydrateSession(result.session)
      return { requiresEmailConfirmation: result.requiresEmailConfirmation }
    },
    [hydrateSession],
  )

  const logout = useCallback(async () => {
    await cancelActiveQueueBestEffort()
    await signOut()
    await hydrateSession(null)
  }, [hydrateSession])

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const profile = await updateCurrentProfile(input)

    setAuthState((current) => ({
      ...current,
      profile,
      user: current.session ? createAuthUser(current.session.user, profile) : current.user,
    }))

    return profile
  }, [])

  const contextValue = useMemo(
    () => ({
      ...authState,
      isAuthenticated: authState.authenticated,
      isLoading: authState.loading,
      login,
      register,
      logout,
      updateProfile,
    }),
    [authState, login, logout, register, updateProfile],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
