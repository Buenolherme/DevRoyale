import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout, RouteErrorFallback } from '@/components/layout'
import { ROUTES } from './paths'
import { ProtectedRoute } from './ProtectedRoute'
import { GuestOnlyRoute } from './GuestOnlyRoute'
import {
  AreaEstudosPage,
  AmigosPage,
  BatalhaDevsPage,
  BugArenaPage,
  CadastroPage,
  DashboardPage,
  HomePage,
  InterviewModePage,
  LoginPage,
  NotFoundPage,
  PerfilPage,
  SobrePage,
} from './lazyPages'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: ROUTES.HOME, element: <HomePage /> },
      {
        path: ROUTES.LOGIN,
        element: (
          <GuestOnlyRoute>
            <LoginPage />
          </GuestOnlyRoute>
        ),
      },
      {
        path: ROUTES.CADASTRO,
        element: (
          <GuestOnlyRoute>
            <CadastroPage />
          </GuestOnlyRoute>
        ),
      },
      {
        path: ROUTES.DASHBOARD,
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.BATALHA_DEVS, element: <BatalhaDevsPage /> },
      { path: '/batalha', element: <Navigate to={ROUTES.BATALHA_DEVS} replace /> },
      { path: ROUTES.AREA_ESTUDOS, element: <AreaEstudosPage /> },
      { path: '/estudos', element: <Navigate to={ROUTES.AREA_ESTUDOS} replace /> },
      { path: ROUTES.BUG_ARENA, element: <BugArenaPage /> },
      { path: ROUTES.INTERVIEW_MODE, element: <InterviewModePage /> },
      { path: '/interview', element: <Navigate to={ROUTES.INTERVIEW_MODE} replace /> },
      { path: ROUTES.SOBRE, element: <SobrePage /> },
      {
        path: ROUTES.AMIGOS,
        element: (
          <ProtectedRoute>
            <AmigosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.PERFIL,
        element: (
          <ProtectedRoute>
            <PerfilPage />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
