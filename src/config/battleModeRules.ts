import type { BattleDifficulty } from '@/types'

export type BattleMode = 'casual' | 'ranked'

export interface BattleModeRules {
  allowHints: boolean
  allowContextualOutputFeedback: boolean
  hintsUnavailableMessage: string | null
  trackIntegrity: boolean
  integrityStartsAt: BattleDifficulty
  editorLockWarning: number | null
  editorLockDurationMs: number
  autoDefeatThreshold: number | null
  playAlertSound: boolean
}

const difficultyRank: Record<BattleDifficulty, number> = {
  never: 0,
  basic: 1,
  intermediate: 2,
  advanced: 3,
}

export const battleModeRules: Record<BattleMode, BattleModeRules> = {
  casual: {
    allowHints: true,
    allowContextualOutputFeedback: true,
    hintsUnavailableMessage: null,
    trackIntegrity: true,
    integrityStartsAt: 'basic',
    editorLockWarning: null,
    editorLockDurationMs: 0,
    autoDefeatThreshold: null,
    playAlertSound: false,
  },
  ranked: {
    allowHints: false,
    allowContextualOutputFeedback: false,
    hintsUnavailableMessage: 'Assistência da Arena indisponível em partidas ranqueadas.',
    trackIntegrity: true,
    integrityStartsAt: 'never',
    editorLockWarning: 2,
    editorLockDurationMs: 4_000,
    autoDefeatThreshold: 3,
    playAlertSound: true,
  },
}

export function shouldTrackBattleIntegrity(
  mode: BattleMode,
  difficulty: BattleDifficulty,
): boolean {
  const rules = battleModeRules[mode]

  return (
    rules.trackIntegrity &&
    difficultyRank[difficulty] >= difficultyRank[rules.integrityStartsAt]
  )
}

export function getIntegritySpeechMessage(
  mode: BattleMode,
  warningCount: number,
): string {
  if (mode === 'ranked') {
    if (warningCount === 1) {
      return 'Atenção. Você saiu da Arena durante uma partida ranqueada. Esta é sua primeira advertência.'
    }

    if (warningCount === 2) {
      return 'Advertência de integridade. Uma nova saída da Arena foi detectada.'
    }

    return 'Integridade violada. A partida foi encerrada.'
  }

  if (warningCount === 1) {
    return 'Atenção. Você saiu da Arena durante uma batalha. Esta saída foi registrada.'
  }

  if (warningCount === 2) {
    return 'Alerta de integridade. Você saiu novamente da Arena. Evite novas infrações.'
  }

  return 'Integridade da batalha comprometida. Esta partida foi marcada como suspeita.'
}

export function getIntegrityVisualMessage(warningCount: number): string {
  if (warningCount === 1) return '1 aviso registrado'
  if (warningCount === 2) return '2 avisos registrados'

  return 'Partida marcada como suspeita'
}
