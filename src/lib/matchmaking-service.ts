import { supabase } from '@/lib/supabase'
import { getCurrentRoom } from '@/lib/room-service'
import type {
  DatabaseMatchmakingTicket,
  MatchmakingStatus,
  MatchmakingTicket,
  QuickMatchPreferences,
  Room,
} from '@/types'

export class MatchmakingServiceError extends Error {
  readonly code: string

  constructor(
    message: string,
    code: string,
  ) {
    super(message)
    this.name = 'MatchmakingServiceError'
    this.code = code
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }
  return String(error)
}

function matchmakingError(error: unknown): MatchmakingServiceError {
  const message = errorMessage(error)
  const mappings: Array<[RegExp, string, string]> = [
    [/not_authenticated/, 'Entre na sua conta para buscar uma partida.', 'NOT_AUTHENTICATED'],
    [/active_room_blocks_queue/, 'Saia da sala atual antes de buscar outra partida.', 'ACTIVE_ROOM'],
    [/already_searching/, 'Uma busca já está ativa em outra aba.', 'ALREADY_SEARCHING'],
    [/queue_ticket_not_found/, 'Esta busca não está mais ativa.', 'TICKET_NOT_FOUND'],
    [/Failed to fetch|NetworkError|fetch failed/i, 'Sem conexão com o matchmaking. Tente novamente.', 'NETWORK'],
  ]

  for (const [pattern, friendlyMessage, code] of mappings) {
    if (pattern.test(message)) return new MatchmakingServiceError(friendlyMessage, code)
  }

  return new MatchmakingServiceError('Não foi possível atualizar o matchmaking.', 'UNKNOWN')
}

function toTicket(row: DatabaseMatchmakingTicket): MatchmakingTicket {
  return {
    ticketId: row.ticket_id,
    userId: row.user_id,
    status: row.status,
    language: row.language,
    difficulty: row.difficulty,
    matchedRoomId: row.matched_room_id,
    joinedAt: row.joined_at,
    updatedAt: row.updated_at,
    heartbeatAt: row.heartbeat_at,
    matchedAt: row.matched_at,
  }
}

export async function joinQueue(preferences: QuickMatchPreferences) {
  const { data, error } = await supabase.rpc('join_quick_match_queue', {
    p_language: preferences.language,
    p_difficulty: preferences.difficulty,
  })
  if (error) throw matchmakingError(error)
  return data ? toTicket(data) : null
}

export async function pollQueue(ticket: string) {
  const { data, error } = await supabase.rpc('poll_quick_match', { p_ticket_id: ticket })
  if (error) throw matchmakingError(error)
  return data ? toTicket(data) : null
}

export async function heartbeatQueue(ticket: string) {
  const { data, error } = await supabase.rpc('heartbeat_quick_match', { p_ticket_id: ticket })
  if (error) throw matchmakingError(error)
  return data ? toTicket(data) : null
}

export async function cancelQueue(ticket: string): Promise<MatchmakingTicket> {
  const { data, error } = await supabase.rpc('cancel_quick_match', { p_ticket_id: ticket })
  if (error) throw matchmakingError(error)
  return toTicket(data as DatabaseMatchmakingTicket)
}

export async function getQueueStatus(): Promise<MatchmakingTicket | null> {
  const { data, error } = await supabase.rpc('get_quick_match_status', {})
  if (error) throw matchmakingError(error)
  return data ? toTicket(data as DatabaseMatchmakingTicket) : null
}

export async function getCurrentQuickMatch(): Promise<{
  ticket: MatchmakingTicket
  room: Room | null
} | null> {
  const ticket = await getQueueStatus()
  if (!ticket) return null

  const room = await getCurrentRoom()
  return {
    ticket,
    room: room?.roomKind === 'quick_match' ? room : null,
  }
}

export async function cancelActiveQueueBestEffort(): Promise<void> {
  try {
    const ticket = await getQueueStatus()
    if (ticket?.status === ('searching' satisfies MatchmakingStatus)) {
      await cancelQueue(ticket.ticketId)
    }
  } catch {
    // Logout must still complete when matchmaking is temporarily unavailable.
  }
}
