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

export interface IntegrityVisualNoticeContent {
  title: string
  message: string
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

export function getIntegrityVisualNotice(
  warningCount: number,
): IntegrityVisualNoticeContent {
  if (warningCount === 1) {
    return {
      title: 'INTEGRIDADE DA BATALHA',
      message: 'Você saiu da Arena. 1 aviso registrado.',
    }
  }

  if (warningCount === 2) {
    return {
      title: 'ALERTA DE INTEGRIDADE',
      message: 'Uma nova saída da Arena foi detectada. 2 avisos registrados.',
    }
  }

  return {
    title: 'INTEGRIDADE COMPROMETIDA',
    message: 'Esta batalha foi marcada como suspeita.',
  }
}
