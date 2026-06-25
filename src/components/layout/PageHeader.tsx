import type { ReactNode } from 'react'
import { cn } from '@/utils'

interface PageHeaderProps {
  icon?: ReactNode
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function PageHeader({ icon, title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-foreground md:text-3xl">
            {icon && (
              <span className="page-header__icon" aria-hidden="true">
                {icon}
              </span>
            )}
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
