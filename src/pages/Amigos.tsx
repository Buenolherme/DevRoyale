import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CrownIcon, PageHeader } from '@/components/layout'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui'
import { usePresence } from '@/hooks'
import {
  SocialServiceError,
  acceptFriendRequest,
  blockUser,
  getFriends,
  getIncomingRequests,
  normalizeSocialSearch,
  rejectFriendRequest,
  removeFriend,
  searchProfiles,
  sendFriendRequest,
  unblockUser,
} from '@/lib/social-service'
import type {
  Friend,
  FriendRequest,
  SocialProfile,
  SocialSearchResult,
} from '@/types/social'

type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

function SocialAvatar({ profile }: { profile: SocialProfile }) {
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary/25 bg-secondary-muted"
      aria-hidden="true"
    >
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <CrownIcon size={30} />
      )}
    </div>
  )
}

function SocialIdentity({
  profile,
  online,
  showPresence = false,
}: {
  profile: SocialProfile
  online?: boolean
  showPresence?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <SocialAvatar profile={profile} />
      <div className="min-w-0">
        <p className="truncate font-bold text-foreground">{profile.displayName}</p>
        <p className="truncate text-sm font-semibold text-secondary">@{profile.username}</p>
        {showPresence && (
          <p
            className={`mt-1 text-xs font-semibold ${online ? 'text-success' : 'text-muted'}`}
            aria-label={online ? 'Online' : 'Offline'}
          >
            <span aria-hidden="true">{online ? '●' : '○'}</span>{' '}
            {online ? 'Online' : 'Offline'}
          </p>
        )}
      </div>
    </div>
  )
}

function socialErrorMessage(error: unknown): string {
  return error instanceof SocialServiceError
    ? error.message
    : 'Não foi possível atualizar seus amigos. Tente novamente.'
}

export function AmigosPage() {
  const { isUserOnline } = usePresence()
  const [friends, setFriends] = useState<Friend[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [feedback, setFeedback] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SocialSearchResult[]>([])
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle')
  const [searchError, setSearchError] = useState('')
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const searchRequestId = useRef(0)

  const loadOverview = useCallback(async (showLoading = true) => {
    if (showLoading) setOverviewLoading(true)
    setOverviewError('')

    try {
      const [nextFriends, nextIncomingRequests] = await Promise.all([
        getFriends(),
        getIncomingRequests(),
      ])
      setFriends(nextFriends)
      setIncomingRequests(nextIncomingRequests)
    } catch (error) {
      setOverviewError(socialErrorMessage(error))
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const refreshSearch = useCallback(async () => {
    const normalizedQuery = normalizeSocialSearch(searchQuery)
    if (normalizedQuery.length < 2) return

    const requestId = ++searchRequestId.current
    setSearchStatus('loading')
    setSearchError('')

    try {
      const results = await searchProfiles(normalizedQuery)
      if (requestId !== searchRequestId.current) return
      setSearchResults(results)
      setSearchStatus('success')
    } catch (error) {
      if (requestId !== searchRequestId.current) return
      setSearchResults([])
      setSearchError(socialErrorMessage(error))
      setSearchStatus('error')
    }
  }, [searchQuery])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOverview()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadOverview])

  useEffect(() => {
    const normalizedQuery = normalizeSocialSearch(searchQuery)
    if (normalizedQuery.length < 2) return
    const requestId = searchRequestId.current

    const timeoutId = window.setTimeout(() => {
      void searchProfiles(normalizedQuery)
        .then((results) => {
          if (requestId !== searchRequestId.current) return
          setSearchResults(results)
          setSearchStatus('success')
        })
        .catch((error: unknown) => {
          if (requestId !== searchRequestId.current) return
          setSearchResults([])
          setSearchError(socialErrorMessage(error))
          setSearchStatus('error')
        })
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    searchRequestId.current += 1
    setSearchResults([])
    setSearchError('')

    if (normalizeSocialSearch(value).length < 2) {
      setSearchStatus('idle')
    } else {
      setSearchStatus('loading')
    }
  }

  const runAction = async (
    profile: SocialProfile,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    if (busyUserId) return

    setBusyUserId(profile.id)
    setOverviewError('')
    setSearchError('')
    setFeedback('')

    try {
      await action()
      await Promise.all([loadOverview(false), refreshSearch()])
      setFeedback(successMessage)
    } catch (error) {
      setOverviewError(socialErrorMessage(error))
    } finally {
      setBusyUserId(null)
    }
  }

  const sortedFriends = useMemo(
    () =>
      [...friends].sort((first, second) => {
        const firstOnline = isUserOnline(first.profile.id)
        const secondOnline = isUserOnline(second.profile.id)
        if (firstOnline !== secondOnline) return firstOnline ? -1 : 1

        return (
          first.profile.username.localeCompare(second.profile.username) ||
          first.profile.displayName.localeCompare(second.profile.displayName)
        )
      }),
    [friends, isUserOnline],
  )
  const onlineFriends = sortedFriends.filter((friend) => isUserOnline(friend.profile.id))

  const renderSearchActions = (result: SocialSearchResult) => {
    const disabled = busyUserId === result.id

    if (result.socialState === 'blocked') {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="danger" className="normal-case tracking-normal">Bloqueado</Badge>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() =>
              void runAction(
                result,
                () => unblockUser(result.id),
                `@${result.username} foi desbloqueado.`,
              )
            }
          >
            Desbloquear
          </Button>
        </div>
      )
    }

    if (result.socialState === 'pending_received' && result.relationshipId) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() =>
              void runAction(
                result,
                () => acceptFriendRequest(result.relationshipId!),
                `Você e @${result.username} agora são amigos.`,
              )
            }
          >
            Aceitar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() =>
              void runAction(
                result,
                () => rejectFriendRequest(result.relationshipId!),
                'Solicitação recusada.',
              )
            }
          >
            Recusar
          </Button>
        </div>
      )
    }

    if (result.socialState === 'pending_sent') {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="warning" className="normal-case tracking-normal">
            Solicitação enviada
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() =>
              void runAction(
                result,
                () => blockUser(result.id),
                `@${result.username} foi bloqueado.`,
              )
            }
          >
            Bloquear
          </Button>
        </div>
      )
    }

    if (result.socialState === 'friend') {
      return <Badge variant="gold" className="normal-case tracking-normal">Amigo</Badge>
    }

    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() =>
            void runAction(
              result,
              () => sendFriendRequest(result.id),
              `Solicitação enviada para @${result.username}.`,
            )
          }
        >
          {disabled ? 'Enviando...' : 'Adicionar amigo'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() =>
            void runAction(
              result,
              () => blockUser(result.id),
              `@${result.username} foi bloqueado.`,
            )
          }
        >
          Bloquear
        </Button>
      </div>
    )
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Amigos"
        description="Encontre outros devs, gerencie solicitações e acompanhe quem está online."
      >
        {incomingRequests.length > 0 && (
          <Badge variant="danger" className="normal-case tracking-normal">
            {incomingRequests.length}{' '}
            {incomingRequests.length === 1 ? 'solicitação' : 'solicitações'}
          </Badge>
        )}
      </PageHeader>

      {feedback && (
        <p
          className="mb-6 rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm font-semibold text-success"
          role="status"
        >
          {feedback}
        </p>
      )}
      {overviewError && (
        <p
          className="mb-6 rounded-xl border border-danger/25 bg-danger-muted px-4 py-3 text-sm font-semibold text-danger"
          role="alert"
        >
          {overviewError}
        </p>
      )}

      <Card variant="premium" className="mb-6">
        <CardHeader>
          <CardTitle>Buscar jogador</CardTitle>
          <CardDescription>
            Digite pelo menos dois caracteres do username. Você pode usar ou omitir o @.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            id="friend-search"
            label="Username"
            type="search"
            placeholder="@buenolherme"
            value={searchQuery}
            maxLength={25}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => handleSearchChange(event.target.value)}
          />

          <div className="mt-5" aria-live="polite">
            {searchStatus === 'loading' && (
              <p className="text-sm font-semibold text-muted" role="status">
                Buscando jogadores...
              </p>
            )}
            {searchStatus === 'error' && (
              <p className="text-sm font-semibold text-danger" role="alert">
                {searchError}
              </p>
            )}
            {searchStatus === 'success' && searchResults.length === 0 && (
              <p className="text-sm text-muted">Nenhum jogador encontrado.</p>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <SocialIdentity
                      profile={result}
                      online={isUserOnline(result.id)}
                      showPresence
                    />
                    {renderSearchActions(result)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card variant="premium" className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Solicitações recebidas</CardTitle>
              <CardDescription>Pedidos aguardando sua decisão.</CardDescription>
            </div>
            <Badge variant={incomingRequests.length ? 'danger' : 'default'}>
              {incomingRequests.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <p className="text-sm text-muted" role="status">Carregando solicitações...</p>
          ) : incomingRequests.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((request) => {
                const disabled = busyUserId === request.profile.id
                return (
                  <div
                    key={request.friendshipId}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <SocialIdentity
                      profile={request.profile}
                      online={isUserOnline(request.profile.id)}
                      showPresence
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                          void runAction(
                            request.profile,
                            () => acceptFriendRequest(request.friendshipId),
                            `Você e @${request.profile.username} agora são amigos.`,
                          )
                        }
                      >
                        Aceitar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                          void runAction(
                            request.profile,
                            () => rejectFriendRequest(request.friendshipId),
                            'Solicitação recusada.',
                          )
                        }
                      >
                        Recusar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                          void runAction(
                            request.profile,
                            () => blockUser(request.profile.id),
                            `@${request.profile.username} foi bloqueado.`,
                          )
                        }
                      >
                        Bloquear
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card variant="premium">
          <CardHeader>
            <CardTitle>Amigos online</CardTitle>
            <CardDescription>Disponíveis agora no DevRoyale.</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <p className="text-sm text-muted" role="status">Carregando amigos...</p>
            ) : onlineFriends.length === 0 ? (
              <p className="text-sm text-muted">Nenhum amigo online neste momento.</p>
            ) : (
              <div className="space-y-3">
                {onlineFriends.map((friend) => (
                  <div
                    key={friend.friendshipId}
                    className="rounded-xl border border-success/20 bg-success-muted/40 p-4"
                  >
                    <SocialIdentity profile={friend.profile} online showPresence />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader>
            <CardTitle>Todos os amigos</CardTitle>
            <CardDescription>Online primeiro, depois em ordem de username.</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <p className="text-sm text-muted" role="status">Carregando amigos...</p>
            ) : sortedFriends.length === 0 ? (
              <p className="text-sm text-muted">
                Sua lista ainda está vazia. Busque um jogador para começar.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedFriends.map((friend) => {
                  const disabled = busyUserId === friend.profile.id
                  return (
                    <div
                      key={friend.friendshipId}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <SocialIdentity
                        profile={friend.profile}
                        online={isUserOnline(friend.profile.id)}
                        showPresence
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            void runAction(
                              friend.profile,
                              () => removeFriend(friend.friendshipId),
                              `@${friend.profile.username} foi removido da sua lista.`,
                            )
                          }
                        >
                          Remover
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            void runAction(
                              friend.profile,
                              () => blockUser(friend.profile.id),
                              `@${friend.profile.username} foi bloqueado.`,
                            )
                          }
                        >
                          Bloquear
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!overviewLoading &&
        friends.length === 0 &&
        incomingRequests.length === 0 &&
        !searchQuery && (
          <Card className="text-center">
            <CardTitle>Construa sua rede na arena</CardTitle>
            <CardDescription>
              Procure pelo username de outro jogador para enviar a primeira solicitação.
            </CardDescription>
          </Card>
        )}
    </div>
  )
}
