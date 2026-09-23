import { supabase } from '@/lib/supabase'
import { createRoom, getCurrentRoom, RoomServiceError, sendRoomInvite } from '@/lib/room-service'
import type {
  DatabaseFriendship,
  Friend,
  FriendRequest,
  FriendshipStatus,
  SocialProfile,
  SocialSearchResult,
  SocialOverview,
  SocialRelationshipState,
} from '@/types/social'

const PUBLIC_PROFILE_COLUMNS = 'id, username, display_name, avatar_url'
const FRIENDSHIP_COLUMNS =
  'id, requester_id, addressee_id, status, created_at, updated_at'

export type SocialErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'INVALID_SEARCH'
  | 'ACTION_UNAVAILABLE'
  | 'NETWORK'
  | 'UNEXPECTED'

export class SocialServiceError extends Error {
  code: SocialErrorCode

  constructor(message: string, code: SocialErrorCode) {
    super(message)
    this.name = 'SocialServiceError'
    this.code = code
  }
}

type PublicProfileRow = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

const socialChangeListeners = new Set<() => void>()

function notifySocialChange(): void {
  socialChangeListeners.forEach((listener) => listener())
}

export function subscribeToSocialChanges(listener: () => void): () => void {
  socialChangeListeners.add(listener)
  return () => socialChangeListeners.delete(listener)
}

function errorDetails(error: unknown): { code?: string; message: string } {
  if (!error || typeof error !== 'object') {
    return { message: String(error ?? '') }
  }

  const candidate = error as { code?: unknown; message?: unknown }
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : '',
  }
}

function isNetworkError(error: unknown): boolean {
  const { message } = errorDetails(error)
  return (
    error instanceof TypeError ||
    /failed to fetch|network request failed|fetch failed|networkerror/i.test(message)
  )
}

function mapSocialError(error: unknown): SocialServiceError {
  if (error instanceof SocialServiceError) return error

  const { code } = errorDetails(error)

  if (code === 'P0001' || code === '23505' || code === '23514' || code === '42501') {
    return new SocialServiceError(
      'Esta ação social não está disponível agora.',
      'ACTION_UNAVAILABLE',
    )
  }

  if (isNetworkError(error)) {
    return new SocialServiceError(
      'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
      'NETWORK',
    )
  }

  return new SocialServiceError(
    'Não foi possível concluir a ação social. Tente novamente.',
    'UNEXPECTED',
  )
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new SocialServiceError('Entre na sua conta para acessar seus amigos.', 'NOT_AUTHENTICATED')
  }

  return data.user.id
}

function toSocialProfile(row: PublicProfileRow): SocialProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  }
}

async function getProfilesByIds(userIds: string[]): Promise<Map<string, SocialProfile>> {
  const uniqueIds = [...new Set(userIds)]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .in('id', uniqueIds)

  if (error) throw mapSocialError(error)

  return new Map(data.map((row) => [row.id, toSocialProfile(row)]))
}

async function getRelationshipsForCurrentUser(userId: string): Promise<DatabaseFriendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_COLUMNS)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .in('status', ['pending', 'accepted'])

  if (error) throw mapSocialError(error)
  return data
}

async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('friend_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)

  if (error) throw mapSocialError(error)
  return new Set(data.map((block) => block.blocked_id))
}

export function normalizeSocialSearch(query: string): string {
  return query.trim().replace(/^@+/, '').toLowerCase()
}

export async function searchProfiles(query: string): Promise<SocialSearchResult[]> {
  const normalizedQuery = normalizeSocialSearch(query)
  if (normalizedQuery.length < 2) return []

  if (!/^[a-z0-9_]{2,24}$/.test(normalizedQuery)) {
    throw new SocialServiceError(
      'Busque usando letras minúsculas, números ou underscore.',
      'INVALID_SEARCH',
    )
  }

  try {
    const currentUserId = await getCurrentUserId()
    const [profilesResponse, relationships, blockedUserIds] = await Promise.all([
      supabase
        .from('profiles')
        .select(PUBLIC_PROFILE_COLUMNS)
        .gte('username', normalizedQuery)
        .lt('username', `${normalizedQuery}\uffff`)
        .neq('id', currentUserId)
        .order('username')
        .limit(20),
      getRelationshipsForCurrentUser(currentUserId),
      getBlockedUserIds(currentUserId),
    ])

    if (profilesResponse.error) throw profilesResponse.error

    return profilesResponse.data.map((row) => {
      const relationship = relationships.find(
        (item) => item.requester_id === row.id || item.addressee_id === row.id,
      )

      if (blockedUserIds.has(row.id)) {
        return {
          ...toSocialProfile(row),
          relationshipId: relationship?.id ?? null,
          socialState: 'blocked' as const,
        }
      }

      if (relationship?.status === 'accepted') {
        return {
          ...toSocialProfile(row),
          relationshipId: relationship.id,
          socialState: 'friend' as const,
        }
      }

      if (relationship?.status === 'pending') {
        return {
          ...toSocialProfile(row),
          relationshipId: relationship.id,
          socialState:
            relationship.requester_id === currentUserId
              ? ('pending_sent' as const)
              : ('pending_received' as const),
        }
      }

      return {
        ...toSocialProfile(row),
        relationshipId: null,
        socialState: 'none' as const,
      }
    })
  } catch (error) {
    throw mapSocialError(error)
  }
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('send_friend_request', {
      p_addressee_id: addresseeId,
    })
    if (error) throw error
    notifySocialChange()
  } catch (error) {
    throw mapSocialError(error)
  }
}

async function respondToFriendRequest(
  friendshipId: string,
  status: Extract<FriendshipStatus, 'accepted' | 'rejected'>,
): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('friendships')
      .update({ status })
      .eq('id', friendshipId)
      .eq('addressee_id', currentUserId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new SocialServiceError(
        'Esta solicitação não está mais disponível.',
        'ACTION_UNAVAILABLE',
      )
    }
    notifySocialChange()
  } catch (error) {
    throw mapSocialError(error)
  }
}

export function acceptFriendRequest(friendshipId: string): Promise<void> {
  return respondToFriendRequest(friendshipId, 'accepted')
}

export function rejectFriendRequest(friendshipId: string): Promise<void> {
  return respondToFriendRequest(friendshipId, 'rejected')
}

export async function removeFriend(friendshipId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new SocialServiceError(
        'Esta amizade não está mais disponível.',
        'ACTION_UNAVAILABLE',
      )
    }
    notifySocialChange()
  } catch (error) {
    throw mapSocialError(error)
  }
}

export async function blockUser(blockedUserId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId()
    if (currentUserId === blockedUserId) {
      throw new SocialServiceError('Esta ação social não está disponível.', 'ACTION_UNAVAILABLE')
    }

    const { error } = await supabase.from('friend_blocks').insert({
      blocker_id: currentUserId,
      blocked_id: blockedUserId,
    })

    if (error && error.code !== '23505') throw error
    notifySocialChange()
  } catch (error) {
    throw mapSocialError(error)
  }
}

export async function cancelFriendRequest(friendshipId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('friendships').delete().eq('id', friendshipId)
      .eq('requester_id', currentUserId).eq('status', 'pending')
      .select('id').maybeSingle()

    if (error) throw error
    if (!data) throw new SocialServiceError('Esta solicitação não está mais pendente.', 'ACTION_UNAVAILABLE')
    notifySocialChange()
  } catch (error) {
    throw mapSocialError(error)
  }
}

export async function getSocialOverview(): Promise<SocialOverview> {
  try {
    const currentUserId = await getCurrentUserId()
    const [relationships, blockedIds] = await Promise.all([
      getRelationshipsForCurrentUser(currentUserId), getBlockedUserIds(currentUserId),
    ])
    const otherId = (relationship: DatabaseFriendship) => relationship.requester_id === currentUserId
      ? relationship.addressee_id : relationship.requester_id
    const profiles = await getProfilesByIds([...relationships.map(otherId), ...blockedIds])
    const overview: SocialOverview = { friends: [], incomingRequests: [], outgoingRequests: [], blockedProfiles: [] }

    for (const relationship of relationships) {
      const profile = profiles.get(otherId(relationship))
      if (!profile || blockedIds.has(profile.id)) continue
      if (relationship.status === 'accepted') {
        overview.friends.push({ friendshipId: relationship.id, profile, friendsSince: relationship.updated_at })
      } else {
        const requests = relationship.requester_id === currentUserId ? overview.outgoingRequests : overview.incomingRequests
        requests.push({ friendshipId: relationship.id, profile, createdAt: relationship.created_at })
      }
    }
    overview.blockedProfiles = [...blockedIds].flatMap((id) => {
      const profile = profiles.get(id)
      return profile ? [profile] : []
    }).sort((first, second) => first.username.localeCompare(second.username))
    overview.incomingRequests.sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    overview.outgoingRequests.sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    return overview
  } catch (error) {
    throw mapSocialError(error)
  }
}

export async function getSocialRelationship(targetUserId: string): Promise<{
  relationshipId: string | null
  socialState: SocialRelationshipState
}> {
  try {
    const currentUserId = await getCurrentUserId()
    const [relationshipResponse, blockResponse] = await Promise.all([
      supabase.from('friendships').select(FRIENDSHIP_COLUMNS)
        .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentUserId})`)
        .in('status', ['pending', 'accepted']).maybeSingle(),
      supabase.from('friend_blocks').select('blocked_id').eq('blocker_id', currentUserId)
        .eq('blocked_id', targetUserId).maybeSingle(),
    ])
    if (relationshipResponse.error) throw relationshipResponse.error
    if (blockResponse.error) throw blockResponse.error
    const relationship = relationshipResponse.data
    return {
      relationshipId: relationship?.id ?? null,
      socialState: blockResponse.data ? 'blocked' : relationship?.status === 'accepted' ? 'friend'
        : relationship?.status === 'pending'
          ? relationship.requester_id === currentUserId ? 'pending_sent' : 'pending_received'
          : 'none',
    }
  } catch (error) {
    throw mapSocialError(error)
  }
}

export async function inviteFriendToBattle(friendUserId: string) {
  const currentUserId = await getCurrentUserId()
  // Another tab may have joined a room since the social page loaded.
  const room = await getCurrentRoom() ?? await createRoom({
    visibility: 'private', language: 'python', difficulty: 'basic', matchFormat: 'bo1', allowSpectators: false,
  })
  if (room.roomKind === 'quick_match') {
    throw new RoomServiceError('Conclua ou saia da partida rápida antes de convidar um amigo.', 'QUICK_MATCH_RESTRICTED')
  }
  if (room.hostId !== currentUserId) {
    throw new RoomServiceError('Você já está em uma sala de outro jogador. Saia dela para criar seu convite.', 'HOST_ONLY')
  }
  if (room.status !== 'waiting' && room.status !== 'ready') {
    throw new RoomServiceError('Sua sala já está em uma batalha. Conclua a partida para enviar um convite.', 'INVITE_UNAVAILABLE')
  }
  if (room.members.length >= room.maxPlayers) {
    throw new RoomServiceError('Sua sala já está completa. Libere uma vaga antes de convidar.', 'ROOM_FULL')
  }
  await sendRoomInvite(room.id, friendUserId)
  return room
}

export async function unblockUser(blockedUserId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId()
    const { error } = await supabase
      .from('friend_blocks')
      .delete()
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', blockedUserId)

    if (error) throw error
    notifySocialChange()
  } catch (error) {
    throw mapSocialError(error)
  }
}

async function getRequests(
  direction: 'incoming' | 'outgoing',
): Promise<FriendRequest[]> {
  try {
    const currentUserId = await getCurrentUserId()
    const query = supabase
      .from('friendships')
      .select(FRIENDSHIP_COLUMNS)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const { data, error } =
      direction === 'incoming'
        ? await query.eq('addressee_id', currentUserId)
        : await query.eq('requester_id', currentUserId)

    if (error) throw error

    const otherUserIds = data.map((relationship) =>
      direction === 'incoming' ? relationship.requester_id : relationship.addressee_id,
    )
    const profiles = await getProfilesByIds(otherUserIds)

    return data.flatMap((relationship) => {
      const otherUserId =
        direction === 'incoming' ? relationship.requester_id : relationship.addressee_id
      const profile = profiles.get(otherUserId)
      return profile
        ? [{ friendshipId: relationship.id, profile, createdAt: relationship.created_at }]
        : []
    })
  } catch (error) {
    throw mapSocialError(error)
  }
}

export function getIncomingRequests(): Promise<FriendRequest[]> {
  return getRequests('incoming')
}

export async function getIncomingRequestCount(): Promise<number> {
  try {
    const currentUserId = await getCurrentUserId()
    const { count, error } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('addressee_id', currentUserId)

    if (error) throw error
    return count ?? 0
  } catch (error) {
    throw mapSocialError(error)
  }
}

export function getOutgoingRequests(): Promise<FriendRequest[]> {
  return getRequests('outgoing')
}

export async function getFriends(): Promise<Friend[]> {
  try {
    const currentUserId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('friendships')
      .select(FRIENDSHIP_COLUMNS)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)

    if (error) throw error

    const otherUserIds = data.map((relationship) =>
      relationship.requester_id === currentUserId
        ? relationship.addressee_id
        : relationship.requester_id,
    )
    const profiles = await getProfilesByIds(otherUserIds)

    return data
      .flatMap((relationship) => {
        const otherUserId =
          relationship.requester_id === currentUserId
            ? relationship.addressee_id
            : relationship.requester_id
        const profile = profiles.get(otherUserId)
        return profile
          ? [
              {
                friendshipId: relationship.id,
                profile,
                friendsSince: relationship.updated_at,
              },
            ]
          : []
      })
      .sort((first, second) => first.profile.username.localeCompare(second.profile.username))
  } catch (error) {
    throw mapSocialError(error)
  }
}
