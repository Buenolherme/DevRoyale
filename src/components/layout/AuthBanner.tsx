import { Link } from 'react-router-dom'
import { getButtonClassName } from '@/components/ui'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/routes/paths'

export function AuthBanner() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) return null

  return (
    <div className="mb-6 rounded-2xl border border-secondary/25 bg-secondary-muted/40 px-4 py-4 md:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-foreground">
          <strong className="text-secondary">Entre para salvar</strong> XP, nível e conquistas.
          Você pode continuar jogando normalmente como visitante.
        </p>
        <div className="flex shrink-0 gap-2">
          <Link
            to={ROUTES.CADASTRO}
            className={getButtonClassName({ variant: 'gold', size: 'sm' })}
          >
            Cadastrar
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className={getButtonClassName({ variant: 'secondary', size: 'sm' })}
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
