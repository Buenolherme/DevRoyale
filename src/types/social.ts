export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'

export type SocialRelationshipState =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'friend'
  | 'blocked'

export type PresenceStatus = 'online' | 'in_battle' | 'spectating'

export type DatabaseFriendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
}

export type DatabaseFriendBlock = {
  blocker_id: string
  blocked_id: string
  created_at: string
}

export interface SocialProfile {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface SocialSearchResult extends SocialProfile {
  relationshipId: string | null
  socialState: SocialRelationshipState
}

export interface FriendRequest {
  friendshipId: string
  profile: SocialProfile
  createdAt: string
}

export interface Friend {
  friendshipId: string
  profile: SocialProfile
  friendsSince: string
}

export interface OnlinePresence {
  userId: string
  username: string
  status: PresenceStatus
}
