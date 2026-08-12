import { Suspense, useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { hasSeenDevRoyaleOnboarding } from '@/config/appMeta'
import { Header } from './Header'
import { Footer } from './Footer'
import { FirstVisitOnboarding } from './FirstVisitOnboarding'

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
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => !hasSeenDevRoyaleOnboarding(),
  )

  const openOnboarding = useCallback(() => setOnboardingOpen(true), [])
  const closeOnboarding = useCallback(() => setOnboardingOpen(false), [])

  return (
    <div className="flex min-h-screen flex-col arena-mesh-bg">
      <a href="#conteudo-principal" className="skip-link">
        Ir para o conteúdo principal
      </a>
      <Header onOpenOnboarding={openOnboarding} />
      <main id="conteudo-principal" tabIndex={-1} className="flex-1">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer onOpenOnboarding={openOnboarding} />
      <FirstVisitOnboarding open={onboardingOpen} onClose={closeOnboarding} />
    </div>
  )
}
