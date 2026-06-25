import { Link } from 'react-router-dom'
import scoutProfessorImage from '@/assets/scout/scout-professor.png'
import { PageHeader, ScoutMascot } from '@/components/layout'
import { Badge, ModeIcon, getButtonClassName } from '@/components/ui'
import { ROUTES } from '@/routes/paths'

interface StudiesIntroProps {
  isAuthenticated: boolean
  scoutMessage: string
}

export function StudiesIntro({ isAuthenticated, scoutMessage }: StudiesIntroProps) {
  return (
    <>
      <PageHeader
        icon={<ModeIcon mode="studies" />}
        title="Área dos Estudos"
        description="Aprenda no seu ritmo. Estudos ajudam, mas não bloqueiam as arenas."
      >
        <Badge variant="gold">Centro opcional</Badge>
      </PageHeader>

      <section className="study-hub-hero" aria-labelledby="study-guide-title">
        <div className="study-hub-hero__content">
          <Badge variant="gold" className="normal-case tracking-normal">
            Scout Professor · guia personalizado
          </Badge>
          <h2 id="study-guide-title">Aprenda com direção. Batalhe quando quiser.</h2>
          <p>
            Escolha o assunto e o nível. O Scout organiza uma trilha, explica cada
            conceito e acompanha sua evolução sem bloquear nenhuma arena.
          </p>
          <div className="study-hub-hero__actions">
            <Link
              to={ROUTES.BATALHA_DEVS}
              className={getButtonClassName({ variant: 'primary', size: 'sm' })}
            >
              Ir para Batalhas
            </Link>
            <Link
              to={ROUTES.BUG_ARENA}
              className={getButtonClassName({ variant: 'secondary', size: 'sm' })}
            >
              Ir para Bug Arena
            </Link>
          </div>
          <p className="study-hub-hero__storage">
            {isAuthenticated
              ? 'Histórico permanente ativo para sua conta.'
              : 'Você pode estudar sem login. Entre para salvar XP, nível e conquistas.'}
          </p>
        </div>

        <div className="study-hub-hero__scout" aria-label="Scout Professor">
          <ScoutMascot
            src={scoutProfessorImage}
            alt="Scout Professor"
            message={scoutMessage}
            className="scout-mascot--panel scout-mascot--professor"
          />
        </div>
      </section>
    </>
  )
}
