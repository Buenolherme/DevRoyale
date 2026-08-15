import { supabase } from '@/lib/supabase'
import type {
  DatabaseRoom,
  DatabaseRoomInvite,
  DatabaseRoomMember,
  PublicRoom,
  Room,
  RoomInvite,
  RoomSettings,
  SocialProfile,
} from '@/types'

const ROOM_COLUMNS =
  'id, code, host_id, visibility, room_kind, status, language, difficulty, match_format, allow_spectators, max_players, countdown_started_at, created_at, updated_at, closed_at'
const MEMBER_COLUMNS = 'room_id, user_id, role, ready, joined_at, updated_at'
const INVITE_COLUMNS =
  'id, room_id, sender_id, recipient_id, status, created_at, expires_at'
const PROFILE_COLUMNS = 'id, username, display_name, avatar_url'

export type RoomErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'INVALID_CODE'
  | 'ROOM_NOT_FOUND'
  | 'NOT_ROOM_MEMBER'
  | 'ALREADY_IN_ROOM'
  | 'ROOM_FULL'
  | 'HOST_ONLY'
  | 'PLAYERS_NOT_READY'
  | 'INVITE_UNAVAILABLE'
  | 'SOCIAL_RESTRICTION'
  | 'QUICK_MATCH_RESTRICTED'
  | 'NETWORK'
  | 'UNEXPECTED'

export class RoomServiceError extends Error {
  code: RoomErrorCode

  constructor(message: string, code: RoomErrorCode) {
    super(message)
    this.name = 'RoomServiceError'
    this.code = code
  }
}

type PublicProfileRow = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

const roomChangeListeners = new Set<() => void>()

function notifyRoomChange(): void {
  roomChangeListeners.forEach((listener) => listener())
}

export function subscribeToRoomChanges(listener: () => void): () => void {
  roomChangeListeners.add(listener)
  return () => roomChangeListeners.delete(listener)
}

function errorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error ?? '')
  const value = (error as { message?: unknown }).message
  return typeof value === 'string' ? value : ''
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    /failed to fetch|network request failed|fetch failed|networkerror/i.test(errorMessage(error))
  )
}

function mapRoomError(error: unknown): RoomServiceError {
  if (error instanceof RoomServiceError) return error

  const message = errorMessage(error)
  if (/quick_match_restricted/.test(message)) {
    return new RoomServiceError(
      'Esta ação não está disponível em partidas rápidas.',
      'QUICK_MATCH_RESTRICTED',
    )
  }

  const mappings: Array<[RegExp, string, RoomErrorCode]> = [
    [/not_authenticated/, 'Entre na sua conta para acessar o Multiplayer.', 'NOT_AUTHENTICATED'],
    [/room_not_found/, 'Sala não encontrada. Confira o código e tente novamente.', 'ROOM_NOT_FOUND'],
    [/not_room_member/, 'Você não faz parte desta sala.', 'NOT_ROOM_MEMBER'],
    [/already_in_active_room/, 'Você já está em uma sala ativa.', 'ALREADY_IN_ROOM'],
    [/room_full/, 'A sala já está completa.', 'ROOM_FULL'],
    [/host_only|cannot_kick_host/, 'Somente o host pode realizar esta ação.', 'HOST_ONLY'],
    [/players_not_ready/, 'A batalha só pode começar com dois jogadores prontos.', 'PLAYERS_NOT_READY'],
    [
      /invite_expired/,
      'Este convite expirou. Peça ao host para enviar outro.',
      'INVITE_UNAVAILABLE',
    ],
    [
      /invite_unavailable|duplicate_room_invite|already_room_member/,
      'Este convite não está disponível agora.',
      'INVITE_UNAVAILABLE',
    ],
    [
      /social_pair_blocked|invite_friends_only/,
      'As regras sociais não permitem esta ação.',
      'SOCIAL_RESTRICTION',
    ],
    [
      /room_unavailable|room_settings_locked|room_ready_locked|countdown_unavailable|player_not_found/,
      'Esta ação não está disponível no estado atual da sala.',
      'UNEXPECTED',
    ],
  ]

  const mapping = mappings.find(([pattern]) => pattern.test(message))
  if (mapping) return new RoomServiceError(mapping[1], mapping[2])

  if (isNetworkError(error)) {
    return new RoomServiceError(
      'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
      'NETWORK',
    )
  }

  return new RoomServiceError(
    'Não foi possível concluir a ação na sala. Tente novamente.',
    'UNEXPECTED',
  )
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new RoomServiceError(
      'Entre na sua conta para acessar o Multiplayer.',
      'NOT_AUTHENTICATED',
    )
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

function toRoom(row: DatabaseRoom, members: Room['members'] = []): Room {
  return {
    id: row.id,
    roomKind: row.room_kind,
    code: row.code,
    hostId: row.host_id,
    visibility: row.visibility,
    status: row.status,
    language: row.language,
    difficulty: row.difficulty,
    matchFormat: row.match_format,
    allowSpectators: row.allow_spectators,
    maxPlayers: 2,
    countdownStartedAt: row.countdown_started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    members,
  }
}

function withoutMembers(room: Room): Omit<Room, 'members'> {
  const safeRoom: Partial<Room> = { ...room }
  delete safeRoom.members
  return safeRoom as Omit<Room, 'members'>
}

async function getProfilesByIds(userIds: string[]): Promise<Map<string, SocialProfile>> {
  const uniqueIds = [...new Set(userIds)]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .in('id', uniqueIds)

  if (error) throw error
  return new Map(data.map((row) => [row.id, toSocialProfile(row)]))
}

async function loadRoomState(row: DatabaseRoom): Promise<Room> {
  const currentUserId = await getCurrentUserId()
  const { data: memberRows, error } = await supabase
    .from('room_members')
    .select(MEMBER_COLUMNS)
    .eq('room_id', row.id)
    .order('joined_at')

  if (error) throw error
  if (!memberRows.some((member) => member.user_id === currentUserId)) {
    throw new RoomServiceError('Você não faz parte desta sala.', 'NOT_ROOM_MEMBER')
  }

  const profiles = await getProfilesByIds(memberRows.map((member) => member.user_id))
  const members = memberRows.flatMap((member: DatabaseRoomMember) => {
    const profile = profiles.get(member.user_id)
    return profile
      ? [{
          roomId: member.room_id,
          userId: member.user_id,
          role: member.role,
          ready: member.ready,
          joinedAt: member.joined_at,
          profile,
        }]
      : []
  })

  return toRoom(row, members)
}

export function normalizeRoomCode(value: string): string {
  const alphanumeric = value.toUpperCase().replace(/[^A-Z2-9]/g, '')
  const body = (alphanumeric.startsWith('DR') ? alphanumeric.slice(2) : alphanumeric).slice(0, 5)
  return body ? `DR-${body}` : ''
}

export function isValidRoomCode(value: string): boolean {
  return /^DR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(normalizeRoomCode(value))
}

export async function createRoom(settings: RoomSettings): Promise<Room> {
  try {
    const { data, error } = await supabase.rpc('create_multiplayer_room', {
      p_visibility: settings.visibility,
      p_language: settings.language,
      p_difficulty: settings.difficulty,
      p_match_format: settings.matchFormat,
      p_allow_spectators: settings.allowSpectators,
    })
    if (error) throw error
    notifyRoomChange()
    return loadRoomState(data)
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function joinRoomByCode(code: string): Promise<Room> {
  const normalizedCode = normalizeRoomCode(code)
  if (!isValidRoomCode(normalizedCode)) {
    throw new RoomServiceError('Digite um código de sala válido.', 'INVALID_CODE')
  }

  try {
    const { data, error } = await supabase.rpc('join_room_by_code', {
      p_code: normalizedCode,
    })
    if (error) throw error
    notifyRoomChange()
    return loadRoomState(data)
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function getRoom(code: string): Promise<Room> {
  try {
    const normalizedCode = normalizeRoomCode(code)
    const { data, error } = await supabase
      .from('rooms')
      .select(ROOM_COLUMNS)
      .eq('code', normalizedCode)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new RoomServiceError(
        'Sala não encontrada. Confira o código e tente novamente.',
        'ROOM_NOT_FOUND',
      )
    }
    return loadRoomState(data)
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function getCurrentRoom(): Promise<Room | null> {
  try {
    const { data, error } = await supabase.rpc('get_current_room')
    if (error) throw error
    return data ? loadRoomState(data) : null
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function updateRoomSettings(roomId: string, settings: RoomSettings): Promise<Room> {
  try {
    const { data, error } = await supabase.rpc('update_room_settings', {
      p_room_id: roomId,
      p_visibility: settings.visibility,
      p_language: settings.language,
      p_difficulty: settings.difficulty,
      p_match_format: settings.matchFormat,
      p_allow_spectators: settings.allowSpectators,
    })
    if (error) throw error
    notifyRoomChange()
    return loadRoomState(data)
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function setReady(roomId: string, ready: boolean): Promise<Room> {
  try {
    const { data, error } = await supabase.rpc('set_room_ready', {
      p_room_id: roomId,
      p_ready: ready,
    })
    if (error) throw error
    notifyRoomChange()
    return loadRoomState(data)
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function startCountdown(roomId: string): Promise<Room> {
  try {
    const { data, error } = await supabase.rpc('start_room_countdown', {
      p_room_id: roomId,
    })
    if (error) throw error
    notifyRoomChange()
    return loadRoomState(data)
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function leaveRoom(roomId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('leave_room', { p_room_id: roomId })
    if (error) throw error
    notifyRoomChange()
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function kickPlayer(roomId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('kick_room_member', {
      p_room_id: roomId,
      p_user_id: userId,
    })
    if (error) throw error
    notifyRoomChange()
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function cancelRoom(roomId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('cancel_room', { p_room_id: roomId })
    if (error) throw error
    notifyRoomChange()
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function listPublicRooms(): Promise<PublicRoom[]> {
  try {
    const { data, error } = await supabase.rpc('list_public_rooms', { p_limit: 20 })
    if (error) throw error
    return data.map((room) => ({
      roomId: room.room_id,
      code: room.code,
      hostId: room.host_id,
      hostUsername: room.host_username,
      hostDisplayName: room.host_display_name,
      language: room.language,
      difficulty: room.difficulty,
      matchFormat: room.match_format,
      allowSpectators: room.allow_spectators,
      playerCount: Number(room.player_count),
      createdAt: room.created_at,
    }))
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function sendRoomInvite(roomId: string, recipientId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('send_room_invite', {
      p_room_id: roomId,
      p_recipient_id: recipientId,
    })
    if (error) throw error
    notifyRoomChange()
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function getRoomInvites(): Promise<RoomInvite[]> {
  try {
    const currentUserId = await getCurrentUserId()
    const { data: invites, error } = await supabase
      .from('room_invites')
      .select(INVITE_COLUMNS)
      .eq('recipient_id', currentUserId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    if (invites.length === 0) return []

    const [profiles, roomsResponse] = await Promise.all([
      getProfilesByIds(invites.map((invite) => invite.sender_id)),
      supabase
        .from('rooms')
        .select(ROOM_COLUMNS)
        .in('id', [...new Set(invites.map((invite) => invite.room_id))]),
    ])

    if (roomsResponse.error) throw roomsResponse.error
    const rooms = new Map(roomsResponse.data.map((room) => [room.id, room]))

    return invites.flatMap((invite: DatabaseRoomInvite) => {
      const sender = profiles.get(invite.sender_id)
      const room = rooms.get(invite.room_id)
      return sender && room
        ? [{
            id: invite.id,
            roomId: invite.room_id,
            senderId: invite.sender_id,
            recipientId: invite.recipient_id,
            status: invite.status,
            createdAt: invite.created_at,
            expiresAt: invite.expires_at,
            sender,
            room: withoutMembers(toRoom(room)),
          }]
        : []
    })
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function getPendingRoomInviteCount(): Promise<number> {
  try {
    const currentUserId = await getCurrentUserId()
    const { count, error } = await supabase
      .from('room_invites')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', currentUserId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (error) throw error
    return count ?? 0
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function acceptRoomInvite(inviteId: string): Promise<Room> {
  try {
    const { data, error } = await supabase.rpc('accept_room_invite', {
      p_invite_id: inviteId,
    })
    if (error) throw error
    notifyRoomChange()
    return loadRoomState(data)
  } catch (error) {
    throw mapRoomError(error)
  }
}

export async function declineRoomInvite(inviteId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('decline_room_invite', {
      p_invite_id: inviteId,
    })
    if (error) throw error
    notifyRoomChange()
  } catch (error) {
    throw mapRoomError(error)
  }
}
