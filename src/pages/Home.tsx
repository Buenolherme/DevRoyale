import { Link } from 'react-router-dom'
import scoutHomeImage from '@/assets/scout/scout-home.png'
import {
  HomeFeatureCard,
  type HomeFeatureCardData,
} from '@/components/home/HomeFeatureCard'
import { HeroBackground, ScoutWarriorPlaceholder } from '@/components/layout'
import { Badge, getButtonClassName } from '@/components/ui'
import { ROUTES } from '@/routes/paths'

const featureCards: HomeFeatureCardData[] = [
  {
    image: scoutHomeImage,
    title: 'Batalha de Devs',
    description: 'Entre em duelos de código, resolva desafios e prove sua evolução na arena.',
    ctaLabel: 'Entrar na Batalha',
    mode: 'battle',
    to: ROUTES.BATALHA_DEVS,
    accent: 'primary',
    visual: 'scout',
    imageClassName: 'home-feature-card__image--warrior',
    featured: true,
    eyebrow: 'Modo principal',
  },
  {
    title: 'Bug Arena',
    description: 'Treine corrigindo códigos quebrados antes de entrar em batalhas mais difíceis.',
    ctaLabel: 'Treinar agora',
    mode: 'bug',
    to: ROUTES.BUG_ARENA,
    accent: 'primary',
    visual: 'icon',
  },
  {
    title: 'Treinamento de Devs',
    description: 'Reforce lógica, linguagens e fundamentos para chegar mais preparado aos duelos.',
    ctaLabel: 'Reforçar fundamentos',
    mode: 'studies',
    to: ROUTES.AREA_ESTUDOS,
    accent: 'gold',
    visual: 'icon',
  },
  {
    title: 'Interview Mode',
    description: 'Pratique perguntas técnicas e fortaleça sua confiança como desenvolvedor.',
    ctaLabel: 'Praticar entrevista',
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
                Arena competitiva · V1.5A
              </Badge>
            </div>

            <h1 className="hero-title animate-fade-up animate-fade-up-delay-1 uppercase">
              DEVROYALE
            </h1>

            <p className="hero-slogan mt-4 animate-fade-up animate-fade-up-delay-2 md:mt-5">
              A arena onde devs evoluem batalhando.
            </p>

            <p className="animate-fade-up animate-fade-up-delay-2 mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted lg:mx-0 lg:mt-6 lg:text-lg">
              Resolva desafios, enfrente duelos de código, suba de nível e prepare-se para
              o modo ranked.
            </p>

            <div className="animate-fade-up animate-fade-up-delay-3 mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:mt-10 lg:justify-start lg:gap-4">
              <Link
                to={ROUTES.BATALHA_DEVS}
                className={getButtonClassName({ size: 'lg', className: 'rounded-xl' })}
              >
                Entrar na Batalha
              </Link>
              <Link
                to={ROUTES.BUG_ARENA}
                className={getButtonClassName({
                  variant: 'secondary',
                  size: 'lg',
                  className: 'rounded-xl',
                })}
              >
                Treinar na Bug Arena
              </Link>
            </div>
          </div>

          <div className="animate-fade-up animate-fade-up-delay-3 mx-auto w-full max-w-2xl lg:max-w-none">
            <ScoutWarriorPlaceholder />
          </div>
        </div>
      </section>

      <section className="home-arena-section border-b border-border">
        <div className="section-container py-16 md:py-20 lg:py-24">
          <div className="mb-10 text-center md:mb-12">
            <Badge variant="gold" className="mb-4 normal-case tracking-normal">
              A batalha vem primeiro
            </Badge>
            <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
              Entre para <span className="text-gradient-brand">competir</span>. Treine para avançar.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              A Batalha de Devs é o centro da arena. Use os outros modos para fortalecer sua
              performance e chegar mais preparado aos próximos duelos.
            </p>
          </div>

          <div className="home-mode-grid">
            {featureCards.map((card) => (
              <HomeFeatureCard key={card.to} card={card} />
            ))}
          </div>
        </div>
      </section>

      <section className="home-training-section">
        <div className="section-container py-10 md:py-12">
          <div className="home-training-support">
            <div>
              <span className="home-training-support__label">Preparação para a arena</span>
              <h2>Fortaleça sua base entre uma batalha e outra.</h2>
              <p>
                Treinamento de Devs funciona como apoio: revise lógica, linguagens e
                fundamentos sem perder de vista seu próximo duelo.
              </p>
            </div>
            <Link
              to={ROUTES.AREA_ESTUDOS}
              className={getButtonClassName({
                variant: 'secondary',
                size: 'lg',
                className: 'rounded-xl',
              })}
            >
              Acessar treinamento
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
