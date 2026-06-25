import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from './paths'

import type { ReactNode } from 'react'

interface GuestOnlyRouteProps {
  children: ReactNode
}

export function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const redirectFrom = (location.state as { from?: string } | null)?.from

  if (isLoading) {
    return (
      <div className="page-container flex min-h-[40vh] items-center justify-center">
        <p className="text-muted">Carregando...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={redirectFrom ?? ROUTES.DASHBOARD} replace />
  }

  return children
}
