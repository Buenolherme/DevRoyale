import type { ReactNode } from 'react'

interface PageStateProps {
  title: string
  description?: string
  loading?: boolean
  children?: ReactNode
}

export function PageState({ title, description, loading = false, children }: PageStateProps) {
  return (
    <section className="page-state" aria-busy={loading}>
      <span className={`page-state__emblem${loading ? ' page-state__emblem--loading' : ''}`} aria-hidden="true">
        {loading ? '…' : '< />'}
      </span>
      <div role="status" aria-live="polite">
        <h2 className="page-state__title">{title}</h2>
        {description && <p className="page-state__description">{description}</p>}
      </div>
      {loading && <div className="page-state__skeleton" aria-hidden="true"><span /><span /><span /></div>}
      {children && <div className="page-state__actions">{children}</div>}
    </section>
  )
}
