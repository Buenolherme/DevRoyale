import { Link } from 'react-router-dom'
import scoutHomeImage from '@/assets/scout/scout-home.png'
import scoutMecanicoImage from '@/assets/scout/scout-mecanico.png'
import scoutProfessorImage from '@/assets/scout/scout-professor.png'
import {
  HomeFeatureCard,
  type HomeFeatureCardData,
} from '@/components/home/HomeFeatureCard'
import { HeroBackground, ScoutImage, ScoutWarriorPlaceholder } from '@/components/layout'
import { Badge, getButtonClassName } from '@/components/ui'
import { ROUTES } from '@/routes/paths'

const featureCards: HomeFeatureCardData[] = [
  {
    image: scoutHomeImage,
    title: 'Batalha de Devs',
    description: 'Enfrente desafios de código e prove suas habilidades na arena.',
    ctaLabel: 'Batalhar',
    mode: 'battle',
    to: ROUTES.BATALHA_DEVS,
    accent: 'primary',
    visual: 'scout',
    imageClassName: 'home-feature-card__image--warrior',
  },
  {
    image: scoutProfessorImage,
    title: 'Área dos Estudos',
    description: 'Trilhas estruturadas para evoluir do básico ao avançado.',
    ctaLabel: 'Estudar',
    mode: 'studies',
    to: ROUTES.AREA_ESTUDOS,
    accent: 'gold',
    visual: 'scout',
    imageClassName: 'home-feature-card__image--professor',
  },
  {
    image: scoutMecanicoImage,
    title: 'Bug Arena',
    description: 'Caçe e corrija bugs em trechos de código reais.',
    ctaLabel: 'Corrigir bugs',
    mode: 'bug',
    to: ROUTES.BUG_ARENA,
    accent: 'primary',
    visual: 'scout',
    imageClassName: 'home-feature-card__image--mechanic',
  },
  {
    title: 'Interview Mode',
    description: 'Pratique perguntas técnicas para entrevistas de emprego.',
    ctaLabel: 'Treinar entrevista',
    mode: 'interview',
    to: ROUTES.INTERVIEW_MODE,
    accent: 'gold',
    visual: 'icon',
  },
]

export function HomePage() {
  return (
    <div>
      <section className="arena-hero-bg relative border-b border-border">
        <HeroBackground />

        <div className="section-container relative z-10 grid gap-7 py-12 sm:py-16 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:gap-6 lg:py-12 xl:gap-10">
          <div className="text-center lg:text-left">
            <div className="animate-fade-up">
              <Badge variant="gold" className="mb-5 normal-case tracking-wide">
                Arena Competitiva · V1.0
              </Badge>
            </div>

            <h1 className="hero-title animate-fade-up animate-fade-up-delay-1 uppercase">
              DEVROYALE
            </h1>

            <p className="hero-slogan mt-4 animate-fade-up animate-fade-up-delay-2 md:mt-5">
              Estude. Batalhe. Evolua. Reine.
            </p>

            <p className="animate-fade-up animate-fade-up-delay-2 mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted lg:mx-0 lg:mt-6 lg:text-lg">
              Transforme programação em diversão. Entre em batalhas de código, pratique
              desafios, corrija bugs e evolua como dev em uma arena feita para quem quer
              competir e aprender.
            </p>

            <div className="animate-fade-up animate-fade-up-delay-3 mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:mt-10 lg:justify-start lg:gap-4">
              <Link
                to={ROUTES.BATALHA_DEVS}
                className={getButtonClassName({ size: 'lg', className: 'rounded-xl' })}
              >
                Entrar na Batalha
              </Link>
              <Link
                to={ROUTES.AREA_ESTUDOS}
                className={getButtonClassName({
                  variant: 'gold',
                  size: 'lg',
                  className: 'rounded-xl',
                })}
              >
                Começar Estudos
              </Link>
            </div>
          </div>

          <div className="animate-fade-up animate-fade-up-delay-3 mx-auto w-full max-w-2xl lg:max-w-none">
            <ScoutWarriorPlaceholder />
          </div>
        </div>
      </section>

      <section className="home-study-section border-b border-border">
        <div className="section-container py-16 md:py-20 lg:py-24">
          <div className="home-study-spotlight">
            <div className="home-study-spotlight__scout" aria-label="Scout Professor">
              <div className="home-study-spotlight__scout-glow" aria-hidden="true" />
              <ScoutImage
                src={scoutProfessorImage}
                alt="Scout Professor"
                className="home-study-scout"
              />
            </div>

            <div className="home-study-spotlight__content">
              <Badge variant="gold" className="normal-case tracking-normal">
                Aprendizado opcional
              </Badge>
              <h2>Aprenda com o Scout Professor</h2>
              <p>
                Entre na Área dos Estudos quando quiser evoluir com mais direção. Escolha
                uma linguagem, selecione seu nível e siga trilhas guiadas pelo Scout
                Professor. Nada é obrigatório: você pode batalhar, corrigir bugs ou estudar
                no seu ritmo.
              </p>

              <div className="home-study-spotlight__points" aria-label="Como funciona">
                <div>
                  <span>01</span>
                  <p><strong>Escolha seu foco</strong>Tema e nível definidos por você.</p>
                </div>
                <div>
                  <span>02</span>
                  <p><strong>Siga uma trilha</strong>Explicações e prática guiada.</p>
                </div>
                <div>
                  <span>03</span>
                  <p><strong>Evolua com contexto</strong>Histórico para recomendações futuras.</p>
                </div>
              </div>

              <div className="home-study-spotlight__footer">
                <Link
                  to={ROUTES.AREA_ESTUDOS}
                  className={getButtonClassName({
                    variant: 'gold',
                    size: 'lg',
                    className: 'rounded-xl',
                  })}
                >
                  ESTUDAR
                </Link>
                <p>Batalha e Bug Arena continuam sempre abertas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background-secondary/55">
        <div className="section-container py-10 text-center md:py-12">
          <p className="text-sm leading-relaxed text-muted">
            DevRoyale V1.0 é{' '}
            <strong className="font-semibold text-secondary">totalmente gratuita</strong> —
            explore cada modo na ordem que fizer sentido para você.
          </p>
        </div>
      </section>

      <section className="home-arena-section">
        <div className="section-container py-16 md:py-20 lg:py-24">
          <div className="mb-10 text-center md:mb-12">
            <Badge variant="gold" className="mb-4 normal-case tracking-normal">
              Todos os modos estão liberados
            </Badge>
            <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
              Escolha sua <span className="text-gradient-brand">arena</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Quatro caminhos para treinar, competir e evoluir — todos disponíveis na V1.0.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:gap-6">
            {featureCards.map((card) => (
              <HomeFeatureCard key={card.to} card={card} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
