import { supabase } from '@/lib/supabase'
import type {
  DatabaseMultiplayerMatch,
  JudgeSubmissionResponse,
  MultiplayerChallenge,
  MultiplayerMatchPlayer,
  MultiplayerMatchState,
  MultiplayerRound,
  MultiplayerSubmissionMode,
  MultiplayerSubmissionResult,
} from '@/types'

export type MultiplayerBattleErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NOT_FOUND'
  | 'NOT_ACTIVE'
  | 'RATE_LIMITED'
  | 'SOURCE_TOO_LARGE'
  | 'JUDGE_UNAVAILABLE'
  | 'NETWORK'
  | 'UNEXPECTED'

export class MultiplayerBattleServiceError extends Error {
  readonly code: MultiplayerBattleErrorCode

  constructor(message: string, code: MultiplayerBattleErrorCode) {
    super(message)
    this.name = 'MultiplayerBattleServiceError'
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

function battleError(error: unknown): MultiplayerBattleServiceError {
  const message = errorMessage(error)
  const mappings: Array<[RegExp, string, MultiplayerBattleErrorCode]> = [
    [/not_authenticated|session.*expir/i, 'Sua sessão expirou. Entre novamente.', 'NOT_AUTHENTICATED'],
    [/match_not_found|round_not_found/, 'Esta batalha não foi encontrada.', 'NOT_FOUND'],
    [/match_not_active|round_not_active|activation_unavailable|countdown_not_finished|rodada.*não.*disponível/i, 'Esta rodada não está disponível agora.', 'NOT_ACTIVE'],
    [/submission_rate_limited|FunctionsHttpError.*429|Aguarde um instante/i, 'Aguarde um instante antes de avaliar novamente.', 'RATE_LIMITED'],
    [/source_code_size_invalid|20 KB/i, 'O código deve ter no máximo 20 KB.', 'SOURCE_TOO_LARGE'],
    [/judge|avaliador/i, 'O avaliador da Arena está temporariamente indisponível. Tente novamente.', 'JUDGE_UNAVAILABLE'],
    [/Failed to fetch|NetworkError|fetch failed/i, 'Sem conexão com a Arena. Tentando reconectar...', 'NETWORK'],
  ]
  const mapping = mappings.find(([pattern]) => pattern.test(message))
  return mapping
    ? new MultiplayerBattleServiceError(mapping[1], mapping[2])
    : new MultiplayerBattleServiceError('Não foi possível atualizar a batalha.', 'UNEXPECTED')
}

async function functionInvocationError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'context' in error) {
    const context = error.context
    if (context instanceof Response) {
      try {
        const body = await context.clone().json() as { error?: unknown; message?: unknown }
        const message = typeof body.error === 'string'
          ? body.error
          : typeof body.message === 'string'
            ? body.message
            : null
        if (message) return battleError(new Error(message))
      } catch {
        // Fall back to the sanitized SDK error below.
      }
    }
  }
  return battleError(error)
}

export async function activateMatch(roomId: string): Promise<DatabaseMultiplayerMatch> {
  const { data, error } = await supabase.rpc('activate_multiplayer_match', { p_room_id: roomId })
  if (error) throw battleError(error)
  return data
}

export async function getMatch(matchId: string): Promise<MultiplayerMatchState | null> {
  const { data, error } = await supabase.rpc('get_multiplayer_match_state', {
    p_match_id: matchId,
  })
  if (error) throw battleError(error)
  return data
}

export async function getCurrentMatch(): Promise<MultiplayerMatchState | null> {
  const { data, error } = await supabase.rpc('get_multiplayer_match_state', {})
  if (error) throw battleError(error)
  return data
}

export async function getRound(matchId: string): Promise<MultiplayerRound | null> {
  return (await getMatch(matchId))?.round ?? null
}

export async function getChallenge(matchId: string): Promise<MultiplayerChallenge | null> {
  return (await getMatch(matchId))?.challenge ?? null
}

export async function getPlayers(matchId: string): Promise<MultiplayerMatchPlayer[]> {
  return (await getMatch(matchId))?.players ?? []
}

export async function getResult(matchId: string): Promise<MultiplayerSubmissionResult | null> {
  return (await getMatch(matchId))?.ownLatestSubmission ?? null
}

export async function advanceRound(matchId: string): Promise<DatabaseMultiplayerMatch> {
  const { data, error } = await supabase.rpc('advance_multiplayer_round', {
    p_match_id: matchId,
  })
  if (error) throw battleError(error)
  return data
}

async function sendCode(
  state: MultiplayerMatchState,
  sourceCode: string,
  mode: MultiplayerSubmissionMode,
): Promise<JudgeSubmissionResponse> {
  const { data, error } = await supabase.functions.invoke<JudgeSubmissionResponse>(
    'judge-submission',
    {
      body: {
        matchId: state.match.id,
        roundId: state.round.id,
        requestId: crypto.randomUUID(),
        sourceCode,
        mode,
      },
    },
  )
  if (error) throw await functionInvocationError(error)
  if (!data) throw battleError(new Error('judge_empty_response'))
  return data
}

export function runCode(state: MultiplayerMatchState, sourceCode: string) {
  return sendCode(state, sourceCode, 'run')
}

export function submitCode(state: MultiplayerMatchState, sourceCode: string) {
  return sendCode(state, sourceCode, 'submit')
}

export async function surrender(matchId: string): Promise<DatabaseMultiplayerMatch> {
  const { data, error } = await supabase.rpc('surrender_multiplayer_match', {
    p_match_id: matchId,
  })
  if (error) throw battleError(error)
  return data
}
