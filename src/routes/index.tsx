import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { ROUTES } from './paths'
import { ProtectedRoute } from './ProtectedRoute'
import { GuestOnlyRoute } from './GuestOnlyRoute'
import {
  AreaEstudosPage,
  BatalhaDevsPage,
  BugArenaPage,
  CadastroPage,
  DashboardPage,
  HomePage,
  InterviewModePage,
  LoginPage,
  NotFoundPage,
  PerfilPage,
} from './lazyPages'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
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
      { path: ROUTES.AREA_ESTUDOS, element: <AreaEstudosPage /> },
      { path: ROUTES.BUG_ARENA, element: <BugArenaPage /> },
      { path: ROUTES.INTERVIEW_MODE, element: <InterviewModePage /> },
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
