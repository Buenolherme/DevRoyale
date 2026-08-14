import type { SocialProfile } from './social'

export type RoomVisibility = 'public' | 'private'
export type RoomStatus =
  | 'waiting'
  | 'ready'
  | 'starting'
  | 'in_match'
  | 'finished'
  | 'cancelled'
export type RoomLanguage = 'python' | 'javascript' | 'sql' | 'html-css'
export type RoomDifficulty = 'never' | 'basic' | 'intermediate' | 'advanced'
export type MatchFormat = 'bo1' | 'bo3' | 'bo5'
export type RoomMemberRole = 'host' | 'player'
export type RoomInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export type DatabaseRoom = {
  id: string
  code: string
  host_id: string
  visibility: RoomVisibility
  status: RoomStatus
  language: RoomLanguage
  difficulty: RoomDifficulty
  match_format: MatchFormat
  allow_spectators: boolean
  max_players: number
  countdown_started_at: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

export type DatabaseRoomMember = {
  room_id: string
  user_id: string
  role: RoomMemberRole
  ready: boolean
  joined_at: string
  updated_at: string
}

export type DatabaseRoomInvite = {
  id: string
  room_id: string
  sender_id: string
  recipient_id: string
  status: RoomInviteStatus
  created_at: string
  expires_at: string
}

export interface RoomMember {
  roomId: string
  userId: string
  role: RoomMemberRole
  ready: boolean
  joinedAt: string
  profile: SocialProfile
}

export interface Room {
  id: string
  code: string
  hostId: string
  visibility: RoomVisibility
  status: RoomStatus
  language: RoomLanguage
  difficulty: RoomDifficulty
  matchFormat: MatchFormat
  allowSpectators: boolean
  maxPlayers: 2
  countdownStartedAt: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  members: RoomMember[]
}

export interface RoomSettings {
  visibility: RoomVisibility
  language: RoomLanguage
  difficulty: RoomDifficulty
  matchFormat: MatchFormat
  allowSpectators: boolean
}

export interface PublicRoom {
  roomId: string
  code: string
  hostId: string
  hostUsername: string
  hostDisplayName: string
  language: RoomLanguage
  difficulty: RoomDifficulty
  matchFormat: MatchFormat
  allowSpectators: boolean
  playerCount: number
  createdAt: string
}

export type DatabasePublicRoom = {
  room_id: string
  code: string
  host_id: string
  host_username: string
  host_display_name: string
  language: RoomLanguage
  difficulty: RoomDifficulty
  match_format: MatchFormat
  allow_spectators: boolean
  player_count: number
  created_at: string
}

export interface RoomInvite {
  id: string
  roomId: string
  senderId: string
  recipientId: string
  status: RoomInviteStatus
  createdAt: string
  expiresAt: string
  sender: SocialProfile
  room: Omit<Room, 'members'>
}

export interface RoomRealtimeEvent {
  type: 'room_changed'
  entity: 'rooms' | 'room_members' | 'room_invites'
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  roomId: string
  record?: Record<string, unknown>
}

export interface RoomInviteRealtimeEvent {
  type: 'room_invite_changed'
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  inviteId: string
  roomId: string
}

export const ROOM_LANGUAGE_LABELS: Record<RoomLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
  'html-css': 'HTML/CSS',
}

export const ROOM_DIFFICULTY_LABELS: Record<RoomDifficulty, string> = {
  never: 'Nunca programei',
  basic: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

export const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  bo1: 'Melhor de 1',
  bo3: 'Melhor de 3',
  bo5: 'Melhor de 5',
}
