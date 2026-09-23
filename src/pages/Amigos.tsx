import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout'
import { Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, PageState } from '@/components/ui'
import { SocialActions } from '@/components/social/SocialActions'
import { useAuth, usePresence } from '@/hooks'
import { RoomServiceError } from '@/lib/room-service'
import {
  getSocialOverview, inviteFriendToBattle, normalizeSocialSearch, searchProfiles,
  SocialServiceError, subscribeToSocialChanges,
} from '@/lib/social-service'
import { publicProfilePath, roomPath } from '@/routes/paths'
import type { SocialOverview, SocialSearchResult } from '@/types/social'
import '@/styles/pages/social.css'

const emptyOverview: SocialOverview = { friends: [], incomingRequests: [], outgoingRequests: [], blockedProfiles: [] }
type Tab = 'friends' | 'online' | 'incoming' | 'outgoing' | 'blocked'
const tabs: { key: Tab; label: string; empty: string; description: string }[] = [
  { key: 'friends', label: 'Todos os amigos', empty: 'Sua equipe começa aqui', description: 'Busque pelo username de outro dev e envie sua primeira solicitação.' },
  { key: 'online', label: 'Online', empty: 'Nenhum amigo online agora', description: 'Você ainda pode enviar convites aos seus amigos. Eles os verão quando voltarem.' },
  { key: 'incoming', label: 'Recebidas', empty: 'Tudo em dia por aqui', description: 'Novas solicitações de amizade aparecerão nesta aba.' },
  { key: 'outgoing', label: 'Enviadas', empty: 'Nenhuma solicitação enviada', description: 'Encontre um dev pela busca e convide-o para sua lista de amigos.' },
  { key: 'blocked', label: 'Bloqueados', empty: 'Nenhum usuário bloqueado', description: 'Você pode gerenciar e desfazer bloqueios por aqui.' },
]

function socialErrorMessage(error: unknown): string {
  return error instanceof SocialServiceError || error instanceof RoomServiceError
    ? error.message : 'Não foi possível atualizar seus amigos. Tente novamente.'
}

function FriendsContent() {
  const navigate = useNavigate()
  const { connected, isUserOnline } = usePresence()
  const [overview, setOverview] = useState<SocialOverview>(emptyOverview)
  const [tab, setTab] = useState<Tab>('friends')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SocialSearchResult[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [searchError, setSearchError] = useState('')
  const [searchRevision, setSearchRevision] = useState(0)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const busyRef = useRef(false)
  const overviewPromise = useRef<Promise<void> | null>(null)
  const query = normalizeSocialSearch(searchQuery)

  const loadOverview = useCallback((): Promise<void> => {
    if (overviewPromise.current) return overviewPromise.current
    setRefreshing(true)
    const request = (async () => {
      try {
        const next = await getSocialOverview()
        if (!mountedRef.current) return
        setOverview(next)
        setError('')
      } catch (cause) { if (mountedRef.current) setError(socialErrorMessage(cause)) }
      finally { if (mountedRef.current) { setLoading(false); setRefreshing(false) } }
    })()
    overviewPromise.current = request
    void request.finally(() => { if (overviewPromise.current === request) overviewPromise.current = null })
    return request
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const refresh = () => { if (!busyRef.current && document.visibilityState === 'visible') void loadOverview() }
    const initial = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, 30_000)
    const unsubscribe = subscribeToSocialChanges(refresh)
    window.addEventListener('focus', refresh)
    return () => {
      mountedRef.current = false
      window.clearTimeout(initial)
      window.clearInterval(timer)
      unsubscribe()
      window.removeEventListener('focus', refresh)
    }
  }, [loadOverview])

  useEffect(() => {
    if (query.length < 2) return
    let active = true
    const timer = window.setTimeout(() => {
      setSearchStatus('loading')
      void searchProfiles(query).then((results) => {
        if (active) { setSearchResults(results); setSearchStatus('success'); setSearchError('') }
      }).catch((cause: unknown) => {
        if (active) { setSearchResults([]); setSearchStatus('error'); setSearchError(socialErrorMessage(cause)) }
      })
    }, 350)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, searchRevision])

  const runAction = async (profile: SocialSearchResult, action: () => Promise<void>, message: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusyUserId(profile.id)
    setError('')
    setFeedback('')
    try {
      await action()
      if (!mountedRef.current) return
      await overviewPromise.current
      await loadOverview()
      if (!mountedRef.current) return
      setSearchRevision((current) => current + 1)
      setFeedback(message)
    } catch (cause) { if (mountedRef.current) setError(socialErrorMessage(cause)) }
    finally { busyRef.current = false; if (mountedRef.current) setBusyUserId(null) }
  }

  const rowsByTab = useMemo(() => {
    const friends: SocialSearchResult[] = [...overview.friends].sort((a, b) => {
      const online = Number(connected && isUserOnline(b.profile.id)) - Number(connected && isUserOnline(a.profile.id))
      return online || a.profile.username.localeCompare(b.profile.username)
    }).map((friend) => ({ ...friend.profile, relationshipId: friend.friendshipId, socialState: 'friend' }))
    return {
      friends,
      online: connected ? friends.filter((friend) => isUserOnline(friend.id)) : [],
      incoming: overview.incomingRequests.map((request): SocialSearchResult => ({ ...request.profile, relationshipId: request.friendshipId, socialState: 'pending_received' })),
      outgoing: overview.outgoingRequests.map((request): SocialSearchResult => ({ ...request.profile, relationshipId: request.friendshipId, socialState: 'pending_sent' })),
      blocked: overview.blockedProfiles.map((profile): SocialSearchResult => ({ ...profile, relationshipId: null, socialState: 'blocked' })),
    }
  }, [connected, isUserOnline, overview])
  const selected = tabs.find((item) => item.key === tab)!
  const searching = query.length >= 2
  const rows = searching ? searchResults : rowsByTab[tab]

  return (
    <div className="page-container social-page">
      <PageHeader title="Amigos" description="Encontre sua equipe, acompanhe solicitações e convide alguém para a Arena.">
        {overview.incomingRequests.length > 0 && <Badge variant="danger">{overview.incomingRequests.length} {overview.incomingRequests.length === 1 ? 'solicitação' : 'solicitações'}</Badge>}
      </PageHeader>
      {error && <div className="social-error" role="alert"><p>{error}</p><Button size="sm" variant="secondary" disabled={refreshing || Boolean(busyUserId)} onClick={() => void loadOverview()}>Tentar novamente</Button></div>}
      {feedback && <p className="social-feedback" role="status">{feedback}</p>}
      {busyUserId && <p className="mb-4 text-sm text-muted" role="status">Concluindo ação...</p>}
      <Card variant="premium" className="mb-6">
        <CardHeader><CardTitle>Buscar jogador</CardTitle><CardDescription>Digite pelo menos dois caracteres do username, com ou sem @.</CardDescription></CardHeader>
        <CardContent>
          <Input label="Buscar por username" type="search" placeholder="@username" value={searchQuery} maxLength={25} autoComplete="off" spellCheck={false} onChange={(event) => {
            setSearchQuery(event.target.value); setSearchResults([]); setSearchError('')
            setSearchStatus(normalizeSocialSearch(event.target.value).length >= 2 ? 'loading' : 'idle')
          }} />
        </CardContent>
      </Card>
      <div className="social-toolbar">
        <div><h2 className="text-xl font-bold">{searching ? 'Resultados da busca' : 'Sua comunidade'}</h2><p className="text-sm text-muted">{connected ? 'Presença atualizada em tempo real' : 'Presença indisponível. Suas amizades continuam acessíveis.'}</p></div>
        <Button variant="secondary" size="sm" disabled={refreshing || Boolean(busyUserId)} onClick={() => { void loadOverview(); if (searching) setSearchRevision((current) => current + 1) }}>{refreshing ? 'Atualizando...' : 'Atualizar'}</Button>
      </div>
      {!searching && <div className="social-tabs" role="group" aria-label="Filtrar amizades">{tabs.map((item) => <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>{item.label} <span>({rowsByTab[item.key].length})</span></button>)}</div>}
      {loading || (searching && searchStatus === 'loading') ? <PageState loading title={searching ? 'Buscando jogadores...' : 'Carregando sua comunidade...'} description="Preparando suas conexões na Arena." />
        : searching && searchError ? <PageState title="Busca indisponível" description={searchError}><Button variant="secondary" onClick={() => setSearchRevision((current) => current + 1)}>Tentar novamente</Button></PageState>
          : !rows.length ? <PageState title={searching ? 'Nenhum jogador encontrado' : tab === 'online' && !connected ? 'Aguardando conexão de presença' : error ? 'Sua comunidade está indisponível' : selected.empty} description={searching ? 'Confira o username ou tente um início de nome diferente.' : tab === 'online' && !connected ? 'Não é possível confirmar quem está online agora.' : error ? 'Tente atualizar novamente em alguns segundos.' : selected.description} />
            : <div className="social-list">{rows.map((profile) => <article className="social-row" key={profile.id}>
              <Link to={publicProfilePath(profile.username)} className="social-identity">
                <Avatar name={profile.displayName} src={profile.avatarUrl} />
                <div><strong>{profile.displayName}</strong><small>@{profile.username}</small><p className="social-presence">{connected ? isUserOnline(profile.id) ? '● Online' : '○ Offline' : 'Presença indisponível'}</p></div>
              </Link>
              <SocialActions profile={profile} busy={Boolean(busyUserId)} onAction={(action, message) => void runAction(profile, action, message)} onInvite={() => void runAction(profile, async () => {
                const room = await inviteFriendToBattle(profile.id)
                if (mountedRef.current) navigate(roomPath(room.code), { state: { notice: `Convite enviado para @${profile.username}.` } })
              }, 'Convite enviado.')} />
            </article>)}</div>}
    </div>
  )
}
export function AmigosPage() {
  const { user } = useAuth()
  return <FriendsContent key={user?.id ?? 'guest'} />
}
