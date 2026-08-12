import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import {
  battleModeRules,
  getIntegritySpeechMessage,
  getIntegrityVisualMessage,
  shouldTrackBattleIntegrity,
  type BattleMode,
} from '@/config/battleModeRules'
import type { BattleDifficulty } from '@/types'

export type IntegrityNoticeTone = 'neutral' | 'warning' | 'danger'

export interface BattleIntegrityNotice {
  id: number
  message: string
  tone: IntegrityNoticeTone
}

interface UseBattleIntegrityOptions {
  active: boolean
  difficulty: BattleDifficulty
  mode?: BattleMode
}

interface ArenaExitSignalInput {
  active: boolean
  trackingEnabled: boolean
  awaySessionOpen: boolean
}

export interface BattleIntegritySnapshot {
  warningCount: number
  awaySessionOpen: boolean
}

export type BattleIntegritySignal = 'exit' | 'return' | 'reset'

export function shouldRegisterArenaExit({
  active,
  trackingEnabled,
  awaySessionOpen,
}: ArenaExitSignalInput): boolean {
  return active && trackingEnabled && !awaySessionOpen
}

export function reduceBattleIntegritySnapshot(
  snapshot: BattleIntegritySnapshot,
  signal: BattleIntegritySignal,
  context: Pick<ArenaExitSignalInput, 'active' | 'trackingEnabled'>,
): BattleIntegritySnapshot {
  if (signal === 'reset') {
    return { warningCount: 0, awaySessionOpen: false }
  }

  if (signal === 'return') {
    return { ...snapshot, awaySessionOpen: false }
  }

  if (!shouldRegisterArenaExit({
    ...context,
    awaySessionOpen: snapshot.awaySessionOpen,
  })) {
    return snapshot
  }

  return {
    warningCount: snapshot.warningCount + 1,
    awaySessionOpen: true,
  }
}

export function speakIntegrityWarning(message: string): boolean {
  if (
    typeof window === 'undefined' ||
    document.visibilityState === 'hidden' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    return false
  }

  try {
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.lang = 'pt-BR'
    utterance.rate = 1
    utterance.pitch = 0.92
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    return false
  }
}

export function useBattleIntegrity({
  active,
  difficulty,
  mode = 'casual',
}: UseBattleIntegrityOptions) {
  const [warningCount, setWarningCount] = useState(0)
  const [notice, setNotice] = useState<BattleIntegrityNotice | null>(null)
  const warningCountRef = useRef(0)
  const awaySessionRef = useRef(false)
  const pendingSpeechRef = useRef<string | null>(null)
  const allowPageExitRef = useRef(false)
  const blurTimerRef = useRef<number | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const noticeSequenceRef = useRef(0)
  const lastNoticeRef = useRef({ key: '', timestamp: 0 })
  const trackingEnabled = shouldTrackBattleIntegrity(mode, difficulty)
  const rules = battleModeRules[mode]
  const navigationBlocker = useBlocker(active)

  const clearBlurTimer = useCallback(() => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
  }, [])

  const showIntegrityWarning = useCallback((
    message: string,
    tone: IntegrityNoticeTone = 'warning',
    dedupeKey = message,
  ) => {
    const now = Date.now()

    if (
      lastNoticeRef.current.key === dedupeKey &&
      now - lastNoticeRef.current.timestamp < 650
    ) {
      return
    }

    lastNoticeRef.current = { key: dedupeKey, timestamp: now }
    noticeSequenceRef.current += 1
    setNotice({ id: noticeSequenceRef.current, message, tone })

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null)
      noticeTimerRef.current = null
    }, 5_500)
  }, [])

  const registerArenaExit = useCallback(() => {
    const currentSnapshot = {
      warningCount: warningCountRef.current,
      awaySessionOpen: awaySessionRef.current,
    }
    const nextSnapshot = reduceBattleIntegritySnapshot(
      currentSnapshot,
      'exit',
      { active, trackingEnabled },
    )

    if (nextSnapshot === currentSnapshot) {
      return false
    }

    awaySessionRef.current = nextSnapshot.awaySessionOpen
    const nextWarningCount = nextSnapshot.warningCount
    warningCountRef.current = nextWarningCount
    setWarningCount(nextWarningCount)
    pendingSpeechRef.current = getIntegritySpeechMessage(mode, nextWarningCount)
    showIntegrityWarning(
      getIntegrityVisualMessage(nextWarningCount),
      nextWarningCount >= 3 ? 'danger' : 'warning',
      `arena-exit-${nextWarningCount}`,
    )
    return true
  }, [active, mode, showIntegrityWarning, trackingEnabled])

  const handleArenaReturn = useCallback(() => {
    if (!awaySessionRef.current || document.visibilityState === 'hidden') return false

    const nextSnapshot = reduceBattleIntegritySnapshot(
      {
        warningCount: warningCountRef.current,
        awaySessionOpen: awaySessionRef.current,
      },
      'return',
      { active: true, trackingEnabled: true },
    )
    awaySessionRef.current = nextSnapshot.awaySessionOpen
    const pendingSpeech = pendingSpeechRef.current
    pendingSpeechRef.current = null

    if (pendingSpeech) {
      speakIntegrityWarning(pendingSpeech)
    }

    return true
  }, [])

  const reportPasteAttempt = useCallback(() => {
    if (!active) return

    showIntegrityWarning(
      'Integridade da Arena: colar código não é permitido durante a Batalha.',
      'warning',
      'paste-blocked',
    )
  }, [active, showIntegrityWarning])

  const reportChallengeCopyAttempt = useCallback(() => {
    if (!active) return

    showIntegrityWarning(
      'O enunciado da batalha está protegido. Seu próprio código continua disponível para cópia.',
      'neutral',
      'challenge-copy-blocked',
    )
  }, [active, showIntegrityWarning])

  const resetIntegrity = useCallback(() => {
    clearBlurTimer()

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
      noticeTimerRef.current = null
    }

    const resetSnapshot = reduceBattleIntegritySnapshot(
      {
        warningCount: warningCountRef.current,
        awaySessionOpen: awaySessionRef.current,
      },
      'reset',
      { active: false, trackingEnabled },
    )
    warningCountRef.current = resetSnapshot.warningCount
    awaySessionRef.current = resetSnapshot.awaySessionOpen
    pendingSpeechRef.current = null
    allowPageExitRef.current = false
    lastNoticeRef.current = { key: '', timestamp: 0 }
    setWarningCount(0)
    setNotice(null)

    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset()
    }

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // A batalha continua mesmo quando o navegador recusa controle de áudio.
      }
    }
  }, [clearBlurTimer, navigationBlocker, trackingEnabled])

  useEffect(() => {
    if (!active) {
      clearBlurTimer()
      awaySessionRef.current = false
      pendingSpeechRef.current = null
      return
    }

    const usesCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        registerArenaExit()
      } else {
        clearBlurTimer()
        handleArenaReturn()
      }
    }

    const handleWindowBlur = () => {
      clearBlurTimer()

      if (usesCoarsePointer) return

      blurTimerRef.current = window.setTimeout(() => {
        blurTimerRef.current = null

        if (document.visibilityState === 'hidden' || !document.hasFocus()) {
          registerArenaExit()
        }
      }, 320)
    }

    const handleWindowFocus = () => {
      clearBlurTimer()
      handleArenaReturn()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      clearBlurTimer()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [active, clearBlurTimer, handleArenaReturn, registerArenaExit])

  useEffect(() => {
    if (!active) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowPageExitRef.current) return

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [active])

  useEffect(() => () => {
    clearBlurTimer()

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
    }
  }, [clearBlurTimer])

  const cancelNavigation = useCallback(() => {
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset()
    }
  }, [navigationBlocker])

  const confirmNavigation = useCallback(() => {
    if (navigationBlocker.state !== 'blocked') return

    allowPageExitRef.current = true
    navigationBlocker.proceed()
  }, [navigationBlocker])

  return {
    warningCount,
    compromised: warningCount >= 3,
    trackingEnabled,
    notice,
    pendingNavigation: navigationBlocker.state === 'blocked',
    modeRules: rules,
    reportPasteAttempt,
    reportChallengeCopyAttempt,
    resetIntegrity,
    cancelNavigation,
    confirmNavigation,
  }
}
