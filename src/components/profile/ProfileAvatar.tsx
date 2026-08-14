import { CrownIcon } from '@/components/layout'
import type { UserProfilePreferences } from '@/utils'

interface ProfileAvatarProps {
  preferences: UserProfilePreferences
  name: string
  avatarUrl?: string | null
}

export function ProfileAvatar({ preferences, name, avatarUrl }: ProfileAvatarProps) {
  const visibleAvatar = preferences.avatarDataUrl ?? avatarUrl

  return (
    <div className="profile-avatar" aria-label={`Avatar de ${name}`}>
      {visibleAvatar ? (
        <img src={visibleAvatar} alt={`Foto de perfil de ${name}`} />
      ) : (
        <CrownIcon size={54} className="profile-avatar__crown" />
      )}
    </div>
  )
}
