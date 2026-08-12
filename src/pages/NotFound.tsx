import { Link } from 'react-router-dom'
import { CrownIcon, PageHeader } from '@/components/layout'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  getButtonClassName,
} from '@/components/ui'
import { ROUTES } from '@/routes/paths'

export function NotFoundPage() {
  return (
    <div className="page-container">
      <PageHeader
        icon={<CrownIcon size={22} />}
        title="Página não encontrada"
        description="A rota solicitada não existe na arena DevRoyale."
      >
        <Badge variant="gold">404</Badge>
      </PageHeader>

      <Card variant="premium" className="mx-auto max-w-2xl text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Destino indisponível</CardTitle>
          <CardDescription>
            O endereço pode ter mudado. Volte ao início ou entre diretamente na Batalha de Devs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={ROUTES.BATALHA_DEVS} className={getButtonClassName({ size: 'lg' })}>
              Entrar na Batalha
            </Link>
            <Link to={ROUTES.HOME} className={getButtonClassName({ variant: 'secondary', size: 'lg' })}>
              Voltar ao início
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
