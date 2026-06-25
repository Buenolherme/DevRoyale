import { cn } from '@/utils'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  className,
  size = 'md',
}: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1
  const safeValue = Number.isFinite(value) ? value : 0
  const clampedValue = Math.min(Math.max(safeValue, 0), safeMax)
  const percentage = (clampedValue / safeMax) * 100

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-muted">{label}</span>}
          {showValue && (
            <span className="font-bold text-secondary">
              {safeValue}/{safeMax}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full border border-border bg-background',
          size === 'sm' ? 'h-2' : 'h-3',
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label ?? 'Progresso'}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
