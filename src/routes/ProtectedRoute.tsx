import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from './paths'
import { PageState } from '@/components/ui'

import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="page-container route-loading">
        <PageState loading title="Restaurando sua sessão..." description="Estamos preparando sua conta e seu perfil." />
      </div>
    )
  }

  if (!isAuthenticated) {
    const requestedRoute = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={ROUTES.LOGIN} state={{ from: requestedRoute }} replace />
  }

  return children
}
