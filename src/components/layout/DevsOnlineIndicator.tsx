import { cn } from '@/utils'

interface DevsOnlineIndicatorProps {
  className?: string
  compact?: boolean
}

export function DevsOnlineIndicator({ className, compact = false }: DevsOnlineIndicatorProps) {
  // Status estático até existir presença real via backend/realtime.
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border bg-background-elevated/80',
        compact ? 'px-2.5 py-1' : 'px-3 py-1.5',
        className,
      )}
      role="status"
      aria-label="Arena Online"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="relative inline-flex h-2 w-2 rounded-full bg-online shadow-[0_0_10px_rgba(34,197,94,0.34)]" />
      </span>
      <span className={cn('font-medium text-muted', compact ? 'text-[11px]' : 'text-xs')}>
        <span className="text-foreground">Arena</span>
        <span> Online</span>
      </span>
    </div>
  )
}
