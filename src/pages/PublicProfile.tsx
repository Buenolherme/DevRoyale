import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout'
import { Avatar, Badge, Button, PageState, getButtonClassName } from '@/components/ui'
import { SocialActions } from '@/components/social/SocialActions'
import { useAuth, usePresence } from '@/hooks'
import { getPublicProfileByUsername, ProfileServiceError } from '@/lib/profile-service'
import { getSocialRelationship, inviteFriendToBattle, SocialServiceError, subscribeToSocialChanges } from '@/lib/social-service'
import { RoomServiceError } from '@/lib/room-service'
import { ROUTES, publicProfilePath, roomPath } from '@/routes/paths'
import type { PublicProfile } from '@/types/profile'
import type { SocialRelationshipState } from '@/types/social'
import '@/styles/pages/social.css'

function PublicProfileContent({ username }: { username: string }) {
  const { user, isLoading: authLoading } = useAuth()
  const { connected, isUserOnline } = usePresence()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [socialError, setSocialError] = useState('')
  const [notice, setNotice] = useState('')
  const [relationship, setRelationship] = useState<{ relationshipId: string | null; socialState: SocialRelationshipState } | null>(null)
  const [busy, setBusy] = useState(false)
  const activeRef = useRef(true)
  const actionRef = useRef(false)
  const relationVersion = useRef(0)
  const isSelf = profile?.id === user?.id
  const profileId = profile?.id
  const userId = user?.id

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try { const result = await getPublicProfileByUsername(username); if (activeRef.current) setProfile(result) }
    catch (cause) { if (activeRef.current) setError(cause instanceof ProfileServiceError ? cause.message : 'Não foi possível carregar este perfil.') }
    finally { if (activeRef.current) setLoading(false) }
  }, [username])

  useEffect(() => {
    activeRef.current = true
    const timer = window.setTimeout(() => void loadProfile(), 0)
    return () => { activeRef.current = false; window.clearTimeout(timer) }
  }, [loadProfile])

  const loadRelationship = useCallback(async () => {
    if (!profileId || !userId || profileId === userId) return
    const version = ++relationVersion.current
    try {
      const result = await getSocialRelationship(profileId)
      if (!activeRef.current || version !== relationVersion.current) return
      setRelationship(result)
      setSocialError('')
    } catch {
      if (activeRef.current && version === relationVersion.current) {
        setRelationship(null)
        setSocialError('Não foi possível consultar sua amizade agora. Tente novamente.')
      }
    }
  }, [profileId, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRelationship(), 0)
    const refresh = () => { if (!actionRef.current) void loadRelationship() }
    const unsubscribe = subscribeToSocialChanges(refresh)
    window.addEventListener('focus', refresh)
    return () => { window.clearTimeout(timer); unsubscribe(); window.removeEventListener('focus', refresh) }
  }, [loadRelationship])

  const runAction = async (action: () => Promise<void>, message: string) => {
    if (actionRef.current) return
    actionRef.current = true
    setBusy(true)
    setSocialError('')
    setNotice('')
    try {
      await action()
      if (!activeRef.current) return
      await loadRelationship()
      setNotice(message)
    } catch (cause) {
      if (activeRef.current) setSocialError(cause instanceof SocialServiceError || cause instanceof RoomServiceError ? cause.message : 'Não foi possível concluir esta ação. Tente novamente.')
    } finally {
      actionRef.current = false
      if (activeRef.current) setBusy(false)
    }
  }
  const invite = () => {
    if (!profile) return
    void runAction(async () => {
      const room = await inviteFriendToBattle(profile.id)
      if (activeRef.current) navigate(roomPath(room.code), { state: { notice: `Convite enviado para @${profile.username}.` } })
    }, 'Convite enviado.')
  }

  if (loading || authLoading) return <div className="page-container social-page"><PageState loading title="Carregando perfil..." description="Preparando a identidade pública deste dev." /></div>
  if (error || !profile) return <div className="page-container social-page"><PageState title={error ? 'Perfil indisponível' : 'Usuário não encontrado'} description={error || 'Confira o username. Este perfil pode ter mudado de endereço.'}>
    {error && <Button onClick={() => void loadProfile()}>Tentar novamente</Button>}
    <Link to={user ? ROUTES.AMIGOS : ROUTES.HOME} className={getButtonClassName({ variant: 'secondary' })}>{user ? 'Buscar amigos' : 'Voltar para Home'}</Link>
  </PageState></div>

  const labels: Record<SocialRelationshipState, string> = { none: 'Ainda não são amigos', friend: 'Vocês são amigos', pending_sent: 'Solicitação enviada', pending_received: 'Solicitação recebida', blocked: 'Usuário bloqueado' }
  return (
    <div className="page-container social-page">
      <PageHeader title="Perfil público" description="Conheça os devs que compartilham a Arena." />
      <section className="public-profile-card">
        <Avatar name={profile.displayName} src={profile.avatarUrl} className="public-profile-avatar" />
        <div className="public-profile-identity">
          <h2>{profile.displayName}</h2>
          <p className="public-profile-username">@{profile.username}</p>
          <p className="social-presence">{connected ? isUserOnline(profile.id) ? '● Online agora' : '○ Offline' : 'Presença indisponível'}</p>
          <p className="public-profile-bio">{profile.bio || 'Este dev ainda não adicionou uma bio.'}</p>
          {isSelf ? <Link to={ROUTES.PERFIL} className={getButtonClassName({ variant: 'secondary' })}>Editar meu perfil</Link>
            : !user ? <Link to={ROUTES.LOGIN} state={{ from: publicProfilePath(profile.username) }} className={getButtonClassName()}>Entrar para adicionar amigo</Link>
              : relationship ? <>
                <Badge variant={relationship.socialState === 'friend' ? 'success' : 'default'}>{labels[relationship.socialState]}</Badge>
                <SocialActions profile={{ ...profile, ...relationship }} busy={busy} onAction={(action, message) => void runAction(action, message)} onInvite={invite} />
              </> : !socialError && <p role="status">Consultando amizade...</p>}
          {busy && <p role="status" className="social-presence">Concluindo ação...</p>}
          {notice && <p role="status" className="social-feedback">{notice}</p>}
          {socialError && <div role="alert" className="social-error"><p>{socialError}</p><Button variant="secondary" size="sm" disabled={busy} onClick={() => void loadRelationship()}>Atualizar amizade</Button></div>}
        </div>
      </section>
    </div>
  )
}
export function PublicProfilePage() {
  const { username = '' } = useParams()
  const { user } = useAuth()
  return <PublicProfileContent key={`${username}:${user?.id ?? 'guest'}`} username={username} />
}
