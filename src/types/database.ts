import type { DatabaseProfile } from './profile'
import type {
  DatabaseFriendBlock,
  DatabaseFriendship,
  FriendshipStatus,
} from './social'

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
    }
    Views: Record<never, never>
    Functions: {
      send_friend_request: {
        Args: { p_addressee_id: string }
        Returns: DatabaseFriendship
      }
    }
    Enums: {
      friendship_status: FriendshipStatus
    }
    CompositeTypes: Record<never, never>
  }
}
