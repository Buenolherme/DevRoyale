import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageState } from '@/components/ui'
import { ROUTES } from '@/routes/paths'
import { hasSeenDevRoyaleOnboarding } from '@/config/appMeta'
import { Header } from './Header'
import { Footer } from './Footer'
import { FirstVisitOnboarding } from './FirstVisitOnboarding'

function RouteLoadingFallback() {
  return (
    <div className="page-container route-loading">
      <PageState loading title="Preparando sua próxima tela..." description="Só um instante para continuar na Arena." />
    </div>
  )
}

const pageTitles: Record<string, string> = {
  [ROUTES.HOME]: 'Início', [ROUTES.LOGIN]: 'Entrar', [ROUTES.CADASTRO]: 'Criar conta',
  [ROUTES.PERFIL]: 'Meu perfil', [ROUTES.AMIGOS]: 'Amigos', [ROUTES.MULTIPLAYER]: 'Multiplayer',
  [ROUTES.BATALHA_DEVS]: 'Batalha de Devs', [ROUTES.AREA_ESTUDOS]: 'Treinamento',
  [ROUTES.BUG_ARENA]: 'Bug Arena', [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.SOBRE]: 'Sobre', [ROUTES.INTERVIEW_MODE]: 'Interview',
}

export function AppLayout() {
  const location = useLocation()
  const previousPath = useRef(location.pathname)
  useEffect(() => {
    const title = pageTitles[location.pathname]
      ?? (location.pathname.startsWith('/u/') ? 'Perfil público'
        : location.pathname.startsWith('/batalha/sala/') ? 'Lobby'
          : location.pathname.startsWith('/batalha/match/') ? 'Arena multiplayer' : 'Página não encontrada')
    document.title = `${title} · DevRoyale`
    if (previousPath.current !== location.pathname && !location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      document.getElementById('conteudo-principal')?.focus({ preventScroll: true })
    }
    previousPath.current = location.pathname
  }, [location.pathname, location.hash])
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
