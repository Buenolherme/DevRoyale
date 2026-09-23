import { useState } from 'react'
import { cn } from '@/utils/cn'

interface AvatarProps {
  name: string
  src?: string | null
  className?: string
}

export function Avatar({ name, src, className }: AvatarProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const safeSource = src && /^https?:\/\//i.test(src) ? src : null
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'

  return (
    <span className={cn('user-avatar', className)} role="img" aria-label={`Avatar de ${name}`}>
      {safeSource && failedSource !== safeSource ? (
        <img src={safeSource} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(safeSource)} />
      ) : <span aria-hidden="true">{initials}</span>}
    </span>
  )
}
