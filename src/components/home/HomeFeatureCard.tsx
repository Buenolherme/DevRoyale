import { Link } from 'react-router-dom'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ModeIcon,
  type ModeIconName,
} from '@/components/ui'
import { cn } from '@/utils'

export interface HomeFeatureCardData {
  accent: 'gold' | 'primary'
  description: string
  image?: string
  imageClassName?: string
  ctaLabel: string
  mode: ModeIconName
  title: string
  to: string
  visual: 'icon' | 'scout'
}

interface HomeFeatureCardProps {
  card: HomeFeatureCardData
}

export function HomeFeatureCard({ card }: HomeFeatureCardProps) {
  return (
    <Link to={card.to} className="group focus-ring rounded-2xl">
      <Card
        hoverable
        variant="premium"
        className={cn('home-feature-card h-full', `home-feature-card--${card.accent}`)}
      >
        <div className="home-feature-card__accent" aria-hidden="true" />

        <CardHeader className="home-feature-card__content">
          <div className="home-feature-card__title-row">
            <span className="home-feature-card__mode-icon" aria-hidden="true">
              <ModeIcon mode={card.mode} />
            </span>
            <CardTitle className="text-xl md:text-[1.35rem]">{card.title}</CardTitle>
          </div>
          <CardDescription className="max-w-[19rem] text-[0.9rem] leading-6">
            {card.description}
          </CardDescription>

          <span className="home-feature-card__cta" aria-hidden="true">
            {card.ctaLabel} <span>→</span>
          </span>
        </CardHeader>

        <div
          className={cn(
            'home-feature-card__visual',
            card.visual === 'icon'
              ? 'home-feature-card__visual--icon'
              : 'home-feature-card__visual--scout',
          )}
          aria-hidden="true"
        >
          {card.visual === 'icon' ? (
            <div className="home-feature-card__mode-emblem">
              <span />
              <ModeIcon mode={card.mode} size={68} />
            </div>
          ) : (
            card.image && (
              <img
                src={card.image}
                alt=""
                className={cn('home-feature-card__image', card.imageClassName)}
              />
            )
          )}
        </div>

        <span className="sr-only">Abrir {card.title}</span>
      </Card>
    </Link>
  )
}
