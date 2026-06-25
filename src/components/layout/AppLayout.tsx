import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

function RouteLoadingFallback() {
  return (
    <div
      className="page-container flex min-h-[45vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <span
          className="mx-auto mb-4 block h-3 w-3 animate-pulse rounded-full bg-[var(--color-secondary)] shadow-[var(--shadow-glow-gold)]"
          aria-hidden="true"
        />
        <p className="text-muted">Carregando arena...</p>
      </div>
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col arena-mesh-bg">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
