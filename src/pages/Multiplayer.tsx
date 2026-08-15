import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout'
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
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice] = useState(() =>
    typeof locationState?.notice === 'string' ? locationState.notice : '',
  )
  const ticketRef = useRef<MatchmakingTicket | null>(null)
  const autoSearchStartedRef = useRef(false)

  useEffect(() => {
    ticketRef.current = ticket
  }, [ticket])

  const applyTicket = useCallback(async (nextTicket: MatchmakingTicket | null) => {
    if (!nextTicket || nextTicket.status === 'cancelled' || nextTicket.status === 'expired') {
      if (nextTicket?.status === 'cancelled' && ticketRef.current?.status === 'matched') {
        setError('O adversário saiu da partida. Você pode iniciar uma nova busca.')
      }
      setTicket(null)
      setMatchedRoom(null)
      return
    }

    setTicket(nextTicket)
    if (nextTicket.status !== 'matched' || !nextTicket.matchedRoomId) return

    const currentRoom = await getCurrentRoom()
    if (currentRoom?.id === nextTicket.matchedRoomId && currentRoom.roomKind === 'quick_match') {
      setMatchedRoom(currentRoom)
      return
    }

    setError('A partida foi encontrada, mas a sala ainda não ficou disponível. Tentando novamente...')
  }, [])

  const loadOverview = useCallback(async () => {
    setError('')
    try {
      const [currentRoom, queueStatus, nextPublicRooms, nextInvites] = await Promise.all([
        getCurrentRoom(),
        getQueueStatus(),
        listPublicRooms(),
        getRoomInvites(),
      ])

      if (currentRoom) {
        navigate(roomPath(currentRoom.code), { replace: true })
        return
      }

      await applyTicket(queueStatus)
      setPublicRooms(nextPublicRooms)
      setInvites(nextInvites)
    } catch (loadError) {
      setError(roomErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [applyTicket, navigate])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadOverview(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadOverview])

  useEffect(() => {
    if (!user) return
    return subscribeRoomInvites(user.id, () => void loadOverview())
  }, [loadOverview, user])

  useEffect(() => {
    if (!user) return
    const channel = subscribeToMatchmaking(user.id, (event) => {
      const currentTicket = ticketRef.current
      if (!currentTicket || event.ticketId !== currentTicket.ticketId) return
      void pollQueue(currentTicket.ticketId)
        .then(applyTicket)
        .catch((refreshError: unknown) => setError(roomErrorMessage(refreshError)))
    })
    return () => void unsubscribeFromMatchmaking(channel)
  }, [applyTicket, user])

  useEffect(() => {
    if (ticket?.status !== 'searching') return
    let active = true
    const ticketId = ticket.ticketId

    const refresh = async (kind: 'poll' | 'heartbeat') => {
      try {
        const nextTicket = kind === 'heartbeat'
          ? await heartbeatQueue(ticketId)
          : await pollQueue(ticketId)
        if (active && ticketRef.current?.ticketId === ticketId) await applyTicket(nextTicket)
      } catch (refreshError) {
        if (!active || ticketRef.current?.ticketId !== ticketId) return
        if (refreshError instanceof MatchmakingServiceError && refreshError.code === 'TICKET_NOT_FOUND') {
          setTicket(null)
          return
        }
        setError(roomErrorMessage(refreshError))
      }
    }

    const pollId = window.setInterval(() => void refresh('poll'), 2_500)
    const heartbeatId = window.setInterval(() => void refresh('heartbeat'), 10_000)
    return () => {
      active = false
      window.clearInterval(pollId)
      window.clearInterval(heartbeatId)
    }
  }, [applyTicket, ticket?.status, ticket?.ticketId])

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
    if (busyAction || ticketRef.current) return
    setBusyAction('quick-match')
    setError('')
    try {
      await applyTicket(await joinQueue(quickPreferences))
    } catch (actionError) {
      if (actionError instanceof MatchmakingServiceError && actionError.code === 'ALREADY_SEARCHING') {
        await applyTicket(await getQueueStatus())
      } else {
        setError(roomErrorMessage(actionError))
      }
    } finally {
      setBusyAction(null)
    }
  }, [applyTicket, busyAction, quickPreferences])

  useEffect(() => {
    if (
      loading ||
      locationState?.autoSearch !== true ||
      autoSearchStartedRef.current ||
      ticket
    ) return
    autoSearchStartedRef.current = true
    void startQuickMatch()
  }, [loading, locationState?.autoSearch, startQuickMatch, ticket])

  const handleCancelSearch = async () => {
    const currentTicket = ticketRef.current
    if (!currentTicket || currentTicket.status !== 'searching' || busyAction) return
    setBusyAction('cancel-quick-match')
    setError('')
    try {
      await cancelQueue(currentTicket.ticketId)
      if (ticketRef.current?.ticketId === currentTicket.ticketId) setTicket(null)
    } catch (actionError) {
      if (actionError instanceof MatchmakingServiceError && actionError.code === 'TICKET_NOT_FOUND') {
        setTicket(null)
      } else {
        setError(roomErrorMessage(actionError))
      }
    } finally {
      setBusyAction(null)
    }
  }

  const runRoomAction = async (key: string, action: () => Promise<{ code: string }>) => {
    if (busyAction) return
    setBusyAction(key)
    setError('')
    try {
      const room = await action()
      navigate(roomPath(room.code))
    } catch (actionError) {
      setError(roomErrorMessage(actionError))
    } finally {
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
    if (busyAction) return
    setBusyAction(`decline:${inviteId}`)
    setError('')
    try {
      await declineRoomInvite(inviteId)
      await loadOverview()
    } catch (actionError) {
      setError(roomErrorMessage(actionError))
    } finally {
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

  if (ticket?.status === 'searching') {
    return (
      <div className="page-container multiplayer-page">
        {pageHeader}
        <Card variant="premium" className="quick-match-status-card" aria-live="polite">
          <div className="quick-match-radar" aria-hidden="true"><span /></div>
          <Badge variant="online">Buscando</Badge>
          <CardTitle>Procurando adversário...</CardTitle>
          <CardDescription>
            {ROOM_LANGUAGE_LABELS[ticket.language]} · {ROOM_DIFFICULTY_LABELS[ticket.difficulty]}
          </CardDescription>
          <strong className="quick-match-elapsed">
            {elapsedLabel(ticket.joinedAt, clockMs)}
          </strong>
          <p className="text-sm text-muted">Mantenha esta página aberta enquanto buscamos alguém compatível.</p>
          {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
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
    const players = matchedRoom?.members ?? []
    const matchedLanguage = matchedRoom?.language ?? ticket?.language ?? quickPreferences.language
    const matchedDifficulty = matchedRoom?.difficulty ?? ticket?.difficulty ?? quickPreferences.difficulty
    return (
      <div className="page-container multiplayer-page">
        {pageHeader}
        <Card variant="premium" className="quick-match-status-card quick-match-status-card--found" aria-live="assertive">
          <div className="quick-match-versus">
            <div>
              <span aria-hidden="true">{players[0]?.profile.displayName.slice(0, 1).toUpperCase() ?? '1'}</span>
              <small>{players[0]?.profile.displayName ?? 'Você'}</small>
            </div>
            <strong aria-hidden="true">VS</strong>
            <div>
              <span aria-hidden="true">{players[1]?.profile.displayName.slice(0, 1).toUpperCase() ?? '2'}</span>
              <small>{players[1]?.profile.displayName ?? 'Adversário'}</small>
            </div>
          </div>
          <Badge variant="gold">Partida encontrada</Badge>
          <CardTitle>Adversário encontrado!</CardTitle>
          <CardDescription>
            {ROOM_LANGUAGE_LABELS[matchedLanguage]} · {ROOM_DIFFICULTY_LABELS[matchedDifficulty]} · Melhor de 1
          </CardDescription>
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
            <Badge variant="online" className="w-fit">Matchmaking ativo</Badge>
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
              <Badge variant="gold" className="w-fit">Arena personalizada</Badge>
              <CardTitle>Criar sala</CardTitle>
              <CardDescription>Monte uma Arena com regras validadas pelo servidor.</CardDescription>
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
                Permitir espectadores na futura Arena
              </label>
              <Button type="submit" fullWidth disabled={busyAction === 'create'}>
                {busyAction === 'create' ? 'Criando sala...' : 'Criar sala'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </section>

      <Card variant="premium" className="mt-6">
        <form onSubmit={handleJoin} className="multiplayer-code-form">
          <div><CardTitle>Entrar por código</CardTitle><CardDescription>O código identifica a sala; autenticação e regras continuam obrigatórias.</CardDescription></div>
          <Input label="Código da sala" value={roomCode} placeholder="DR-_____" autoComplete="off" spellCheck={false} maxLength={8} onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))} className="font-mono uppercase tracking-[0.16em]" />
          <Button type="submit" disabled={busyAction === 'join' || roomCode.length !== 8}>{busyAction === 'join' ? 'Entrando...' : 'Entrar'}</Button>
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
                    <Button type="button" size="sm" disabled={Boolean(busyAction)} onClick={() => void runRoomAction(`accept:${invite.id}`, () => acceptRoomInvite(invite.id))}>Entrar</Button>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(busyAction)} onClick={() => void handleDecline(invite.id)}>Recusar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="public-rooms-title">
        <div className="multiplayer-section-heading"><div><h2 id="public-rooms-title">Salas públicas</h2><p>Lista recente de lobbies personalizados abertos.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => void loadOverview()}>Atualizar</Button></div>
        {loading ? (
          <Card><p className="text-sm text-muted" role="status">Carregando lobbies...</p></Card>
        ) : publicRooms.length === 0 ? (
          <Card className="text-center"><CardTitle>Nenhuma sala pública disponível</CardTitle><CardDescription>Crie uma sala ou entre com um código compartilhado.</CardDescription></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {publicRooms.map((room) => (
              <Card key={room.roomId} hoverable className="public-room-card">
                <div className="flex items-start justify-between gap-4"><div><CardTitle>{room.hostDisplayName}</CardTitle><CardDescription>@{room.hostUsername} · {room.code}</CardDescription></div><Badge variant="online">{room.playerCount}/2</Badge></div>
                <div className="room-meta-row mt-5"><span>{ROOM_LANGUAGE_LABELS[room.language]}</span><span>{ROOM_DIFFICULTY_LABELS[room.difficulty]}</span><span>{MATCH_FORMAT_LABELS[room.matchFormat]}</span></div>
                <Button type="button" className="mt-5" size="sm" disabled={Boolean(busyAction)} onClick={() => void runRoomAction(`public:${room.roomId}`, () => joinRoomByCode(room.code))}>Entrar</Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 text-center"><Button type="button" variant="ghost" onClick={() => navigate(ROUTES.BATALHA_DEVS)}>Voltar para Batalha de Devs</Button></div>
    </div>
  )
}
