import { lazy } from 'react'

export const HomePage = lazy(() =>
  import('@/pages/Home').then((module) => ({ default: module.HomePage })),
)
export const LoginPage = lazy(() =>
  import('@/pages/Login').then((module) => ({ default: module.LoginPage })),
)
export const CadastroPage = lazy(() =>
  import('@/pages/Cadastro').then((module) => ({ default: module.CadastroPage })),
)
export const DashboardPage = lazy(() =>
  import('@/pages/Dashboard').then((module) => ({ default: module.DashboardPage })),
)
export const BatalhaDevsPage = lazy(() =>
  import('@/pages/BatalhaDevs').then((module) => ({ default: module.BatalhaDevsPage })),
)
export const AreaEstudosPage = lazy(() =>
  import('@/pages/AreaEstudos').then((module) => ({ default: module.AreaEstudosPage })),
)
export const BugArenaPage = lazy(() =>
  import('@/pages/BugArena').then((module) => ({ default: module.BugArenaPage })),
)
export const InterviewModePage = lazy(() =>
  import('@/pages/InterviewMode').then((module) => ({ default: module.InterviewModePage })),
)
export const PerfilPage = lazy(() =>
  import('@/pages/Perfil').then((module) => ({ default: module.PerfilPage })),
)
export const NotFoundPage = lazy(() =>
  import('@/pages/NotFound').then((module) => ({ default: module.NotFoundPage })),
)
