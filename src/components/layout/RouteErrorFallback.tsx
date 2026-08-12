import { Link, useRouteError } from 'react-router-dom'
import { getButtonClassName } from '@/components/ui'
import { ROUTES } from '@/routes/paths'
import { Logo } from './Logo'

export function RouteErrorFallback() {
  useRouteError()

  return (
    <main className="route-error-page" id="conteudo-principal">
      <section
        className="route-error-panel"
        role="alert"
        aria-labelledby="route-error-title"
      >
        <Logo />
        <span className="route-error-panel__eyebrow">Falha inesperada</span>
        <h1 id="route-error-title">Algo deu errado na Arena</h1>
        <p>
          Encontramos um problema inesperado. Você pode tentar voltar para a página inicial.
        </p>
        <div className="route-error-panel__actions">
          <Link to={ROUTES.HOME} className={getButtonClassName({ variant: 'gold' })}>
            Voltar para Home
          </Link>
          <button
            type="button"
            className={getButtonClassName({ variant: 'secondary' })}
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      </section>
    </main>
  )
}
