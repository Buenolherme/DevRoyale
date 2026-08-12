import { Link } from 'react-router-dom'
import { DEVROYALE_STATUS, DEVROYALE_VERSION } from '@/config/appMeta'
import { ROUTES } from '@/routes/paths'
import { Logo } from './Logo'

export function Footer({ onOpenOnboarding }: { onOpenOnboarding: () => void }) {
  return (
    <footer className="border-t border-border bg-background-secondary/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center">
        <Logo />
        <p className="max-w-md text-sm leading-relaxed text-muted">
          A arena onde devs evoluem batalhando. Treinamento e Bug Arena preparam você
          para o próximo duelo.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm" aria-label="Links institucionais">
          <Link to={ROUTES.SOBRE} className="focus-ring rounded text-muted hover:text-secondary">
            Sobre o DevRoyale
          </Link>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="focus-ring rounded text-muted hover:text-secondary"
          >
            Como funciona
          </button>
        </nav>
        <div className="version-indicator" aria-label={`DevRoyale ${DEVROYALE_VERSION}, ${DEVROYALE_STATUS}`}>
          <strong>DevRoyale {DEVROYALE_VERSION}</strong>
          <span>{DEVROYALE_STATUS}</span>
        </div>
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
        <div className="space-y-1 text-xs leading-relaxed text-muted/75">
          <p>© 2026 DevRoyale. Todos os direitos reservados.</p>
          <p>Criado por Guilherme Rodrigues</p>
          <a
            href="https://www.instagram.com/buenolherme/"
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex rounded text-secondary transition-colors hover:text-secondary-light"
          >
            Instagram: @buenolherme
          </a>
        </div>
      </div>
    </footer>
  )
}
