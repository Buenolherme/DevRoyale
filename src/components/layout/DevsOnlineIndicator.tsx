import { usePresence } from '@/hooks'
import { cn } from '@/utils'

interface DevsOnlineIndicatorProps {
  className?: string
  compact?: boolean
}

export function DevsOnlineIndicator({ className, compact = false }: DevsOnlineIndicatorProps) {
  const { connected, onlineUsers } = usePresence()
  const onlineLabel = `${onlineUsers.length} ${onlineUsers.length === 1 ? 'dev online' : 'devs online'}`

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border bg-background-elevated/80',
        compact ? 'px-2.5 py-1' : 'px-3 py-1.5',
        className,
      )}
      role="status"
      aria-label={connected ? onlineLabel : 'Presença indisponível'}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            connected
              ? 'bg-online shadow-[0_0_10px_rgba(34,197,94,0.34)]'
              : 'bg-muted',
          )}
        />
      </span>
      <span className={cn('font-medium text-muted', compact ? 'text-[11px]' : 'text-xs')}>
        <span className="text-foreground">{connected ? onlineUsers.length : 'Arena'}</span>
        <span>{connected ? ` ${onlineUsers.length === 1 ? 'dev online' : 'devs online'}` : ''}</span>
      </span>
    </div>
  )
}
