import type { DatabaseProfile } from './profile'
import type {
  DatabaseFriendBlock,
  DatabaseFriendship,
  FriendshipStatus,
} from './social'
import type {
  DatabasePublicRoom,
  DatabaseRoom,
  DatabaseRoomInvite,
  DatabaseRoomMember,
  MatchFormat,
  RoomDifficulty,
  RoomInviteStatus,
  RoomKind,
  RoomLanguage,
  RoomMemberRole,
  RoomStatus,
  RoomVisibility,
} from './room'
import type {
  DatabaseMatchmakingTicket,
  MatchmakingStatus,
} from './matchmaking'

type ProfileInsert = Omit<DatabaseProfile, 'created_at' | 'updated_at'> & {
  created_at?: string
  updated_at?: string
}

type ProfileUpdate = Partial<Omit<DatabaseProfile, 'id' | 'created_at'>>

type FriendshipInsert = Omit<
  DatabaseFriendship,
  'id' | 'status' | 'created_at' | 'updated_at'
> & {
  id?: string
  status?: FriendshipStatus
  created_at?: string
  updated_at?: string
}

type FriendshipUpdate = Partial<Omit<DatabaseFriendship, 'id' | 'created_at'>>

type FriendBlockInsert = Omit<DatabaseFriendBlock, 'created_at'> & {
  created_at?: string
}

type RoomInsert = Omit<DatabaseRoom, 'id' | 'created_at' | 'updated_at' | 'closed_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
  closed_at?: string | null
}

type RoomUpdate = Partial<Omit<DatabaseRoom, 'id' | 'created_at'>>

type RoomMemberInsert = Omit<DatabaseRoomMember, 'joined_at' | 'updated_at'> & {
  joined_at?: string
  updated_at?: string
}

type RoomMemberUpdate = Partial<Pick<DatabaseRoomMember, 'role' | 'ready' | 'updated_at'>>

type RoomInviteInsert = Omit<DatabaseRoomInvite, 'id' | 'status' | 'created_at' | 'expires_at'> & {
  id?: string
  status?: RoomInviteStatus
  created_at?: string
  expires_at?: string
}

type RoomInviteUpdate = Partial<Pick<DatabaseRoomInvite, 'status' | 'expires_at'>>

type MatchmakingTicketInsert = Omit<
  DatabaseMatchmakingTicket,
  'ticket_id' | 'status' | 'joined_at' | 'heartbeat_at' | 'updated_at' | 'matched_room_id' | 'matched_at'
> & {
  ticket_id?: string
  status?: MatchmakingStatus
  joined_at?: string
  heartbeat_at?: string
  updated_at?: string
  matched_room_id?: string | null
  matched_at?: string | null
}

type MatchmakingTicketUpdate = Partial<
  Omit<DatabaseMatchmakingTicket, 'ticket_id' | 'user_id' | 'joined_at'>
>

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: DatabaseProfile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      friendships: {
        Row: DatabaseFriendship
        Insert: FriendshipInsert
        Update: FriendshipUpdate
        Relationships: [
          {
            foreignKeyName: 'friendships_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friendships_addressee_id_fkey'
            columns: ['addressee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      friend_blocks: {
        Row: DatabaseFriendBlock
        Insert: FriendBlockInsert
        Update: never
        Relationships: [
          {
            foreignKeyName: 'friend_blocks_blocker_id_fkey'
            columns: ['blocker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friend_blocks_blocked_id_fkey'
            columns: ['blocked_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      rooms: {
        Row: DatabaseRoom
        Insert: RoomInsert
        Update: RoomUpdate
        Relationships: []
      }
      room_members: {
        Row: DatabaseRoomMember
        Insert: RoomMemberInsert
        Update: RoomMemberUpdate
        Relationships: []
      }
      room_invites: {
        Row: DatabaseRoomInvite
        Insert: RoomInviteInsert
        Update: RoomInviteUpdate
        Relationships: []
      }
      matchmaking_queue: {
        Row: DatabaseMatchmakingTicket
        Insert: MatchmakingTicketInsert
        Update: MatchmakingTicketUpdate
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      send_friend_request: {
        Args: { p_addressee_id: string }
        Returns: DatabaseFriendship
      }
      create_multiplayer_room: {
        Args: {
          p_visibility?: RoomVisibility
          p_language?: RoomLanguage
          p_difficulty?: RoomDifficulty
          p_match_format?: MatchFormat
          p_allow_spectators?: boolean
        }
        Returns: DatabaseRoom
      }
      join_room_by_code: {
        Args: { p_code: string }
        Returns: DatabaseRoom
      }
      get_current_room: {
        Args: Record<never, never>
        Returns: DatabaseRoom | null
      }
      update_room_settings: {
        Args: {
          p_room_id: string
          p_visibility: RoomVisibility
          p_language: RoomLanguage
          p_difficulty: RoomDifficulty
          p_match_format: MatchFormat
          p_allow_spectators: boolean
        }
        Returns: DatabaseRoom
      }
      set_room_ready: {
        Args: { p_room_id: string; p_ready: boolean }
        Returns: DatabaseRoom
      }
      start_room_countdown: {
        Args: { p_room_id: string }
        Returns: DatabaseRoom
      }
      leave_room: {
        Args: { p_room_id: string }
        Returns: undefined
      }
      kick_room_member: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: undefined
      }
      cancel_room: {
        Args: { p_room_id: string }
        Returns: undefined
      }
      send_room_invite: {
        Args: { p_room_id: string; p_recipient_id: string }
        Returns: DatabaseRoomInvite
      }
      accept_room_invite: {
        Args: { p_invite_id: string }
        Returns: DatabaseRoom
      }
      decline_room_invite: {
        Args: { p_invite_id: string }
        Returns: DatabaseRoomInvite
      }
      list_public_rooms: {
        Args: { p_limit?: number }
        Returns: DatabasePublicRoom[]
      }
      join_quick_match_queue: {
        Args: { p_language: RoomLanguage; p_difficulty: RoomDifficulty }
        Returns: DatabaseMatchmakingTicket
      }
      poll_quick_match: {
        Args: { p_ticket_id: string }
        Returns: DatabaseMatchmakingTicket
      }
      heartbeat_quick_match: {
        Args: { p_ticket_id: string }
        Returns: DatabaseMatchmakingTicket
      }
      cancel_quick_match: {
        Args: { p_ticket_id: string }
        Returns: DatabaseMatchmakingTicket
      }
      get_quick_match_status: {
        Args: { p_ticket_id?: string | null }
        Returns: DatabaseMatchmakingTicket | null
      }
    }
    Enums: {
      friendship_status: FriendshipStatus
      room_visibility: RoomVisibility
      room_status: RoomStatus
      room_language: RoomLanguage
      room_difficulty: RoomDifficulty
      match_format: MatchFormat
      room_member_role: RoomMemberRole
      room_invite_status: RoomInviteStatus
      room_kind: RoomKind
      matchmaking_status: MatchmakingStatus
    }
    CompositeTypes: Record<never, never>
  }
}
