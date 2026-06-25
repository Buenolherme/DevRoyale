import { cn } from '@/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonClassNameOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white border border-primary-hover/30 shadow-[var(--shadow-glow-primary)] hover:bg-primary-hover hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98]',
  secondary:
    'bg-background-elevated text-foreground border border-border hover:border-secondary/40 hover:bg-secondary-muted active:scale-[0.98]',
  ghost:
    'bg-transparent text-foreground border border-transparent hover:bg-background-elevated hover:border-border active:scale-[0.98]',
  danger:
    'bg-danger text-white border border-danger/30 hover:opacity-90 active:scale-[0.98]',
  gold:
    'bg-secondary text-[#151515] border border-secondary-light/50 shadow-[var(--shadow-glow-gold)] hover:brightness-105 hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
}

export function getButtonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonClassNameOptions = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 font-semibold tracking-wide',
    'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'hover:scale-[1.02]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    className,
  )
}
