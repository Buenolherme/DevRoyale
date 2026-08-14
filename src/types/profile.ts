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
