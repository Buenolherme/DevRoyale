import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hoverable?: boolean
  variant?: 'default' | 'premium' | 'scout'
}

export function Card({
  children,
  hoverable = false,
  variant = 'default',
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6 shadow-[var(--shadow-card)]',
        variant === 'default' && 'border-border bg-background-elevated',
        variant === 'premium' &&
          'border-border-strong bg-background-elevated border-secondary/15',
        variant === 'scout' && 'scout-warrior-card',
        hoverable && 'card-glow-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn('text-lg font-bold tracking-tight text-foreground', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return <p className={cn('mt-1.5 text-sm leading-relaxed text-muted', className)}>{children}</p>
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn(className)}>{children}</div>
}
