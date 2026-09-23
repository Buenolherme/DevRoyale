import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BattleEditor,
  BattleExitDialog,
  BattleIntegrityIndicator,
} from '@/components/battle'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useAuth, useBattleIntegrity, useDialogFocus } from '@/hooks'
import {
  MultiplayerBattleServiceError,
  advanceRound,
  getCurrentMatch,
  getMatch,
  runCode,
  submitCode,
  surrender,
} from '@/lib/multiplayer-battle-service'
import { subscribeToMultiplayerBattle } from '@/lib/multiplayer-battle-realtime-service'
import { ROUTES } from '@/routes/paths'
import {
  MATCH_FORMAT_LABELS,
  ROOM_DIFFICULTY_LABELS,
  ROOM_LANGUAGE_LABELS,
  type MultiplayerBattleRealtimeEvent,
  type MultiplayerMatchPlayer,
  type MultiplayerMatchState,
  type MultiplayerSubmissionStatus,
} from '@/types'
import '@/styles/pages/arena-polish.css'

const maxRoundsByFormat = { bo1: 1, bo3: 3, bo5: 5 } as const

const submissionLabels: Record<MultiplayerSubmissionStatus, string> = {
  queued: 'Solução na fila do avaliador...',
  running: 'Avaliando solução...',
  accepted: 'Solução aceita.',
  wrong_answer: 'Alguns testes ainda falharam.',
  compile_error: 'O código não pôde ser compilado.',
  runtime_error: 'Ocorreu um erro durante a execução.',
  time_limit: 'A solução excedeu o limite de tempo.',
  validation_error: 'A estrutura enviada ainda não atende ao desafio.',
  internal_error: 'O avaliador da Arena está temporariamente indisponível. Tente novamente.',
}

const submissionBadges: Record<MultiplayerSubmissionStatus, string> = {
  queued: 'Na fila',
  running: 'Avaliando',
  accepted: 'Aceita',
  wrong_answer: 'Testes pendentes',
  compile_error: 'Erro de compilação',
  runtime_error: 'Erro de execução',
  time_limit: 'Tempo excedido',
  validation_error: 'Revise a estrutura',
  internal_error: 'Judge indisponível',
}

function draftKey(matchId: string, roundId: string, userId: string) {
  return `devroyale:multiplayer-draft:${matchId}:${roundId}:${userId}`
}

function readDraft(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeDraft(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Draft recovery is best effort; the official match never depends on it.
  }
}

function removeDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage may be unavailable in hardened/private browser contexts.
  }
}

function formatDuration(startedAt: string, finishedAt: string | null, nowMs: number) {
  const end = finishedAt ? new Date(finishedAt).getTime() : nowMs
  const duration = end - new Date(startedAt).getTime()
  if (!Number.isFinite(duration)) return '—'
  const seconds = Math.max(0, Math.floor(duration / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function playerName(player: MultiplayerMatchPlayer | undefined) {
  return player?.displayName || player?.username || 'Adversário'
}

function safeErrorMessage(error: unknown) {
  return error instanceof MultiplayerBattleServiceError
    ? error.message
    : 'Não foi possível atualizar a Arena. Tentaremos novamente.'
}

function MultiplayerArenaContent() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const userId = user?.id
  const [battle, setBattle] = useState<MultiplayerMatchState | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [judgeUnavailable, setJudgeUnavailable] = useState(false)
  const [surrenderOpen, setSurrenderOpen] = useState(false)
  const [dismissedResultId, setDismissedResultId] = useState<string | null>(null)
  const [action, setAction] = useState<'run' | 'submit' | 'surrender' | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set())
  const [opponentActivity, setOpponentActivity] = useState('Codando...')
  const [clockMs, setClockMs] = useState(() => Date.now())
  const advancingRoundRef = useRef<string | null>(null)
  const activeDraftKeyRef = useRef<string | null>(null)
  const lifecycleRef = useRef(0)
  const reloadRef = useRef<{ scope: number; promise: Promise<MultiplayerMatchState | null> } | null>(null)
  const actionRef = useRef(false)
  const resultDialogRef = useRef<HTMLElement>(null)
  const surrenderDialogRef = useRef<HTMLElement>(null)

  const reloadMatch = useCallback((showLoading = false): Promise<MultiplayerMatchState | null> => {
    if (!userId) return Promise.resolve(null)
    const scope = lifecycleRef.current
    if (reloadRef.current?.scope === scope) return reloadRef.current.promise
    if (showLoading) setLoading(true)

    const request = (async () => {
      try {
      let nextBattle = matchId ? await getMatch(matchId) : null
      if (!nextBattle) nextBattle = await getCurrentMatch()
      if (scope !== lifecycleRef.current) return null

      if (!nextBattle) {
        setBattle(null)
        setError('Esta batalha não existe ou você não participa dela.')
        return null
      }

      if (nextBattle.match.id !== matchId) {
        navigate(`/batalha/match/${encodeURIComponent(nextBattle.match.id)}`, { replace: true })
      }

      const nextDraftKey = draftKey(nextBattle.match.id, nextBattle.round.id, userId)
      const previousDraftKey = activeDraftKeyRef.current
      if (previousDraftKey && previousDraftKey !== nextDraftKey) {
        removeDraft(previousDraftKey)
      }
      if (previousDraftKey !== nextDraftKey) {
        activeDraftKeyRef.current = nextDraftKey
        setCode(readDraft(nextDraftKey) ?? nextBattle.challenge.starterCode)
      }
      if (nextBattle.round.status === 'finished' || nextBattle.round.status === 'cancelled') {
        removeDraft(nextDraftKey)
      }

      setBattle(nextBattle)
      setError('')
      return nextBattle
    } catch (loadError) {
      if (scope === lifecycleRef.current) setError(safeErrorMessage(loadError))
      return null
    } finally {
      if (scope === lifecycleRef.current && showLoading) setLoading(false)
    }
    })()
    reloadRef.current = { scope, promise: request }
    void request.finally(() => {
      if (reloadRef.current?.promise === request) reloadRef.current = null
    })
    return request
  }, [matchId, navigate, userId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void reloadMatch(true), 0)
    return () => {
      window.clearTimeout(timeoutId)
      lifecycleRef.current += 1
    }
  }, [reloadMatch])

  const currentDraftScope = battle ? `${battle.match.id}:${battle.round.id}` : null

  useEffect(() => {
    const key = activeDraftKeyRef.current
    if (!key || !battle || battle.round.status !== 'active') return
    writeDraft(key, code)
  }, [battle, code])

  useEffect(() => {
    const key = activeDraftKeyRef.current
    if (!key) return

    const handleStorage = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) setCode(event.newValue)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [currentDraftScope])

  const handleRealtimeEvent = useCallback((event: MultiplayerBattleRealtimeEvent) => {
    if (event.userId && event.userId !== userId) {
      if (event.type === 'player_submitted') setOpponentActivity('Enviou solução')
      if (event.type === 'submission_finished') {
        setOpponentActivity('Avaliação concluída')
      }
    }
    if (event.type === 'round_finished') setOpponentActivity('Round concluído')
    if (event.type === 'round_started') setOpponentActivity('Codando...')
    void reloadMatch()
  }, [reloadMatch, userId])

  const activeMatchId = battle?.match.id

  useEffect(() => {
    if (!activeMatchId || !userId) return
    let active = true
    const unsubscribe = subscribeToMultiplayerBattle(activeMatchId, userId, {
      onEvent: (event) => { if (active) handleRealtimeEvent(event) },
      onPresenceChange: (ids) => { if (active) setConnectedUserIds(ids) },
      onConnectionChange: (connected) => { if (active) setRealtimeConnected(connected) },
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [activeMatchId, handleRealtimeEvent, userId])

  const activeMatchStatus = battle?.match.status
  const latestSubmissionStatus = battle?.ownLatestSubmission?.status

  useEffect(() => {
    if (!activeMatchStatus || !['preparing', 'active', 'between_rounds'].includes(activeMatchStatus)) return
    const intervalMs = latestSubmissionStatus && ['queued', 'running'].includes(latestSubmissionStatus)
      ? 1_200
      : 3_000
    const intervalId = window.setInterval(() => void reloadMatch(), intervalMs)
    return () => window.clearInterval(intervalId)
  }, [activeMatchStatus, latestSubmissionStatus, reloadMatch])

  const activeRoundId = battle?.round.id

  useEffect(() => {
    if (activeMatchStatus !== 'active' && activeMatchStatus !== 'between_rounds') return
    const intervalId = window.setInterval(
      () => setClockMs(Date.now()),
      1_000,
    )
    return () => window.clearInterval(intervalId)
  }, [activeMatchStatus, activeRoundId])

  const roundCountdown = battle?.match.status === 'between_rounds'
    ? Math.max(0, Math.ceil((new Date(battle.round.startedAt).getTime() - clockMs) / 1000))
    : null

  useEffect(() => {
    if (!activeMatchId || !activeRoundId || activeMatchStatus !== 'between_rounds' || roundCountdown !== 0) return
    let active = true
    const advance = async () => {
      if (advancingRoundRef.current === activeRoundId) return
      advancingRoundRef.current = activeRoundId
      try { await advanceRound(activeMatchId) }
      catch (advanceError) {
        if (active && (!(advanceError instanceof MultiplayerBattleServiceError) || advanceError.code !== 'NOT_ACTIVE')) setError(safeErrorMessage(advanceError))
      } finally {
        advancingRoundRef.current = null
        if (active) void reloadMatch()
      }
    }
    void advance()
    const retryId = window.setInterval(() => void advance(), 3_000)
    return () => { active = false; window.clearInterval(retryId) }
  }, [activeMatchId, activeMatchStatus, activeRoundId, reloadMatch, roundCountdown])

  const me = battle?.players.find((player) => player.userId === user?.id)
  const opponent = battle?.players.find((player) => player.userId !== user?.id)
  const opponentConnected = opponent ? connectedUserIds.has(opponent.userId) : false
  const matchFinished = battle?.match.status === 'finished'
  const matchEnded = Boolean(battle && ['finished', 'cancelled', 'abandoned'].includes(battle.match.status))
  const resultOpen = matchEnded && dismissedResultId !== battle?.match.id
  const roundActive = battle?.match.status === 'active' && battle.round.status === 'active'
  const ownSubmission = battle?.ownLatestSubmission
  const evaluating = Boolean(ownSubmission && ['queued', 'running'].includes(ownSubmission.status))
  const maxRounds = battle ? maxRoundsByFormat[battle.match.matchFormat] : 1
  const matchWon = Boolean(matchFinished && battle?.match.winnerId === user?.id)
  const matchLost = Boolean(matchFinished && battle?.match.winnerId === opponent?.userId)
  const resultTitle = matchWon ? 'Vitória' : matchLost ? 'Derrota'
    : battle?.match.status === 'cancelled' ? 'Partida cancelada' : 'Partida encerrada'
  const previousRoundWinner = battle?.players.find(
    (player) => player.userId === battle.previousRound?.winnerId,
  )
  const submissionTone = ownSubmission?.status === 'accepted'
    ? 'success'
    : ownSubmission && ['queued', 'running'].includes(ownSubmission.status)
      ? 'waiting'
      : ownSubmission
        ? 'error'
        : 'idle'

  useDialogFocus({
    open: resultOpen,
    containerRef: resultDialogRef,
    onClose: () => setDismissedResultId(battle?.match.id ?? null),
  })
  useDialogFocus({
    open: surrenderOpen && !matchEnded,
    containerRef: surrenderDialogRef,
    onClose: () => { if (!actionRef.current) setSurrenderOpen(false) },
  })

  const {
    warningCount,
    compromised,
    trackingEnabled,
    notice,
    pendingNavigation,
    reportPasteAttempt,
    reportChallengeCopyAttempt,
    cancelNavigation,
    confirmNavigation,
  } = useBattleIntegrity({
    active: Boolean(roundActive),
    difficulty: battle?.match.difficulty ?? 'never',
    mode: 'casual',
  })

  const ownStatus = me?.status === 'surrendered'
    ? 'Desistiu'
    : matchEnded ? 'Partida encerrada'
    : evaluating || action === 'run' || action === 'submit' ? 'Avaliando solução'
    : roundActive
      ? 'Codando'
      : 'Aguardando'
  const displayedOpponentStatus = opponent?.status === 'surrendered' ? 'Adversário saiu · desistência'
    : matchEnded ? 'Partida encerrada'
    : opponent?.status === 'disconnected' ? 'Reconectando...'
    : !realtimeConnected ? 'Sincronizando presença...'
    : !opponentConnected ? 'Aguardando conexão...'
    : opponentActivity

  const resultMessage = ownSubmission
    ? ownSubmission.status === 'accepted' && ownSubmission.mode === 'run'
      ? 'Exemplos públicos concluídos. Envie sua solução para disputar o round.'
      : submissionLabels[ownSubmission.status]
    : null
  const judgeIsUnavailable = judgeUnavailable || ownSubmission?.status === 'internal_error'
  const publicExamples = useMemo(
    () => battle?.challenge.publicExamples ?? [],
    [battle?.challenge.publicExamples],
  )

  const sendSubmission = async (mode: 'run' | 'submit') => {
    if (!battle || !roundActive || actionRef.current || evaluating) return
    if (!code.trim()) {
      setError('Digite sua solução antes de enviar.')
      return
    }

    const scope = lifecycleRef.current
    actionRef.current = true
    setAction(mode)
    setJudgeUnavailable(false)
    setError('')
    try {
      if (mode === 'run') await runCode(battle, code)
      else await submitCode(battle, code)
      if (scope === lifecycleRef.current) await reloadMatch()
    } catch (submissionError) {
      if (scope === lifecycleRef.current) {
        setError(safeErrorMessage(submissionError))
        setJudgeUnavailable(submissionError instanceof MultiplayerBattleServiceError && submissionError.code === 'JUDGE_UNAVAILABLE')
      }
    } finally {
      actionRef.current = false
      if (scope === lifecycleRef.current) setAction(null)
    }
  }

  const handleSurrender = async () => {
    if (!battle || matchEnded || actionRef.current) return
    const scope = lifecycleRef.current
    actionRef.current = true
    setAction('surrender')
    setError('')
    try {
      await surrender(battle.match.id)
      if (scope === lifecycleRef.current) {
        setSurrenderOpen(false)
        await reloadMatch()
      }
    } catch (surrenderError) {
      if (scope === lifecycleRef.current) {
        setSurrenderOpen(false)
        setError(safeErrorMessage(surrenderError))
      }
    } finally {
      actionRef.current = false
      if (scope === lifecycleRef.current) setAction(null)
    }
  }

  const playAgain = () => {
    if (!battle) return
    if (battle.match.roomKind === 'quick_match') {
      navigate(ROUTES.MULTIPLAYER, {
        replace: true,
        state: {
          autoSearch: true,
          quickPreferences: {
            language: battle.match.language,
            difficulty: battle.match.difficulty,
          },
        },
      })
      return
    }
    navigate(ROUTES.MULTIPLAYER, {
      replace: true,
      state: { notice: 'Crie uma nova sala para jogar novamente com seus amigos.' },
    })
  }

  const protectChallenge = (event: { preventDefault: () => void }) => {
    if (!roundActive) return
    event.preventDefault()
    reportChallengeCopyAttempt()
  }

  if (authLoading || (loading && user)) {
    return (
      <div className="page-container multiplayer-arena-page">
        <Card variant="premium" className="multiplayer-arena-loading" role="status" aria-live="polite" aria-busy="true">
          <span className="multiplayer-arena-spinner" aria-hidden="true" />
          <CardTitle>Preparando Arena...</CardTitle>
          <CardDescription>Carregando desafio e sincronizando o placar oficial.</CardDescription>
          <p className="multiplayer-privacy-note">Seu rascunho salvo neste navegador será recuperado.</p>
        </Card>
      </div>
    )
  }

  if (!battle || !user || !me || !opponent) {
    return (
      <div className="page-container multiplayer-arena-page">
        <Card variant="premium" className="multiplayer-arena-loading">
          <Badge variant="danger">Arena indisponível</Badge>
          <CardTitle>Batalha não encontrada</CardTitle>
          <CardDescription>{!user ? 'Sua sessão expirou. Entre novamente para acessar a Arena.' : error || 'A partida terminou ou você não faz parte dela.'}</CardDescription>
          {user && <Button type="button" variant="secondary" onClick={() => void reloadMatch(true)}>Tentar novamente</Button>}
          <Button type="button" className="mt-5" onClick={() => navigate(ROUTES.MULTIPLAYER)}>
            Voltar ao Multiplayer
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container multiplayer-arena-page">
      <BattleExitDialog
        open={Boolean(pendingNavigation)}
        onContinue={cancelNavigation}
        onExit={confirmNavigation}
      />

      <div inert={resultOpen || (surrenderOpen && !matchEnded) || Boolean(pendingNavigation)}>
      <header className="multiplayer-arena-header">
        <div>
          <span className="lobby-eyebrow">Arena multiplayer · Casual 1v1</span>
          <h1>Round {battle.round.roundNumber} <small>· {MATCH_FORMAT_LABELS[battle.match.matchFormat]}</small></h1>
          <p>{ROOM_LANGUAGE_LABELS[battle.match.language]} · {ROOM_DIFFICULTY_LABELS[battle.match.difficulty]}</p>
        </div>
        <div className="multiplayer-arena-connection" role="status">
          <span className={realtimeConnected ? 'is-online' : ''} aria-hidden="true" />
          {matchEnded ? 'Partida encerrada' : realtimeConnected ? 'Tempo real conectado' : 'Reconectando à Arena...'}
        </div>
      </header>

      {error && <p className="multiplayer-arena-alert" role="alert">{error}</p>}

      {!realtimeConnected && !matchEnded && (
        <div className="arena-status-banner" role="status">
          <strong>Reconectando à Arena...</strong>
          <p>Continuamos consultando o placar oficial. Você pode manter seu rascunho no editor.</p>
        </div>
      )}
      {battle.match.status === 'preparing' && (
        <div className="arena-status-banner" role="status">
          <strong>Preparando Arena...</strong>
          <p>Carregando desafio e aguardando a liberação do round.</p>
        </div>
      )}
      {judgeIsUnavailable && (
        <div className="arena-status-banner arena-status-banner--warning" role="status">
          <strong>Judge indisponível</strong>
          <p>Não foi possível avaliar sua solução agora. Seu código continua no editor; tente novamente em alguns segundos.</p>
        </div>
      )}
      {opponent.status === 'disconnected' && !matchEnded && (
        <div className="arena-status-banner" role="status">
          <strong>A conexão do adversário foi interrompida</strong>
          <p>Aguardando a reconexão e a atualização oficial da partida.</p>
        </div>
      )}
      {matchEnded && (
        <div className="arena-status-banner arena-status-banner--result" role="status">
          <div><strong>{resultTitle}</strong><p>A partida terminou. Você pode revisar sua solução abaixo.</p></div>
          <Button type="button" variant="secondary" onClick={() => setDismissedResultId(null)}>Ver resultado</Button>
        </div>
      )}

      <section className="multiplayer-scoreboard" aria-label="Placar oficial">
        <div className="multiplayer-score-player multiplayer-score-player--self">
          <span>Você</span>
          <strong>{playerName(me)}</strong>
          <small>{ownStatus}</small>
          <b>{me.roundsWon}</b>
        </div>
        <div className="multiplayer-score-versus">
          <span>VS</span>
          <small>Primeiro a {Math.floor(maxRounds / 2) + 1}</small>
        </div>
        <div className="multiplayer-score-player multiplayer-score-player--opponent">
          <span>Rival</span>
          <strong>{playerName(opponent)}</strong>
          <small>{displayedOpponentStatus}</small>
          <b>{opponent.roundsWon}</b>
        </div>
      </section>

      <BattleIntegrityIndicator
        warningCount={warningCount}
        compromised={compromised}
        trackingEnabled={trackingEnabled}
        notice={notice}
      />

      {battle.match.status === 'between_rounds' && (
        <section className="multiplayer-round-intermission" aria-label="Intervalo entre rounds">
          <Badge variant="gold">Round encerrado</Badge>
          <h2>{previousRoundWinner ? `Round para ${playerName(previousRoundWinner)}` : 'Placar atualizado'}</h2>
          <p>{previousRoundWinner ? `${playerName(previousRoundWinner)} venceu este round.` : 'Aguardando o início do próximo desafio.'}</p>
          <div className="multiplayer-intermission-score">
            <span>{playerName(me)} <strong>{me.roundsWon}</strong></span>
            <b>×</b>
            <span><strong>{opponent.roundsWon}</strong> {playerName(opponent)}</span>
          </div>
          <span>{roundCountdown === 0 ? 'Carregando próximo desafio...' : 'Próximo round em'}</span>
          {roundCountdown !== 0 && <strong className="multiplayer-round-countdown">{roundCountdown}s</strong>}
        </section>
      )}

      <div className="multiplayer-arena-workspace">
        <section className="space-y-6 min-w-0" aria-label="Desafio e editor">
          <Card
            variant="premium"
            className={`battle-challenge-card ${roundActive ? 'battle-challenge-card--protected' : ''}`}
            onCopy={protectChallenge}
            onContextMenu={protectChallenge}
          >
            <CardHeader>
              <div className="battle-challenge-card__topline">
                <span>Desafio oficial · mesmo para os dois jogadores</span>
                <div className="battle-challenge-number" aria-hidden="true">
                  {String(battle.round.roundNumber).padStart(2, '0')}
                </div>
              </div>
              <CardTitle className="battle-challenge-card__title">{battle.challenge.title}</CardTitle>
              <CardDescription className="battle-challenge-card__description">
                {battle.challenge.statement}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="battle-example">
                <span className="battle-example__label">Instruções</span>
                <ul className="battle-instructions">
                  {battle.challenge.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
                </ul>
              </div>
              {publicExamples.length > 0 && (
                <details className="multiplayer-public-examples">
                  <summary>Ver exemplos públicos</summary>
                  <pre>{JSON.stringify(publicExamples, null, 2)}</pre>
                </details>
              )}
            </CardContent>
          </Card>

          <p className="battle-mobile-recommendation">
            Para uma experiência completa na Arena, recomendamos computador ou notebook.
          </p>

          <BattleEditor
            key={battle.round.id}
            language={battle.match.language}
            code={code}
            challengeIndex={battle.round.roundNumber - 1}
            challengeCount={maxRounds}
            outcome={null}
            isLocked={!roundActive}
            validationMessage={ownSubmission && !['queued', 'running', 'accepted'].includes(ownSubmission.status)
              ? resultMessage ?? undefined
              : undefined}
            onCodeChange={setCode}
            onPasteBlocked={reportPasteAttempt}
          />

          <section className={`multiplayer-console multiplayer-console--${submissionTone}`} aria-live="polite" aria-busy={evaluating || action === 'run' || action === 'submit'}>
            <div>
              <span>Console da sua solução</span>
              {ownSubmission && <Badge variant={ownSubmission.status === 'accepted' ? 'success' : 'default'}>{submissionBadges[ownSubmission.status]}</Badge>}
            </div>
            <strong>{action === 'run' || action === 'submit' ? 'Avaliando solução...' : resultMessage || 'Execute os exemplos públicos ou envie para os testes ocultos.'}</strong>
            {ownSubmission?.stdout && <pre>{ownSubmission.stdout}</pre>}
            {ownSubmission?.executionTime !== null && ownSubmission?.executionTime !== undefined && (
              <small>Tempo: {ownSubmission.executionTime.toFixed(3)}s{ownSubmission.memoryUsed !== null ? ` · Memória: ${ownSubmission.memoryUsed} KB` : ''}</small>
            )}
          </section>

          <div className="multiplayer-arena-actions">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={!roundActive || Boolean(action) || evaluating}
              onClick={() => void sendSubmission('run')}
            >
              {action === 'run' ? 'Executando...' : 'Executar'}
            </Button>
            <Button
              type="button"
              variant="gold"
              size="lg"
              disabled={!roundActive || Boolean(action) || evaluating}
              onClick={() => void sendSubmission('submit')}
            >
              {action === 'submit' ? 'Enviando...' : 'Enviar solução'}
            </Button>
          </div>
          <p className="multiplayer-privacy-note">Executar verifica os exemplos públicos. Enviar solução participa do round após a avaliação oficial.</p>
        </section>

        <aside className="multiplayer-arena-sidebar space-y-6">
          <Card variant="premium">
            <CardHeader>
              <Badge variant={matchEnded ? 'default' : opponentConnected && realtimeConnected ? 'online' : 'warning'} className="w-fit">
                {matchEnded ? 'Partida encerrada' : opponentConnected && realtimeConnected ? 'Online na Arena' : 'Sincronizando presença'}
              </Badge>
              <CardTitle>{playerName(opponent)}</CardTitle>
              <CardDescription>@{opponent.username}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="multiplayer-opponent-status" role="status">
                <span className={opponentConnected ? 'is-online' : ''} aria-hidden="true" />
                <strong>{displayedOpponentStatus}</strong>
              </div>
              <p className="multiplayer-privacy-note">
                Código, saída e testes do rival permanecem privados.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sua partida</CardTitle>
              <CardDescription>O mesmo desafio para os dois jogadores. Placar e resultado oficiais.</CardDescription>
            </CardHeader>
            <CardContent className="multiplayer-match-metadata">
              <span>Round <strong>{battle.round.roundNumber}/{maxRounds}</strong></span>
              <span>Tempo <strong>{formatDuration(battle.match.startedAt, battle.match.finishedAt, clockMs)}</strong></span>
              <span>Modo <strong>Casual</strong></span>
            </CardContent>
          </Card>

          {!matchEnded && (
            <Button
              type="button"
              variant="danger"
              fullWidth
              disabled={Boolean(action)}
              onClick={() => setSurrenderOpen(true)}
            >
              {action === 'surrender' ? 'Desistindo...' : 'Desistir'}
            </Button>
          )}
        </aside>
      </div>
      </div>

      {surrenderOpen && !matchEnded && (
        <div className="battle-exit-dialog" role="presentation">
          <section ref={surrenderDialogRef} className="battle-exit-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="arena-surrender-title" aria-describedby="arena-surrender-description" tabIndex={-1}>
            <span className="battle-exit-dialog__eyebrow">Batalha em andamento</span>
            <h2 id="arena-surrender-title">Desistir da partida?</h2>
            <p id="arena-surrender-description">Ao confirmar, a vitória será concedida ao adversário. Essa ação não pode ser desfeita.</p>
            <div className="battle-exit-dialog__actions">
              <Button type="button" variant="secondary" disabled={Boolean(action)} onClick={() => setSurrenderOpen(false)}>Continuar batalhando</Button>
              <Button type="button" variant="danger" disabled={Boolean(action)} onClick={() => void handleSurrender()}>{action === 'surrender' ? 'Confirmando...' : 'Confirmar desistência'}</Button>
            </div>
          </section>
        </div>
      )}

      {resultOpen && (
        <div className={`multiplayer-result-overlay multiplayer-result-overlay--${matchWon ? 'victory' : matchLost ? 'defeat' : 'neutral'}`}>
          <section ref={resultDialogRef} role="dialog" aria-modal="true" aria-labelledby="multiplayer-result-title" aria-describedby="multiplayer-result-description" tabIndex={-1}>
            <Badge variant={matchWon ? 'gold' : matchLost ? 'danger' : 'default'}>Resultado oficial · {MATCH_FORMAT_LABELS[battle.match.matchFormat]}</Badge>
            <h2 id="multiplayer-result-title">{resultTitle}</h2>
            <p id="multiplayer-result-description">{opponent.status === 'surrendered' ? 'O adversário saiu ao desistir da partida.' : me.status === 'surrendered' ? 'Você desistiu desta partida.' : matchWon ? 'Você venceu a batalha.' : matchLost ? `${playerName(opponent)} venceu a batalha.` : 'A partida foi encerrada sem um vencedor.'}</p>
            <div className="multiplayer-result-score" aria-label={`Placar: você ${me.roundsWon}, adversário ${opponent.roundsWon}`}>
              <strong>{me.roundsWon}</strong><span>×</span><strong>{opponent.roundsWon}</strong>
            </div>
            <dl>
              {(battle.match.finishedAt || battle.match.cancelledAt) && <div><dt>Tempo total</dt><dd>{formatDuration(battle.match.startedAt, battle.match.finishedAt ?? battle.match.cancelledAt, clockMs)}</dd></div>}
              <div><dt>Rounds vencidos</dt><dd>{me.roundsWon + opponent.roundsWon}</dd></div>
              <div><dt>Adversário</dt><dd>{playerName(opponent)}</dd></div>
            </dl>
            <div className="multiplayer-result-actions">
              <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.MULTIPLAYER, { replace: true })}>
                Voltar ao Multiplayer
              </Button>
              <Button type="button" variant="gold" onClick={playAgain}>Jogar novamente</Button>
            </div>
            <Button type="button" variant="ghost" className="arena-result-review" onClick={() => setDismissedResultId(battle.match.id)}>Revisar minha solução</Button>
          </section>
        </div>
      )}
    </div>
  )
}

export function MultiplayerArenaPage() {
  const { matchId = '' } = useParams()
  const { user } = useAuth()
  return <MultiplayerArenaContent key={`${matchId}:${user?.id ?? 'guest'}`} />
}
