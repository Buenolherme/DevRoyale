import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from '@/components/ui'
import { useAuth } from '@/hooks'
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
  type PublicRoom,
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

function roomErrorMessage(error: unknown): string {
  return error instanceof RoomServiceError
    ? error.message
    : 'Não foi possível carregar o Multiplayer. Tente novamente.'
}

export function MultiplayerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [settings, setSettings] = useState<RoomSettings>(defaultSettings)
  const [roomCode, setRoomCode] = useState('')
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [invites, setInvites] = useState<RoomInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice] = useState(() => {
    const state = location.state as { notice?: unknown } | null
    return typeof state?.notice === 'string' ? state.notice : ''
  })

  const loadOverview = useCallback(async () => {
    setError('')
    try {
      const [currentRoom, nextPublicRooms, nextInvites] = await Promise.all([
        getCurrentRoom(),
        listPublicRooms(),
        getRoomInvites(),
      ])

      if (currentRoom) {
        navigate(roomPath(currentRoom.code), { replace: true })
        return
      }

      setPublicRooms(nextPublicRooms)
      setInvites(nextInvites)
    } catch (loadError) {
      setError(roomErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadOverview(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadOverview])

  useEffect(() => {
    if (!user) return
    return subscribeRoomInvites(user.id, () => void loadOverview())
  }, [loadOverview, user])

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

  return (
    <div className="page-container multiplayer-page">
      <PageHeader
        title="Multiplayer"
        description="Crie um lobby 1v1, convide um amigo ou entre em uma sala pública."
      >
        <Badge variant="gold" className="normal-case tracking-normal">Lobby online</Badge>
      </PageHeader>

      {(notice || error) && (
        <p
          className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-danger/25 bg-danger-muted text-danger' : 'border-success/25 bg-success-muted text-success'}`}
          role={error ? 'alert' : 'status'}
        >
          {error || notice}
        </p>
      )}

      <section className="multiplayer-entry-grid" aria-label="Formas de jogar">
        <Card className="multiplayer-quick-card">
          <CardHeader>
            <Badge variant="default" className="w-fit">Em breve</Badge>
            <CardTitle>Partida rápida</CardTitle>
            <CardDescription>Encontre automaticamente um adversário.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="secondary" disabled fullWidth>
              Partida rápida chega na próxima etapa
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
                <Select
                  label="Linguagem"
                  value={settings.language}
                  options={Object.entries(ROOM_LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
                  onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value as RoomSettings['language'] }))}
                />
                <Select
                  label="Dificuldade"
                  value={settings.difficulty}
                  options={Object.entries(ROOM_DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))}
                  onChange={(event) => setSettings((current) => ({ ...current, difficulty: event.target.value as RoomSettings['difficulty'] }))}
                />
                <Select
                  label="Formato"
                  value={settings.matchFormat}
                  options={Object.entries(MATCH_FORMAT_LABELS).map(([value, label]) => ({ value, label }))}
                  onChange={(event) => setSettings((current) => ({ ...current, matchFormat: event.target.value as RoomSettings['matchFormat'] }))}
                />
                <Select
                  label="Visibilidade"
                  value={settings.visibility}
                  options={[
                    { value: 'private', label: 'Privada' },
                    { value: 'public', label: 'Pública' },
                  ]}
                  onChange={(event) => setSettings((current) => ({ ...current, visibility: event.target.value as RoomSettings['visibility'] }))}
                />
              </div>
              <label className="multiplayer-check-row">
                <input
                  type="checkbox"
                  checked={settings.allowSpectators}
                  onChange={(event) => setSettings((current) => ({ ...current, allowSpectators: event.target.checked }))}
                />
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
          <div>
            <CardTitle>Entrar por código</CardTitle>
            <CardDescription>O código identifica a sala; autenticação e regras continuam obrigatórias.</CardDescription>
          </div>
          <Input
            label="Código da sala"
            value={roomCode}
            placeholder="DR-_____"
            autoComplete="off"
            spellCheck={false}
            maxLength={8}
            onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
            className="font-mono uppercase tracking-[0.16em]"
          />
          <Button type="submit" disabled={busyAction === 'join' || roomCode.length !== 8}>
            {busyAction === 'join' ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Card>

      {invites.length > 0 && (
        <section className="mt-8" aria-labelledby="room-invites-title">
          <div className="multiplayer-section-heading">
            <div>
              <h2 id="room-invites-title">Convites de batalha</h2>
              <p>Convites expiram em dez minutos.</p>
            </div>
            <Badge variant="danger">{invites.length}</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {invites.map((invite) => (
              <Card key={invite.id} className="room-invite-card">
                <CardHeader>
                  <CardTitle>{invite.sender.displayName} convidou você</CardTitle>
                  <CardDescription>@{invite.sender.username} · Sala {invite.room.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="room-meta-row">
                    <span>{ROOM_LANGUAGE_LABELS[invite.room.language]}</span>
                    <span>{ROOM_DIFFICULTY_LABELS[invite.room.difficulty]}</span>
                    <span>{MATCH_FORMAT_LABELS[invite.room.matchFormat]}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={Boolean(busyAction)}
                      onClick={() => void runRoomAction(`accept:${invite.id}`, () => acceptRoomInvite(invite.id))}
                    >
                      Entrar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={Boolean(busyAction)}
                      onClick={() => void handleDecline(invite.id)}
                    >
                      Recusar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="public-rooms-title">
        <div className="multiplayer-section-heading">
          <div>
            <h2 id="public-rooms-title">Salas públicas</h2>
            <p>Lista recente de lobbies abertos. Não é matchmaking automático.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => void loadOverview()}>
            Atualizar
          </Button>
        </div>

        {loading ? (
          <Card><p className="text-sm text-muted" role="status">Carregando lobbies...</p></Card>
        ) : publicRooms.length === 0 ? (
          <Card className="text-center">
            <CardTitle>Nenhuma sala pública disponível</CardTitle>
            <CardDescription>Crie uma sala ou entre com um código compartilhado.</CardDescription>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {publicRooms.map((room) => (
              <Card key={room.roomId} hoverable className="public-room-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{room.hostDisplayName}</CardTitle>
                    <CardDescription>@{room.hostUsername} · {room.code}</CardDescription>
                  </div>
                  <Badge variant="online">{room.playerCount}/2</Badge>
                </div>
                <div className="room-meta-row mt-5">
                  <span>{ROOM_LANGUAGE_LABELS[room.language]}</span>
                  <span>{ROOM_DIFFICULTY_LABELS[room.difficulty]}</span>
                  <span>{MATCH_FORMAT_LABELS[room.matchFormat]}</span>
                </div>
                <Button
                  type="button"
                  className="mt-5"
                  size="sm"
                  disabled={Boolean(busyAction)}
                  onClick={() => void runRoomAction(`public:${room.roomId}`, () => joinRoomByCode(room.code))}
                >
                  Entrar
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 text-center">
        <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.BATALHA_DEVS)}>
          Voltar para Batalha de Devs
        </Button>
      </div>
    </div>
  )
}
