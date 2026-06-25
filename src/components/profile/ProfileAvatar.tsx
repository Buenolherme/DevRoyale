import { CrownIcon } from '@/components/layout'
import type { UserProfilePreferences } from '@/utils'

interface ProfileAvatarProps {
  preferences: UserProfilePreferences
  name: string
}

export function ProfileAvatar({ preferences, name }: ProfileAvatarProps) {
  return (
    <div className="profile-avatar" aria-label={`Avatar de ${name}`}>
      {preferences.avatarDataUrl ? (
        <img src={preferences.avatarDataUrl} alt={`Foto de perfil de ${name}`} />
      ) : (
        <CrownIcon size={54} className="profile-avatar__crown" />
      )}
    </div>
  )
}
