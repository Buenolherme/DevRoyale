import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CrownIcon } from '@/components/layout'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select } from '@/components/ui'
import { useAuth, usePresence } from '@/hooks'
import {
  subscribeToMatchmaking,
  unsubscribeFromMatchmaking,
} from '@/lib/matchmaking-realtime-service'
import { subscribeRoom } from '@/lib/room-realtime-service'
import {
  RoomServiceError,
  cancelRoom,
  getRoom,
  joinRoomByCode,
  kickPlayer,
  leaveRoom,
  sendRoomInvite,
  setReady,
  startCountdown,
  updateRoomSettings,
} from '@/lib/room-service'
import { getFriends } from '@/lib/social-service'
import { ROUTES, battleMatchPath } from '@/routes/paths'
import {
  MATCH_FORMAT_LABELS,
  ROOM_DIFFICULTY_LABELS,
  ROOM_LANGUAGE_LABELS,
  type Friend,
  type Room,
  type RoomSettings,
} from '@/types'

function roomErrorMessage(error: unknown): string {
  return error instanceof RoomServiceError
    ? error.message
    : 'Não foi possível atualizar a sala. Tente novamente.'
}

export function LobbyPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { isUserOnline } = usePresence()
  const [room, setRoom] = useState<Room | null>(null)
  const [settings, setSettings] = useState<RoomSettings | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set())
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => {
    const state = location.state as { notice?: unknown } | null
    return typeof state?.notice === 'string' ? state.notice : ''
  })
  const [invitePanelOpen, setInvitePanelOpen] = useState(false)
  const [clockMs, setClockMs] = useState(() => Date.now())
  const [opponentLeft, setOpponentLeft] = useState(false)

  const currentMember = room?.members.find((member) => member.userId === user?.id)
  const isQuickMatch = room?.roomKind === 'quick_match'
  const isHost = room?.roomKind === 'custom' && room.hostId === user?.id
  const roomId = room?.id
  const canStart = Boolean(
    !isQuickMatch && isHost && room?.members.length === 2 && room.members.every((member) => member.ready),
  )

  const syncSettings = useCallback((nextRoom: Room) => {
    setSettings({
      visibility: nextRoom.visibility,
      language: nextRoom.language,
      difficulty: nextRoom.difficulty,
      matchFormat: nextRoom.matchFormat,
      allowSpectators: nextRoom.allowSpectators,
    })
  }, [])

  const loadRoom = useCallback(async (joinWhenNeeded = false) => {
    try {
      const nextRoom = await getRoom(code)
      setRoom(nextRoom)
      syncSettings(nextRoom)
      return nextRoom
    } catch (loadError) {
      if (
        joinWhenNeeded &&
        loadError instanceof RoomServiceError &&
        (loadError.code === 'ROOM_NOT_FOUND' || loadError.code === 'NOT_ROOM_MEMBER')
      ) {
        const joinedRoom = await joinRoomByCode(code)
        setRoom(joinedRoom)
        syncSettings(joinedRoom)
        return joinedRoom
      }
      throw loadError
    }
  }, [code, syncSettings])

  useEffect(() => {
    let active = true
    const initialize = async () => {
      setLoading(true)
      setError('')
      try {
        const nextRoom = await loadRoom(true)
        const nextFriends = nextRoom.roomKind === 'custom' ? await getFriends() : []
        if (!active) return
        setRoom(nextRoom)
        setFriends(nextFriends)
      } catch (loadError) {
        if (active) setError(roomErrorMessage(loadError))
      } finally {
        if (active) setLoading(false)
      }
    }
    void initialize()
    return () => { active = false }
  }, [loadRoom])

  useEffect(() => {
    if (!roomId || !user?.username) return

    return subscribeRoom(
      roomId,
      { id: user.id, username: user.username },
      {
        onConnectionChange: setRealtimeConnected,
        onPresenceChange: setConnectedUserIds,
        onRoomChange: () => {
          void loadRoom(false)
            .then((nextRoom) => setRoom(nextRoom))
            .catch((loadError: unknown) => {
              if (
                loadError instanceof RoomServiceError &&
                (loadError.code === 'NOT_ROOM_MEMBER' || loadError.code === 'ROOM_NOT_FOUND')
              ) {
                if (room?.roomKind === 'quick_match') {
                  setOpponentLeft(true)
                  return
                }
                navigate(ROUTES.MULTIPLAYER, {
                  replace: true,
                  state: { notice: 'Você foi removido da sala pelo host.' },
                })
                return
              }
              setError(roomErrorMessage(loadError))
            })
        },
      },
    )
  }, [loadRoom, navigate, room?.roomKind, roomId, user])

  useEffect(() => {
    if (!isQuickMatch || opponentLeft) return
    const intervalId = window.setInterval(() => {
      void loadRoom(false).catch((loadError: unknown) => {
        if (
          loadError instanceof RoomServiceError &&
          (loadError.code === 'NOT_ROOM_MEMBER' || loadError.code === 'ROOM_NOT_FOUND')
        ) {
          setOpponentLeft(true)
        }
      })
    }, 8_000)
    return () => window.clearInterval(intervalId)
  }, [isQuickMatch, loadRoom, opponentLeft])

  useEffect(() => {
    if (!isQuickMatch || !roomId || !user) return
    const channel = subscribeToMatchmaking(user.id, (event) => {
      if (event.type === 'queue_cancelled' && event.matchedRoomId === roomId) {
        setOpponentLeft(true)
      }
    })
    return () => void unsubscribeFromMatchmaking(channel)
  }, [isQuickMatch, roomId, user])

  useEffect(() => {
    if (room?.status !== 'starting' || !room.countdownStartedAt) return
    const intervalId = window.setInterval(() => setClockMs(Date.now()), 100)
    return () => window.clearInterval(intervalId)
  }, [room?.countdownStartedAt, room?.status])

  const countdownRemaining = room?.status === 'starting' && room.countdownStartedAt
    ? Math.ceil(3 - (clockMs - new Date(room.countdownStartedAt).getTime()) / 1000)
    : null
  const countdown = countdownRemaining !== null && countdownRemaining > 0
    ? countdownRemaining
    : null
  const arenaReady = countdownRemaining !== null && countdownRemaining <= 0

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    if (busyAction) return
    setBusyAction(key)
    setError('')
    setFeedback('')
    try {
      await action()
      await loadRoom(false)
    } catch (actionError) {
      setError(roomErrorMessage(actionError))
    } finally {
      setBusyAction(null)
    }
  }

  const handleLeave = async () => {
    const confirmation = isQuickMatch
      ? 'Sair da partida rápida? O lobby será encerrado para os dois jogadores.'
      : 'Sair desta sala?'
    if (!room || !window.confirm(confirmation)) return
    setBusyAction('leave')
    try {
      await leaveRoom(room.id)
      navigate(ROUTES.MULTIPLAYER, {
        replace: true,
        state: { notice: isQuickMatch ? 'Você saiu da partida rápida.' : 'Você saiu da sala.' },
      })
    } catch (actionError) {
      setError(roomErrorMessage(actionError))
      setBusyAction(null)
    }
  }

  const handleCancel = async () => {
    if (!room || !window.confirm('Cancelar a sala para todos os jogadores?')) return
    setBusyAction('cancel')
    try {
      await cancelRoom(room.id)
      navigate(ROUTES.MULTIPLAYER, { replace: true, state: { notice: 'Sala cancelada.' } })
    } catch (actionError) {
      setError(roomErrorMessage(actionError))
      setBusyAction(null)
    }
  }

  const availableFriends = useMemo(
    () => friends.filter((friend) => !room?.members.some((member) => member.userId === friend.profile.id)),
    [friends, room?.members],
  )

  if (loading) {
    return <div className="page-container"><Card><p role="status">Preparando lobby seguro...</p></Card></div>
  }

  if (!room || !settings || !currentMember) {
    return (
      <div className="page-container">
        <Card className="text-center">
          <CardTitle>Não foi possível abrir esta sala</CardTitle>
          <CardDescription>{error || 'Confira o código ou peça um novo convite ao host.'}</CardDescription>
          <Button type="button" className="mt-5" onClick={() => navigate(ROUTES.MULTIPLAYER)}>Voltar ao Multiplayer</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container lobby-page">
      <header className="lobby-hero">
        <div>
          <span className="lobby-eyebrow">
            {isQuickMatch ? 'Partida rápida · 1v1' : 'Lobby online 1v1'}
          </span>
          <h1>{isQuickMatch ? 'Duelo encontrado' : `Sala ${room.code}`}</h1>
          <p>
            {isQuickMatch
              ? 'Sem host ou configurações: quando os dois estiverem prontos, a contagem começa automaticamente.'
              : 'O banco mantém o estado oficial; o canal privado atualiza os dois jogadores.'}
          </p>
        </div>
        <div className="lobby-connection">
          <span className={realtimeConnected ? 'is-online' : ''} aria-hidden="true" />
          {realtimeConnected ? 'Tempo real conectado' : 'Reconectando...'}
        </div>
      </header>

      {(error || feedback) && (
        <p className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-danger/25 bg-danger-muted text-danger' : 'border-success/25 bg-success-muted text-success'}`} role={error ? 'alert' : 'status'}>
          {error || feedback}
        </p>
      )}

      {(countdown !== null || arenaReady) && (
        <section className="lobby-countdown" aria-live="assertive">
          {countdown !== null ? (
            <><span>Sincronizando início</span><strong>{countdown}</strong></>
          ) : (
            <>
              <span>Countdown concluído</span>
              <strong className="lobby-countdown__ready">Arena pronta</strong>
              <p>O motor multiplayer chega na próxima etapa.</p>
              <Button type="button" onClick={() => navigate(battleMatchPath(room.id))}>Ver prévia da Arena</Button>
            </>
          )}
        </section>
      )}

      {opponentLeft ? (
        <Card variant="premium" className="quick-match-opponent-left text-center" aria-live="assertive">
          <Badge variant="warning">Partida encerrada</Badge>
          <CardTitle>O adversário saiu</CardTitle>
          <CardDescription>Este lobby foi encerrado para os dois jogadores.</CardDescription>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              onClick={() => navigate(ROUTES.MULTIPLAYER, {
                replace: true,
                state: {
                  notice: 'O adversário saiu. Iniciando uma nova busca.',
                  autoSearch: true,
                  quickPreferences: {
                    language: room.language,
                    difficulty: room.difficulty,
                  },
                },
              })}
            >
              Buscar novamente
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.MULTIPLAYER, { replace: true })}>
              Voltar ao Multiplayer
            </Button>
          </div>
        </Card>
      ) : (
      <div className="lobby-grid">
        <section className="space-y-6">
          <Card variant="premium">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Jogadores</CardTitle>
                  <CardDescription>{room.members.length}/2 vagas ocupadas</CardDescription>
                </div>
                <Badge variant={room.members.length === 2 ? 'online' : 'warning'}>{room.members.length}/2</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {room.members.map((member) => {
                const connected = connectedUserIds.has(member.userId)
                return (
                  <div key={member.userId} className={`lobby-player ${member.ready ? 'lobby-player--ready' : ''}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`lobby-player__avatar ${isQuickMatch ? 'lobby-player__avatar--quick' : ''}`}>
                        {isQuickMatch ? member.profile.displayName.slice(0, 1).toUpperCase() : <CrownIcon size={30} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="truncate">{member.profile.displayName}</strong>
                          {!isQuickMatch && member.role === 'host' && <Badge variant="gold">Host</Badge>}
                        </div>
                        <p>@{member.profile.username}</p>
                        <small className={connected ? 'text-success' : 'text-muted'}>{connected ? '● Conectado' : '○ Reconectando'}</small>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.ready ? 'online' : 'default'}>{member.ready ? 'Pronto' : 'Não pronto'}</Badge>
                      {isHost && member.userId !== user?.id && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={Boolean(busyAction)}
                          onClick={() => {
                            if (window.confirm(`Remover @${member.profile.username} da sala?`)) {
                              void runAction('kick', () => kickPlayer(room.id, member.userId))
                            }
                          }}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              {room.members.length < 2 && <div className="lobby-empty-slot">Aguardando segundo jogador...</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isQuickMatch ? 'Confirmação dos jogadores' : 'Controles da sala'}</CardTitle>
              {isQuickMatch && <CardDescription>A contagem de três segundos começa no segundo pronto.</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={currentMember.ready ? 'secondary' : 'primary'}
                disabled={Boolean(busyAction) || room.status === 'starting'}
                onClick={() => void runAction('ready', () => setReady(room.id, !currentMember.ready))}
              >
                {currentMember.ready ? 'Cancelar pronto' : 'Pronto'}
              </Button>
              {isHost && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canStart || Boolean(busyAction) || room.status === 'starting'}
                  onClick={() => void runAction('start', () => startCountdown(room.id))}
                >
                  Iniciar batalha
                </Button>
              )}
              {isHost && (
                <Button type="button" variant="ghost" onClick={() => setInvitePanelOpen((open) => !open)}>
                  Convidar amigo
                </Button>
              )}
            </CardContent>
          </Card>

          {isHost && invitePanelOpen && (
            <Card variant="premium">
              <CardHeader>
                <CardTitle>Amigos</CardTitle>
                <CardDescription>Você pode convidar amigos online ou offline.</CardDescription>
              </CardHeader>
              <CardContent>
                {availableFriends.length === 0 ? <p className="text-sm text-muted">Nenhum amigo disponível para convite.</p> : (
                  <div className="space-y-3">
                    {availableFriends.map((friend) => (
                      <div key={friend.friendshipId} className="lobby-friend-row">
                        <div>
                          <strong>{friend.profile.displayName}</strong>
                          <p>@{friend.profile.username} · {isUserOnline(friend.profile.id) ? '● Online' : '○ Offline'}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={Boolean(busyAction)}
                          onClick={() => void runAction(`invite:${friend.profile.id}`, async () => {
                            await sendRoomInvite(room.id, friend.profile.id)
                            setFeedback(`Convite enviado para @${friend.profile.username}.`)
                          })}
                        >
                          Convidar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-6">
          {isQuickMatch ? (
            <Card variant="premium">
              <CardHeader>
                <Badge variant="online" className="w-fit">Regras automáticas</Badge>
                <CardTitle>Partida rápida</CardTitle>
                <CardDescription>As regras foram fixadas pelo matchmaking e não podem ser alteradas.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="room-meta-row">
                  <span>{ROOM_LANGUAGE_LABELS[room.language]}</span>
                  <span>{ROOM_DIFFICULTY_LABELS[room.difficulty]}</span>
                  <span>{MATCH_FORMAT_LABELS[room.matchFormat]}</span>
                  <span>Sem espectadores</span>
                </div>
              </CardContent>
            </Card>
          ) : (
          <>
          <Card variant="premium">
            <CardHeader>
              <CardTitle>Configuração</CardTitle>
              <CardDescription>{isHost ? 'Alterações resetam o pronto dos jogadores.' : 'Somente o host pode alterar.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select label="Linguagem" value={settings.language} disabled={!isHost || room.status === 'starting'} options={Object.entries(ROOM_LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))} onChange={(event) => setSettings((current) => current && ({ ...current, language: event.target.value as RoomSettings['language'] }))} />
              <Select label="Dificuldade" value={settings.difficulty} disabled={!isHost || room.status === 'starting'} options={Object.entries(ROOM_DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))} onChange={(event) => setSettings((current) => current && ({ ...current, difficulty: event.target.value as RoomSettings['difficulty'] }))} />
              <Select label="Formato" value={settings.matchFormat} disabled={!isHost || room.status === 'starting'} options={Object.entries(MATCH_FORMAT_LABELS).map(([value, label]) => ({ value, label }))} onChange={(event) => setSettings((current) => current && ({ ...current, matchFormat: event.target.value as RoomSettings['matchFormat'] }))} />
              <Select label="Visibilidade" value={settings.visibility} disabled={!isHost || room.status === 'starting'} options={[{ value: 'public', label: 'Pública' }, { value: 'private', label: 'Privada' }]} onChange={(event) => setSettings((current) => current && ({ ...current, visibility: event.target.value as RoomSettings['visibility'] }))} />
              <label className="multiplayer-check-row">
                <input type="checkbox" checked={settings.allowSpectators} disabled={!isHost || room.status === 'starting'} onChange={(event) => setSettings((current) => current && ({ ...current, allowSpectators: event.target.checked }))} />
                Espectadores permitidos
              </label>
              {isHost && (
                <Button type="button" variant="secondary" fullWidth disabled={Boolean(busyAction) || room.status === 'starting'} onClick={() => void runAction('settings', () => updateRoomSettings(room.id, settings))}>
                  Salvar configuração
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Código da sala</CardTitle><CardDescription>Compartilhe com quem vai entrar.</CardDescription></CardHeader>
            <CardContent>
              <div className="lobby-room-code">{room.code}</div>
              <Button type="button" variant="secondary" fullWidth className="mt-3" onClick={() => void navigator.clipboard.writeText(room.code).then(() => setFeedback('Código copiado.')).catch(() => setError('Não foi possível copiar o código.'))}>Copiar código</Button>
            </CardContent>
          </Card>
          </>
          )}

          <div className="grid gap-2">
            <Button type="button" variant="secondary" fullWidth disabled={Boolean(busyAction)} onClick={() => void handleLeave()}>{isQuickMatch ? 'Sair da partida' : 'Sair da sala'}</Button>
            {isHost && <Button type="button" variant="ghost" fullWidth disabled={Boolean(busyAction)} onClick={() => void handleCancel()}>Cancelar sala</Button>}
          </div>
        </aside>
      </div>
      )}
    </div>
  )
}
