import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'primary'
  | 'gold'
  | 'online'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-background-elevated text-foreground border-border',
  success: 'bg-success-muted text-success border-success/25',
  warning: 'bg-warning-muted text-warning border-warning/25',
  danger: 'bg-danger-muted text-danger border-danger/25',
  primary: 'bg-primary-muted text-primary border-primary/30',
  gold: 'bg-secondary-muted text-secondary border-secondary/35',
  online: 'bg-success-muted text-success border-success/25',
}

export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
