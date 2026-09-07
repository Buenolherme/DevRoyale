import type {
  MatchFormat,
  RoomDifficulty,
  RoomKind,
  RoomLanguage,
} from './room'

export type MultiplayerMatchStatus =
  | 'preparing'
  | 'active'
  | 'between_rounds'
  | 'finished'
  | 'cancelled'
  | 'abandoned'
export type MultiplayerPlayerStatus = 'active' | 'disconnected' | 'finished' | 'surrendered'
export type MultiplayerRoundStatus = 'waiting' | 'active' | 'finished' | 'cancelled'
export type MultiplayerSubmissionMode = 'run' | 'submit'
export type MultiplayerSubmissionStatus =
  | 'queued'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'compile_error'
  | 'runtime_error'
  | 'time_limit'
  | 'validation_error'
  | 'internal_error'
export type MultiplayerValidationType =
  | 'program_output'
  | 'function_tests'
  | 'sql_result'
  | 'html_css_structure'

export type DatabaseMultiplayerChallenge = {
  id: string
  slug: string
  language: RoomLanguage
  difficulty: RoomDifficulty
  title: string
  statement: string
  instructions: string[]
  starter_code: string
  public_examples: unknown[]
  validation_type: MultiplayerValidationType
  judge_config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DatabaseMultiplayerMatch = {
  id: string
  room_id: string
  status: MultiplayerMatchStatus
  language: RoomLanguage
  difficulty: RoomDifficulty
  match_format: MatchFormat
  current_round: number
  winner_id: string | null
  started_at: string
  finished_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export type DatabaseMultiplayerMatchPlayer = {
  match_id: string
  user_id: string
  rounds_won: number
  status: MultiplayerPlayerStatus
  joined_at: string
  updated_at: string
}

export type DatabaseMultiplayerRound = {
  id: string
  match_id: string
  round_number: number
  challenge_id: string
  status: MultiplayerRoundStatus
  winner_id: string | null
  started_at: string
  finished_at: string | null
  created_at: string
}

export type DatabaseMultiplayerSubmission = {
  id: string
  client_request_id: string
  match_id: string
  round_id: string
  user_id: string
  mode: MultiplayerSubmissionMode
  status: MultiplayerSubmissionStatus
  source_code: string
  created_at: string
  judging_started_at: string | null
  judged_at: string | null
  execution_time: number | null
  memory_used: number | null
  public_message: string | null
  stdout: string | null
}

export interface MultiplayerMatch {
  id: string
  roomId: string
  roomKind: RoomKind
  status: MultiplayerMatchStatus
  language: RoomLanguage
  difficulty: RoomDifficulty
  matchFormat: MatchFormat
  currentRound: number
  winnerId: string | null
  startedAt: string
  finishedAt: string | null
  cancelledAt: string | null
}

export interface MultiplayerMatchPlayer {
  userId: string
  roundsWon: number
  status: MultiplayerPlayerStatus
  joinedAt: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface MultiplayerRound {
  id: string
  roundNumber: number
  status: MultiplayerRoundStatus
  winnerId: string | null
  startedAt: string
  finishedAt: string | null
}

export interface MultiplayerChallenge {
  id: string
  slug: string
  title: string
  statement: string
  instructions: string[]
  starterCode: string
  publicExamples: unknown[]
  validationType: MultiplayerValidationType
}

export interface MultiplayerSubmissionResult {
  id: string
  requestId: string
  mode: MultiplayerSubmissionMode
  status: MultiplayerSubmissionStatus
  createdAt: string
  judgingStartedAt: string | null
  judgedAt: string | null
  executionTime: number | null
  memoryUsed: number | null
  message: string | null
  stdout: string | null
}

export interface MultiplayerMatchState {
  match: MultiplayerMatch
  players: MultiplayerMatchPlayer[]
  round: MultiplayerRound
  previousRound: MultiplayerRound | null
  challenge: MultiplayerChallenge
  ownLatestSubmission: MultiplayerSubmissionResult | null
}

export interface JudgeSubmissionResponse {
  submissionId: string
  status: MultiplayerSubmissionStatus
  message: string
  stdout: string | null
}

export interface MultiplayerBattleRealtimeEvent {
  type:
    | 'match_started'
    | 'round_started'
    | 'player_submitted'
    | 'submission_finished'
    | 'round_finished'
    | 'score_changed'
    | 'match_finished'
    | 'player_connection'
    | 'match_cancelled'
  matchId: string
  roundId?: string
  userId?: string
  submissionId?: string
  mode?: MultiplayerSubmissionMode
  winnerId?: string | null
  status?: string
  currentRound?: number
  roundsWon?: number
  startedAt?: string
}
