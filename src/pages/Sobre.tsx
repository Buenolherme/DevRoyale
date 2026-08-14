import { Link } from 'react-router-dom'
import { DEVROYALE_STATUS, DEVROYALE_VERSION_LABEL } from '@/config/appMeta'
import { PageHeader } from '@/components/layout'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ModeIcon,
  getButtonClassName,
} from '@/components/ui'
import { ROUTES } from '@/routes/paths'

const currentCapabilities = [
  'Desafios em Python, JavaScript, SQL e HTML/CSS',
  'Dificuldades do primeiro contato ao nível avançado',
  'Editor profissional integrado à Arena',
  'Validação flexível e Assistência da Arena',
  'XP, níveis e conquistas para acompanhar evolução',
]

const roadmapItems = [
  'Multiplayer competitivo',
  'Partidas Ranked e ranks',
  'Temporadas',
  'Modo espectador',
  'Chat da Arena',
]

export function SobrePage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="section-container py-14 sm:py-18 lg:py-22">
          <PageHeader
            title="DevRoyale"
            description="A arena onde devs evoluem batalhando."
            className="about-hero__header"
          >
            <Badge variant="gold" className="normal-case tracking-normal">
              {DEVROYALE_VERSION_LABEL} · {DEVROYALE_STATUS}
            </Badge>
          </PageHeader>
          <div className="about-hero__actions">
            <Link
              to={ROUTES.BATALHA_DEVS}
              className={getButtonClassName({ size: 'lg' })}
            >
              Entrar na Batalha
            </Link>
            <Link
              to={ROUTES.HOME}
              className={getButtonClassName({ variant: 'secondary', size: 'lg' })}
            >
              Conhecer os modos
            </Link>
          </div>
        </div>
      </section>

      <div className="section-container about-content">
        <section className="about-section" aria-labelledby="about-what-title">
          <div className="about-section__heading">
            <span>O que é</span>
            <h2 id="about-what-title">Programação praticada como arena</h2>
            <p>
              DevRoyale é uma experiência gamificada de programação focada em desafios
              e batalhas de código. Você enfrenta objetivos, treina fundamentos, corrige
              bugs, ganha XP e desbloqueia conquistas enquanto evolui na Arena.
            </p>
          </div>
          <div className="about-capability-grid">
            {currentCapabilities.map((capability, index) => (
              <div key={capability} className="about-capability">
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <p>{capability}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-battle" aria-labelledby="about-battle-title">
          <div className="about-battle__identity">
            <div className="about-mode-emblem" aria-hidden="true">
              <ModeIcon mode="battle" size={34} />
            </div>
            <Badge variant="primary">Modo principal</Badge>
            <h2 id="about-battle-title">Batalha de Devs</h2>
            <p>
              Escolha linguagem e dificuldade, analise o desafio, escreva no editor e
              execute sua solução. Uma resposta correta gera vitória e XP; o tempo do
              rival simulado mantém a pressão competitiva.
            </p>
          </div>
          <div className="about-battle__details">
            <div>
              <strong>Batalha atual</strong>
              <span>Casual e simulada</span>
            </div>
            <div>
              <strong>Assistência da Arena</strong>
              <span>Dicas progressivas disponíveis</span>
            </div>
            <div>
              <strong>Integridade da Batalha</strong>
              <span>Proteções locais para testes competitivos</span>
            </div>
            <p>
              A versão atual utiliza batalhas casuais com rival simulado. Multiplayer e
              Ranked estão planejados para versões futuras e ainda não estão disponíveis.
            </p>
          </div>
        </section>

        <section className="about-section" aria-labelledby="about-training-title">
          <div className="about-section__heading">
            <span>Preparação</span>
            <h2 id="about-training-title">Treine sem perder a Arena de vista</h2>
            <p>
              Bug Arena e Treinamento de Devs funcionam como apoio. Nenhuma etapa é
              obrigatória: quem já programa pode entrar diretamente na Batalha.
            </p>
          </div>
          <div className="about-support-grid">
            <Card variant="premium">
              <CardHeader>
                <div className="about-support-grid__icon" aria-hidden="true">
                  <ModeIcon mode="bug" />
                </div>
                <CardTitle>Bug Arena</CardTitle>
                <CardDescription>
                  Corrija códigos quebrados e desenvolva leitura, diagnóstico e precisão.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={ROUTES.BUG_ARENA} className="about-inline-link">
                  Treinar correções <span aria-hidden="true">→</span>
                </Link>
              </CardContent>
            </Card>
            <Card variant="premium">
              <CardHeader>
                <div className="about-support-grid__icon" aria-hidden="true">
                  <ModeIcon mode="studies" />
                </div>
                <CardTitle>Treinamento de Devs</CardTitle>
                <CardDescription>
                  Reforce lógica, linguagens e fundamentos para chegar preparado aos duelos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={ROUTES.AREA_ESTUDOS} className="about-inline-link">
                  Reforçar fundamentos <span aria-hidden="true">→</span>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="about-xp" aria-labelledby="about-xp-title">
          <div>
            <span className="about-section__eyebrow">Evolução</span>
            <h2 id="about-xp-title">XP registra seu avanço</h2>
            <p>
              Atividades concluídas concedem XP conforme as regras de cada modo. O XP
              alimenta níveis e conquistas, criando um histórico claro da sua evolução.
            </p>
          </div>
          <div className="about-xp__metric" aria-label="Sistema de progressão">
            <strong>XP</strong>
            <span>Níveis · conquistas · histórico</span>
          </div>
        </section>

        <section className="about-section" aria-labelledby="about-roadmap-title">
          <div className="about-section__heading">
            <span>Roadmap</span>
            <h2 id="about-roadmap-title">O futuro da Arena</h2>
            <p>
              Os recursos abaixo estão planejados para versões futuras e ainda não fazem
              parte da experiência disponível.
            </p>
          </div>
          <div className="about-roadmap" role="list">
            {roadmapItems.map((item) => (
              <div key={item} role="listitem">
                <span>Futuro</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
          <p className="about-ranked-note">
            Na futura Ranked, a Assistência da Arena ficará indisponível em partidas ranqueadas.
          </p>
        </section>

        <section className="about-status" aria-labelledby="about-status-title">
          <div>
            <span>Versão atual</span>
            <h2 id="about-status-title">DevRoyale {DEVROYALE_VERSION_LABEL}</h2>
            <strong>{DEVROYALE_STATUS}</strong>
          </div>
          <p>
            A V1.5 é a versão atual da Arena, com Batalha casual simulada, Bug Arena,
            Treinamento de Devs e progressão local disponíveis.
          </p>
          <div className="about-status__creator">
            <span>Criado por</span>
            <strong>Guilherme Rodrigues</strong>
            <a
              href="https://www.instagram.com/buenolherme/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram: @buenolherme
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
