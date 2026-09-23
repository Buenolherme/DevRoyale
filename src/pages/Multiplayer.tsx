import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout'
import { Avatar } from '@/components/ui/Avatar'
import { PageState } from '@/components/ui/PageState'
import '@/styles/pages/multiplayer-lobby-polish.css'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from '@/components/ui'
import { useAuth } from '@/hooks'
import {
  MatchmakingServiceError,
  cancelQueue,
  getQueueStatus,
  heartbeatQueue,
  joinQueue,
  pollQueue,
} from '@/lib/matchmaking-service'
import {
  subscribeToMatchmaking,
  unsubscribeFromMatchmaking,
} from '@/lib/matchmaking-realtime-service'
import { subscribeRoomInvites } from '@/lib/room-realtime-service'
import {
  RoomServiceError,
  acceptRoomInvite,
  createRoom,
  declineRoomInvite,
  getCurrentRoom,
  getRoomInvites,
  joinRoomByCode,
  listPublicRooms,
  normalizeRoomCode,
} from '@/lib/room-service'
import { ROUTES, roomPath } from '@/routes/paths'
import {
  MATCH_FORMAT_LABELS,
  ROOM_DIFFICULTY_LABELS,
  ROOM_LANGUAGE_LABELS,
  type MatchmakingTicket,
  type PublicRoom,
  type QuickMatchPreferences,
  type Room,
  type RoomInvite,
  type RoomSettings,
} from '@/types'

const defaultSettings: RoomSettings = {
  visibility: 'private',
  language: 'python',
  difficulty: 'basic',
  matchFormat: 'bo1',
  allowSpectators: false,
}

const defaultQuickPreferences: QuickMatchPreferences = {
  language: 'python',
  difficulty: 'basic',
}

type MultiplayerLocationState = {
  notice?: unknown
  autoSearch?: unknown
  quickPreferences?: Partial<QuickMatchPreferences>
}

function roomErrorMessage(error: unknown): string {
  if (error instanceof RoomServiceError || error instanceof MatchmakingServiceError) {
    return error.message
  }
  return 'Não foi possível carregar o Multiplayer. Tente novamente.'
}

function preferencesFromLocation(state: MultiplayerLocationState | null): QuickMatchPreferences {
  const language = state?.quickPreferences?.language
  const difficulty = state?.quickPreferences?.difficulty
  return {
    language: language && language in ROOM_LANGUAGE_LABELS
      ? language
      : defaultQuickPreferences.language,
    difficulty: difficulty && difficulty in ROOM_DIFFICULTY_LABELS
      ? difficulty
      : defaultQuickPreferences.difficulty,
  }
}

function elapsedLabel(startedAt: string, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000))
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function MultiplayerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const locationState = location.state as MultiplayerLocationState | null
  const [settings, setSettings] = useState<RoomSettings>(defaultSettings)
  const [quickPreferences, setQuickPreferences] = useState<QuickMatchPreferences>(() =>
    preferencesFromLocation(locationState),
  )
  const [roomCode, setRoomCode] = useState('')
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [invites, setInvites] = useState<RoomInvite[]>([])
  const [ticket, setTicket] = useState<MatchmakingTicket | null>(null)
  const [matchedRoom, setMatchedRoom] = useState<Room | null>(null)
  const [clockMs, setClockMs] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(() =>
    typeof locationState?.notice === 'string' ? locationState.notice : '',
  )
  const ticketRef = useRef<MatchmakingTicket | null>(null)
  const autoSearchStartedRef = useRef(false)
  const mountedRef = useRef(true)
  const overviewLoadingRef = useRef(false)
  const queueRefreshingRef = useRef(false)
  const queueVersionRef = useRef(0)
  const actionRef = useRef(false)
  const userId = user?.id
  const ticketId = ticket?.ticketId
  const ticketStatus = ticket?.status

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; queueVersionRef.current += 1 }
  }, [])

  const applyTicket = useCallback(async (nextTicket: MatchmakingTicket | null, version = queueVersionRef.current) => {
    if (!mountedRef.current || version !== queueVersionRef.current) return
    if (!nextTicket || nextTicket.status === 'cancelled' || nextTicket.status === 'expired') {
      if (nextTicket?.status === 'cancelled' && ticketRef.current?.status === 'matched') {
        setError('O adversário saiu da partida. Você pode iniciar uma nova busca.')
      }
      if (nextTicket?.status === 'expired') setNotice('A busca expirou. Você pode buscar uma nova partida.')
      ticketRef.current = null
      setTicket(null)
      setMatchedRoom(null)
      return
    }

    ticketRef.current = nextTicket
    setTicket(nextTicket)
    if (nextTicket.status !== 'matched' || !nextTicket.matchedRoomId) return

    const currentRoom = await getCurrentRoom()
    if (!mountedRef.current || version !== queueVersionRef.current) return
    if (currentRoom?.id === nextTicket.matchedRoomId && currentRoom.roomKind === 'quick_match') {
      setMatchedRoom(currentRoom)
      return
    }

    setError('A partida foi encontrada, mas a sala ainda não ficou disponível. Tentando novamente...')
  }, [])

  const loadOverview = useCallback(async (restoreSession = false) => {
    if (overviewLoadingRef.current) return
    overviewLoadingRef.current = true
    setRefreshing(true)
    setError('')
    const version = queueVersionRef.current
    try {
      const [currentRoom, queueStatus, nextPublicRooms, nextInvites] = await Promise.all([
        restoreSession ? getCurrentRoom() : Promise.resolve(null),
        restoreSession ? getQueueStatus() : Promise.resolve(null),
        listPublicRooms(),
        getRoomInvites(),
      ])
      if (!mountedRef.current || version !== queueVersionRef.current) return

      if (currentRoom) {
        navigate(roomPath(currentRoom.code), { replace: true })
        return
      }

      if (restoreSession) await applyTicket(queueStatus, version)
      setPublicRooms(nextPublicRooms)
      setInvites(nextInvites)
    } catch (loadError) {
      if (mountedRef.current) setError(roomErrorMessage(loadError))
    } finally {
      overviewLoadingRef.current = false
      if (mountedRef.current) { setLoading(false); setRefreshing(false) }
    }
  }, [applyTicket, navigate])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadOverview(true), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadOverview])

  useEffect(() => {
    if (!userId) return
    return subscribeRoomInvites(userId, () => void loadOverview())
  }, [loadOverview, userId])

  const refreshQueue = useCallback(async (kind: 'poll' | 'heartbeat' = 'poll') => {
    const currentTicket = ticketRef.current
    if (!currentTicket || queueRefreshingRef.current || actionRef.current) return
    queueRefreshingRef.current = true
    const version = queueVersionRef.current
    try {
      const nextTicket = kind === 'heartbeat'
        ? await heartbeatQueue(currentTicket.ticketId)
        : await pollQueue(currentTicket.ticketId)
      if (!mountedRef.current || version !== queueVersionRef.current) return
      setError('')
      await applyTicket(nextTicket, version)
    } catch (refreshError) {
      if (!mountedRef.current || version !== queueVersionRef.current) return
      if (refreshError instanceof MatchmakingServiceError && refreshError.code === 'TICKET_NOT_FOUND') {
        await applyTicket(null, version)
        setNotice('Esta busca foi encerrada. Você pode começar outra partida.')
      } else { setError(roomErrorMessage(refreshError)) }
    } finally { queueRefreshingRef.current = false }
  }, [applyTicket])

  useEffect(() => {
    if (!userId) return
    const channel = subscribeToMatchmaking(userId, (event) => {
      const currentTicket = ticketRef.current
      if (!currentTicket || event.ticketId !== currentTicket.ticketId) return
      void refreshQueue()
    })
    return () => void unsubscribeFromMatchmaking(channel)
  }, [refreshQueue, userId])

  useEffect(() => {
    if (!ticketId || matchedRoom) return
    const pollId = window.setInterval(() => void refreshQueue(), 2_500)
    const heartbeatId = ticketStatus === 'searching'
      ? window.setInterval(() => void refreshQueue('heartbeat'), 11_000)
      : null
    const reconnect = () => void refreshQueue()
    window.addEventListener('online', reconnect)
    return () => {
      window.clearInterval(pollId)
      if (heartbeatId !== null) window.clearInterval(heartbeatId)
      window.removeEventListener('online', reconnect)
    }
  }, [matchedRoom, refreshQueue, ticketStatus, ticketId])

  useEffect(() => {
    if (ticket?.status !== 'searching') return
    const clockId = window.setInterval(() => setClockMs(Date.now()), 1_000)
    return () => window.clearInterval(clockId)
  }, [ticket?.status])

  useEffect(() => {
    if (!matchedRoom) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timeoutId = window.setTimeout(
      () => navigate(roomPath(matchedRoom.code), { replace: true }),
      reducedMotion ? 150 : 1_400,
    )
    return () => window.clearTimeout(timeoutId)
  }, [matchedRoom, navigate])

  const startQuickMatch = useCallback(async () => {
    if (actionRef.current || ticketRef.current) return
    actionRef.current = true
    queueVersionRef.current += 1
    setBusyAction('quick-match')
    setError('')
    try {
      await applyTicket(await joinQueue(quickPreferences))
    } catch (actionError) {
      if (actionError instanceof MatchmakingServiceError && actionError.code === 'ALREADY_SEARCHING') {
        try { await applyTicket(await getQueueStatus()) }
        catch (recoveryError) { setError(roomErrorMessage(recoveryError)) }
      } else if (actionError instanceof MatchmakingServiceError && actionError.code === 'ACTIVE_ROOM') {
        await loadOverview(true)
      } else {
        setError(roomErrorMessage(actionError))
      }
    } finally {
      actionRef.current = false
      setBusyAction(null)
    }
  }, [applyTicket, loadOverview, quickPreferences])

  useEffect(() => {
    if (
      loading ||
      Boolean(error) ||
      locationState?.autoSearch !== true ||
      autoSearchStartedRef.current ||
      ticket
    ) return
    autoSearchStartedRef.current = true
    void startQuickMatch()
  }, [error, loading, locationState?.autoSearch, startQuickMatch, ticket])

  const handleCancelSearch = async () => {
    const currentTicket = ticketRef.current
    if (!currentTicket || currentTicket.status !== 'searching' || actionRef.current) return
    actionRef.current = true
    queueVersionRef.current += 1
    setBusyAction('cancel-quick-match')
    setError('')
    try {
      await applyTicket(await cancelQueue(currentTicket.ticketId))
      if (!ticketRef.current) setNotice('Busca cancelada. Suas preferências foram mantidas.')
    } catch (actionError) {
      if (actionError instanceof MatchmakingServiceError && actionError.code === 'TICKET_NOT_FOUND') {
        await applyTicket(null)
      } else {
        setError(roomErrorMessage(actionError))
      }
    } finally {
      actionRef.current = false
      setBusyAction(null)
    }
  }

  const runRoomAction = async (key: string, action: () => Promise<{ code: string }>) => {
    if (actionRef.current) return
    actionRef.current = true
    setBusyAction(key)
    setError('')
    try {
      const room = await action()
      navigate(roomPath(room.code))
    } catch (actionError) {
      if (actionError instanceof RoomServiceError && actionError.code === 'ALREADY_IN_ROOM') {
        await loadOverview(true)
      } else { setError(roomErrorMessage(actionError)) }
    } finally {
      actionRef.current = false
      setBusyAction(null)
    }
  }

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    void runRoomAction('create', () => createRoom(settings))
  }

  const handleJoin = (event: FormEvent) => {
    event.preventDefault()
    void runRoomAction('join', () => joinRoomByCode(roomCode))
  }

  const handleDecline = async (inviteId: string) => {
    if (actionRef.current) return
    actionRef.current = true
    setBusyAction(`decline:${inviteId}`)
    setError('')
    try {
      await declineRoomInvite(inviteId)
      setInvites((current) => current.filter((invite) => invite.id !== inviteId))
      setNotice('Convite recusado.')
      await loadOverview()
    } catch (actionError) {
      setError(roomErrorMessage(actionError))
    } finally {
      actionRef.current = false
      setBusyAction(null)
    }
  }

  const pageHeader = (
    <PageHeader
      title="Multiplayer"
      description="Encontre um adversário automaticamente ou monte um lobby 1v1 personalizado."
    >
      <Badge variant="gold" className="normal-case tracking-normal">Lobby online</Badge>
    </PageHeader>
  )

  if (loading) {
    return <div className="page-container multiplayer-page">{pageHeader}<PageState loading title="Preparando o Multiplayer..." description="Recuperando sua sala, convites e preferências de partida." /></div>
  }

  if (ticket?.status === 'searching') {
    return (
      <div className="page-container multiplayer-page">
        {pageHeader}
        <Card variant="premium" className="quick-match-status-card">
          <div className="quick-match-radar" aria-hidden="true"><span /></div>
          <Badge variant="online">Buscando</Badge>
          <div role="status"><CardTitle>Buscando adversário...</CardTitle></div>
          <CardDescription>
            {ROOM_LANGUAGE_LABELS[ticket.language]} · {ROOM_DIFFICULTY_LABELS[ticket.difficulty]}
          </CardDescription>
          <strong className="quick-match-elapsed" role="timer" aria-label="Tempo de busca" aria-live="off">
            {elapsedLabel(ticket.joinedAt, clockMs)}
          </strong>
          <p className="text-sm text-muted">Mantenha esta página aberta enquanto buscamos alguém compatível.</p>
          {error && <p className="text-sm font-semibold text-danger" role="alert">{error} A reconexão é automática.</p>}
          <Button
            type="button"
            variant="secondary"
            disabled={busyAction === 'cancel-quick-match'}
            onClick={() => void handleCancelSearch()}
          >
            {busyAction === 'cancel-quick-match' ? 'Cancelando...' : 'Cancelar busca'}
          </Button>
        </Card>
      </div>
    )
  }

  if (ticket?.status === 'matched' || matchedRoom) {
    const players = [...(matchedRoom?.members ?? [])].sort((a, b) => Number(b.userId === userId) - Number(a.userId === userId))
    const matchedLanguage = matchedRoom?.language ?? ticket?.language ?? quickPreferences.language
    const matchedDifficulty = matchedRoom?.difficulty ?? ticket?.difficulty ?? quickPreferences.difficulty
    return (
      <div className="page-container multiplayer-page">
        {pageHeader}
        <Card variant="premium" className="quick-match-status-card quick-match-status-card--found" aria-live="assertive">
          {players.length === 2 ? (
            <div className="quick-match-versus">
              <div><Avatar name={players[0].profile.displayName} src={players[0].profile.avatarUrl} className="matchmaking-avatar" /><small>{players[0].profile.displayName}</small></div>
              <strong aria-hidden="true">VS</strong>
              <div><Avatar name={players[1].profile.displayName} src={players[1].profile.avatarUrl} className="matchmaking-avatar" /><small>{players[1].profile.displayName}</small></div>
            </div>
          ) : <p role="status" className="text-sm text-muted">Carregando jogadores...</p>}
          <Badge variant="gold">Partida encontrada</Badge>
          <CardTitle>Adversário encontrado!</CardTitle>
          <CardDescription>
            {ROOM_LANGUAGE_LABELS[matchedLanguage]} · {ROOM_DIFFICULTY_LABELS[matchedDifficulty]} · Melhor de 1
          </CardDescription>
          <p className="text-sm text-muted">Preparando o lobby para os dois jogadores.</p>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          {error && <Button type="button" variant="secondary" onClick={() => void refreshQueue()}>Tentar reconectar</Button>}
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container multiplayer-page">
      {pageHeader}

      {(notice || error) && (
        <p
          className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-danger/25 bg-danger-muted text-danger' : 'border-success/25 bg-success-muted text-success'}`}
          role={error ? 'alert' : 'status'}
        >
          {error || notice}
        </p>
      )}

      <section className="multiplayer-entry-grid" aria-label="Formas de jogar">
        <Card variant="premium" className="multiplayer-quick-card">
          <CardHeader>
            <Badge variant="online" className="w-fit">01 · Encontre seu adversário</Badge>
            <CardTitle>Partida rápida</CardTitle>
            <CardDescription>Encontre automaticamente alguém com as mesmas preferências.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Linguagem"
              value={quickPreferences.language}
              disabled={loading || Boolean(busyAction)}
              options={Object.entries(ROOM_LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
              onChange={(event) => setQuickPreferences((current) => ({
                ...current,
                language: event.target.value as QuickMatchPreferences['language'],
              }))}
            />
            <Select
              label="Dificuldade"
              value={quickPreferences.difficulty}
              disabled={loading || Boolean(busyAction)}
              options={Object.entries(ROOM_DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))}
              onChange={(event) => setQuickPreferences((current) => ({
                ...current,
                difficulty: event.target.value as QuickMatchPreferences['difficulty'],
              }))}
            />
            <div className="quick-match-promises" aria-label="Regras da partida rápida">
              <span>1v1</span><span>Melhor de 1</span><span>Lobby privado</span>
            </div>
            <Button
              type="button"
              fullWidth
              disabled={loading || Boolean(busyAction)}
              onClick={() => void startQuickMatch()}
            >
              {busyAction === 'quick-match' ? 'Entrando na fila...' : 'Buscar partida'}
            </Button>
          </CardContent>
        </Card>

        <Card variant="premium" className="multiplayer-create-card">
          <form onSubmit={handleCreate}>
            <CardHeader>
              <Badge variant="gold" className="w-fit">02 · Jogue com amigos</Badge>
              <CardTitle>Sala personalizada</CardTitle>
              <CardDescription>Escolha as regras e convide alguém para um duelo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Linguagem" value={settings.language} options={Object.entries(ROOM_LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value as RoomSettings['language'] }))} />
                <Select label="Dificuldade" value={settings.difficulty} options={Object.entries(ROOM_DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))} onChange={(event) => setSettings((current) => ({ ...current, difficulty: event.target.value as RoomSettings['difficulty'] }))} />
                <Select label="Formato" value={settings.matchFormat} options={Object.entries(MATCH_FORMAT_LABELS).map(([value, label]) => ({ value, label }))} onChange={(event) => setSettings((current) => ({ ...current, matchFormat: event.target.value as RoomSettings['matchFormat'] }))} />
                <Select label="Visibilidade" value={settings.visibility} options={[{ value: 'private', label: 'Privada' }, { value: 'public', label: 'Pública' }]} onChange={(event) => setSettings((current) => ({ ...current, visibility: event.target.value as RoomSettings['visibility'] }))} />
              </div>
              <label className="multiplayer-check-row">
                <input type="checkbox" checked={settings.allowSpectators} onChange={(event) => setSettings((current) => ({ ...current, allowSpectators: event.target.checked }))} />
                Permitir espectadores quando disponíveis
              </label>
              <Button type="submit" fullWidth disabled={Boolean(busyAction)}>
                {busyAction === 'create' ? 'Criando sala...' : 'Criar sala'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </section>

      <Card variant="premium" className="mt-6">
        <form onSubmit={handleJoin} className="multiplayer-code-form">
          <div><CardTitle>Entrar por código</CardTitle><CardDescription>Recebeu um convite? Cole o código para encontrar a sala.</CardDescription></div>
          <Input label="Código da sala" value={roomCode} placeholder="DR-_____" autoComplete="off" spellCheck={false} maxLength={8} onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))} className="font-mono uppercase tracking-[0.16em]" />
          <Button type="submit" disabled={Boolean(busyAction) || roomCode.length !== 8}>{busyAction === 'join' ? 'Entrando...' : 'Entrar'}</Button>
        </form>
      </Card>

      {invites.length > 0 && (
        <section className="mt-8" aria-labelledby="room-invites-title">
          <div className="multiplayer-section-heading"><div><h2 id="room-invites-title">Convites de batalha</h2><p>Convites expiram em dez minutos.</p></div><Badge variant="danger">{invites.length}</Badge></div>
          <div className="grid gap-4 lg:grid-cols-2">
            {invites.map((invite) => (
              <Card key={invite.id} className="room-invite-card">
                <CardHeader><CardTitle>{invite.sender.displayName} convidou você</CardTitle><CardDescription>@{invite.sender.username} · Sala {invite.room.code}</CardDescription></CardHeader>
                <CardContent>
                  <div className="room-meta-row"><span>{ROOM_LANGUAGE_LABELS[invite.room.language]}</span><span>{ROOM_DIFFICULTY_LABELS[invite.room.difficulty]}</span><span>{MATCH_FORMAT_LABELS[invite.room.matchFormat]}</span></div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={Boolean(busyAction)} onClick={() => void runRoomAction(`accept:${invite.id}`, () => acceptRoomInvite(invite.id))}>{busyAction === `accept:${invite.id}` ? 'Entrando...' : 'Aceitar convite'}</Button>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(busyAction)} onClick={() => void handleDecline(invite.id)}>{busyAction === `decline:${invite.id}` ? 'Recusando...' : 'Recusar'}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="public-rooms-title">
        <div className="multiplayer-section-heading"><div><span className="lobby-eyebrow">03 · Entre em um lobby</span><h2 id="public-rooms-title">Salas públicas</h2><p>Salas personalizadas abertas para novos adversários.</p></div><Button type="button" variant="ghost" size="sm" disabled={refreshing || Boolean(busyAction)} onClick={() => void loadOverview()}>{refreshing ? 'Atualizando...' : 'Atualizar'}</Button></div>
        {publicRooms.length === 0 ? (
          <PageState title={error ? 'Salas indisponíveis no momento' : 'A próxima sala pode ser a sua'} description={error ? 'Atualize a lista para tentar novamente.' : 'Ainda não há salas públicas abertas. Crie uma sala pública ou encontre um adversário na partida rápida.'}>
            {!error && <Button type="button" variant="secondary" disabled={Boolean(busyAction)} onClick={() => void startQuickMatch()}>Buscar partida rápida</Button>}
          </PageState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {publicRooms.map((room) => (
              <Card key={room.roomId} hoverable className="public-room-card">
                <div className="flex items-start justify-between gap-4"><div><CardTitle>{room.hostDisplayName}</CardTitle><CardDescription>@{room.hostUsername} · {room.code}</CardDescription></div><Badge variant="online">{room.playerCount}/2</Badge></div>
                <div className="room-meta-row mt-5"><span>{ROOM_LANGUAGE_LABELS[room.language]}</span><span>{ROOM_DIFFICULTY_LABELS[room.difficulty]}</span><span>{MATCH_FORMAT_LABELS[room.matchFormat]}</span></div>
                <Button type="button" className="mt-5" size="sm" disabled={Boolean(busyAction) || room.playerCount >= 2} onClick={() => void runRoomAction(`public:${room.roomId}`, () => joinRoomByCode(room.code))}>{busyAction === `public:${room.roomId}` ? 'Entrando...' : room.playerCount >= 2 ? 'Sala cheia' : 'Entrar na sala'}</Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 text-center"><Button type="button" variant="ghost" onClick={() => navigate(ROUTES.BATALHA_DEVS)}>Voltar para Batalha de Devs</Button></div>
    </div>
  )
}
