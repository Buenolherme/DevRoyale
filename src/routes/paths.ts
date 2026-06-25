export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  CADASTRO: '/cadastro',
  DASHBOARD: '/dashboard',
  BATALHA_DEVS: '/batalha-devs',
  AREA_ESTUDOS: '/area-estudos',
  BUG_ARENA: '/bug-arena',
  INTERVIEW_MODE: '/interview-mode',
  PERFIL: '/perfil',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
