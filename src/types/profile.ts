export type DatabaseProfile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateProfileInput {
  username?: string
  displayName?: string
  avatarUrl?: string | null
  bio?: string | null
}

type ProfileInsert = Omit<DatabaseProfile, 'created_at' | 'updated_at'> & {
  created_at?: string
  updated_at?: string
}

type ProfileUpdate = Partial<Omit<DatabaseProfile, 'id' | 'created_at'>>

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: DatabaseProfile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
