export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  CADASTRO: '/cadastro',
  DASHBOARD: '/dashboard',
  BATALHA_DEVS: '/batalha-devs',
  MULTIPLAYER: '/batalha/multiplayer',
  ROOM: '/batalha/sala/:code',
  BATTLE_MATCH: '/batalha/match/:matchId',
  AREA_ESTUDOS: '/area-estudos',
  BUG_ARENA: '/bug-arena',
  INTERVIEW_MODE: '/interview-mode',
  PERFIL: '/perfil',
  PUBLIC_PROFILE: '/u/:username',
  AMIGOS: '/amigos',
  SOBRE: '/sobre',
} as const

export const roomPath = (code: string) => `/batalha/sala/${encodeURIComponent(code)}`
export const publicProfilePath = (username: string) => `/u/${encodeURIComponent(username)}`
export const battleMatchPath = (matchId: string) => `/batalha/match/${encodeURIComponent(matchId)}`

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
