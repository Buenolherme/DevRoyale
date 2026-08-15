import type { Room, RoomDifficulty, RoomLanguage } from './room'

export type MatchmakingStatus = 'searching' | 'matched' | 'cancelled' | 'expired'

export type DatabaseMatchmakingTicket = {
  ticket_id: string
  user_id: string
  status: MatchmakingStatus
  language: RoomLanguage
  difficulty: RoomDifficulty
  joined_at: string
  heartbeat_at: string
  updated_at: string
  matched_room_id: string | null
  matched_at: string | null
}

export interface MatchmakingTicket {
  ticketId: string
  userId: string
  status: MatchmakingStatus
  language: RoomLanguage
  difficulty: RoomDifficulty
  joinedAt: string
  heartbeatAt: string
  updatedAt: string
  matchedRoomId: string | null
  matchedAt: string | null
}

export interface QuickMatchPreferences {
  language: RoomLanguage
  difficulty: RoomDifficulty
}

export interface QuickMatchResult {
  ticket: MatchmakingTicket
  room: Room | null
}

export interface MatchmakingRealtimeEvent {
  type: 'match_found' | 'queue_changed' | 'queue_cancelled'
  ticketId: string
  status: MatchmakingStatus
  matchedRoomId: string | null
}
