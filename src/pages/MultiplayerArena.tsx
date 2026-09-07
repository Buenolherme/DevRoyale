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
import { useAuth, useBattleIntegrity } from '@/hooks'
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
  const seconds = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000))
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

export function MultiplayerArenaPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [battle, setBattle] = useState<MultiplayerMatchState | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState<'run' | 'submit' | 'surrender' | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set())
  const [opponentActivity, setOpponentActivity] = useState('Codando...')
  const [clockMs, setClockMs] = useState(() => Date.now())
  const advancingRoundRef = useRef<string | null>(null)
  const activeDraftKeyRef = useRef<string | null>(null)

  const reloadMatch = useCallback(async (showLoading = false) => {
    if (!user) return null
    if (showLoading) setLoading(true)

    try {
      let nextBattle = matchId ? await getMatch(matchId) : null
      if (!nextBattle) nextBattle = await getCurrentMatch()

      if (!nextBattle) {
        setBattle(null)
        setError('Esta batalha não existe ou você não participa dela.')
        return null
      }

      if (nextBattle.match.id !== matchId) {
        navigate(`/batalha/match/${encodeURIComponent(nextBattle.match.id)}`, { replace: true })
      }

      const nextDraftKey = draftKey(nextBattle.match.id, nextBattle.round.id, user.id)
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
      setError(safeErrorMessage(loadError))
      return null
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [matchId, navigate, user])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void reloadMatch(true), 0)
    return () => window.clearTimeout(timeoutId)
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
    if (event.userId && event.userId !== user?.id) {
      if (event.type === 'player_submitted') setOpponentActivity('Enviou solução')
      if (event.type === 'submission_finished') {
        setOpponentActivity(event.status === 'accepted' ? 'Round concluído' : 'Codando...')
      }
    }
    if (event.type === 'round_finished') setOpponentActivity('Round concluído')
    if (event.type === 'round_started') setOpponentActivity('Codando...')
    void reloadMatch()
  }, [reloadMatch, user?.id])

  const activeMatchId = battle?.match.id

  useEffect(() => {
    if (!activeMatchId || !user) return
    return subscribeToMultiplayerBattle(activeMatchId, user.id, {
      onEvent: handleRealtimeEvent,
      onPresenceChange: setConnectedUserIds,
      onConnectionChange: setRealtimeConnected,
    })
  }, [activeMatchId, handleRealtimeEvent, user])

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
      activeMatchStatus === 'between_rounds' ? 100 : 1_000,
    )
    return () => window.clearInterval(intervalId)
  }, [activeMatchStatus, activeRoundId])

  const roundCountdown = battle?.match.status === 'between_rounds'
    ? Math.max(0, Math.ceil((new Date(battle.round.startedAt).getTime() - clockMs) / 1000))
    : null

  useEffect(() => {
    if (!battle || battle.match.status !== 'between_rounds' || roundCountdown !== 0) return
    if (advancingRoundRef.current === battle.round.id) return
    advancingRoundRef.current = battle.round.id

    void advanceRound(battle.match.id)
      .catch((advanceError: unknown) => {
        if (!(advanceError instanceof MultiplayerBattleServiceError) || advanceError.code !== 'NOT_ACTIVE') {
          setError(safeErrorMessage(advanceError))
        }
      })
      .finally(() => {
        advancingRoundRef.current = null
        void reloadMatch()
      })
  }, [battle, reloadMatch, roundCountdown])

  const me = battle?.players.find((player) => player.userId === user?.id)
  const opponent = battle?.players.find((player) => player.userId !== user?.id)
  const opponentConnected = opponent ? connectedUserIds.has(opponent.userId) : false
  const matchFinished = battle?.match.status === 'finished'
  const roundActive = battle?.match.status === 'active' && battle.round.status === 'active'
  const ownSubmission = battle?.ownLatestSubmission
  const evaluating = Boolean(ownSubmission && ['queued', 'running'].includes(ownSubmission.status))
  const maxRounds = battle ? maxRoundsByFormat[battle.match.matchFormat] : 1
  const matchWon = Boolean(matchFinished && battle?.match.winnerId === user?.id)
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
    : roundActive
      ? 'Codando'
      : 'Aguardando'
  const displayedOpponentStatus = !opponentConnected && !matchFinished
    ? 'Reconectando...'
    : opponentActivity

  const resultMessage = ownSubmission
    ? ownSubmission.message || submissionLabels[ownSubmission.status]
    : null
  const publicExamples = useMemo(
    () => battle?.challenge.publicExamples ?? [],
    [battle?.challenge.publicExamples],
  )

  const sendSubmission = async (mode: 'run' | 'submit') => {
    if (!battle || !roundActive || action || evaluating) return
    if (!code.trim()) {
      setError('Digite sua solução antes de enviar.')
      return
    }

    setAction(mode)
    setError('')
    try {
      if (mode === 'run') await runCode(battle, code)
      else await submitCode(battle, code)
      await reloadMatch()
    } catch (submissionError) {
      setError(safeErrorMessage(submissionError))
    } finally {
      setAction(null)
    }
  }

  const handleSurrender = async () => {
    if (!battle || !window.confirm('Desistir desta batalha? O adversário vencerá a partida.')) return
    setAction('surrender')
    setError('')
    try {
      await surrender(battle.match.id)
      await reloadMatch()
    } catch (surrenderError) {
      setError(safeErrorMessage(surrenderError))
    } finally {
      setAction(null)
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

  if (loading) {
    return (
      <div className="page-container multiplayer-arena-page">
        <Card variant="premium" className="multiplayer-arena-loading">
          <span className="multiplayer-arena-spinner" aria-hidden="true" />
          <CardTitle>Preparando Arena...</CardTitle>
          <CardDescription>Sincronizando partida, round e desafio oficial.</CardDescription>
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
          <CardDescription>{error || 'A partida terminou ou você não faz parte dela.'}</CardDescription>
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

      <header className="multiplayer-arena-header">
        <div>
          <span className="lobby-eyebrow">Arena multiplayer · Casual 1v1</span>
          <h1>Round {battle.round.roundNumber} <small>· {MATCH_FORMAT_LABELS[battle.match.matchFormat]}</small></h1>
          <p>{ROOM_LANGUAGE_LABELS[battle.match.language]} · {ROOM_DIFFICULTY_LABELS[battle.match.difficulty]}</p>
        </div>
        <div className="multiplayer-arena-connection" role="status">
          <span className={realtimeConnected ? 'is-online' : ''} aria-hidden="true" />
          {realtimeConnected ? 'Tempo real conectado' : 'Reconectando à Arena...'}
        </div>
      </header>

      {error && <p className="multiplayer-arena-alert" role="alert">{error}</p>}

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
        <section className="multiplayer-round-intermission" aria-live="assertive">
          <Badge variant="gold">Round encerrado</Badge>
          <h2>Round para {playerName(previousRoundWinner)}</h2>
          <p>{playerName(previousRoundWinner)} resolveu primeiro.</p>
          <div className="multiplayer-intermission-score">
            <span>{playerName(me)} <strong>{me.roundsWon}</strong></span>
            <b>×</b>
            <span><strong>{opponent.roundsWon}</strong> {playerName(opponent)}</span>
          </div>
          <span>Próximo round em</span>
          <strong className="multiplayer-round-countdown">{roundCountdown}</strong>
        </section>
      )}

      <div className="multiplayer-arena-workspace">
        <main className="space-y-6 min-w-0">
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

          <section className={`multiplayer-console multiplayer-console--${submissionTone}`} aria-live="polite">
            <div>
              <span>Console da sua solução</span>
              {ownSubmission && <Badge variant={ownSubmission.status === 'accepted' ? 'success' : 'default'}>{ownSubmission.status.replaceAll('_', ' ')}</Badge>}
            </div>
            <strong>{action ? 'Enviando ao avaliador...' : resultMessage || 'Execute os exemplos públicos ou envie para os testes ocultos.'}</strong>
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
        </main>

        <aside className="multiplayer-arena-sidebar space-y-6">
          <Card variant="premium">
            <CardHeader>
              <Badge variant={opponentConnected ? 'online' : 'warning'} className="w-fit">
                {opponentConnected ? 'Online' : 'Conexão instável'}
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
              <CardTitle>Partida segura</CardTitle>
              <CardDescription>O servidor decide desafio, testes, placar e vencedor.</CardDescription>
            </CardHeader>
            <CardContent className="multiplayer-match-metadata">
              <span>Round <strong>{battle.round.roundNumber}/{maxRounds}</strong></span>
              <span>Tempo <strong>{formatDuration(battle.match.startedAt, battle.match.finishedAt, clockMs)}</strong></span>
              <span>Modo <strong>Casual</strong></span>
            </CardContent>
          </Card>

          {!matchFinished && (
            <Button
              type="button"
              variant="danger"
              fullWidth
              disabled={Boolean(action)}
              onClick={() => void handleSurrender()}
            >
              {action === 'surrender' ? 'Desistindo...' : 'Desistir'}
            </Button>
          )}
        </aside>
      </div>

      {matchFinished && (
        <div className={`multiplayer-result-overlay multiplayer-result-overlay--${matchWon ? 'victory' : 'defeat'}`} role="dialog" aria-modal="true" aria-labelledby="multiplayer-result-title">
          <section>
            <Badge variant={matchWon ? 'gold' : 'danger'}>Partida encerrada</Badge>
            <h2 id="multiplayer-result-title">{matchWon ? 'Vitória' : 'Derrota'}</h2>
            <p>{matchWon ? 'Você venceu a batalha.' : `${playerName(opponent)} venceu a batalha.`}</p>
            <div className="multiplayer-result-score">
              <strong>{me.roundsWon}</strong><span>×</span><strong>{opponent.roundsWon}</strong>
            </div>
            <dl>
              <div><dt>Tempo total</dt><dd>{formatDuration(battle.match.startedAt, battle.match.finishedAt, clockMs)}</dd></div>
              <div><dt>Rounds</dt><dd>{battle.round.roundNumber}</dd></div>
              <div><dt>Adversário</dt><dd>{playerName(opponent)}</dd></div>
            </dl>
            <div className="multiplayer-result-actions">
              <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.MULTIPLAYER, { replace: true })}>
                Voltar ao Multiplayer
              </Button>
              <Button type="button" variant="gold" onClick={playAgain}>Jogar novamente</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
