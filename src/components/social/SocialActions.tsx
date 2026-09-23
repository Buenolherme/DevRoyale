import { Button } from '@/components/ui'
import {
  acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, sendFriendRequest,
  removeFriend, blockUser, unblockUser,
} from '@/lib/social-service'
import type { SocialSearchResult } from '@/types/social'

interface SocialActionsProps {
  profile: SocialSearchResult
  busy: boolean
  onAction: (action: () => Promise<void>, message: string) => void
  onInvite?: () => void
}

export function SocialActions({ profile, busy, onAction, onInvite }: SocialActionsProps) {
  const id = profile.relationshipId
  return (
    <div className="social-actions">
      {profile.socialState === 'none' && <Button size="sm" disabled={busy} onClick={() => onAction(() => sendFriendRequest(profile.id), 'Solicitação enviada.')} >Adicionar amigo</Button>}
      {profile.socialState === 'pending_received' && id && <>
        <Button size="sm" disabled={busy} onClick={() => onAction(() => acceptFriendRequest(id), 'Solicitação aceita. Vocês agora são amigos!')}>Aceitar solicitação</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(() => rejectFriendRequest(id), 'Solicitação recusada.')}>Recusar</Button>
      </>}
      {profile.socialState === 'pending_sent' && id && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(() => cancelFriendRequest(id), 'Solicitação cancelada.')}>Cancelar solicitação</Button>}
      {profile.socialState === 'friend' && id && <>
        {onInvite && <Button size="sm" disabled={busy} onClick={onInvite}>Convidar para batalha</Button>}
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => {
          if (window.confirm(`Remover @${profile.username} da sua lista de amigos?`)) onAction(() => removeFriend(id), 'Amizade removida.')
        }}>Remover amigo</Button>
      </>}
      {profile.socialState === 'blocked'
        ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(() => unblockUser(profile.id), 'Usuário desbloqueado.')}>Desbloquear</Button>
        : <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
          if (window.confirm(`Bloquear @${profile.username}? A amizade e os pedidos serão removidos.`)) onAction(() => blockUser(profile.id), 'Usuário bloqueado.')
        }}>Bloquear</Button>}
    </div>
  )
}
