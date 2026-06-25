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
          <CardTitle className="text-2xl">Esta arena ainda não foi desbloqueada</CardTitle>
          <CardDescription>
            Volte para a página inicial e escolha um dos modos disponíveis na V1.0.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={ROUTES.HOME} className={getButtonClassName({ variant: 'gold', size: 'lg' })}>
            Voltar ao início
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
