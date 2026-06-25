import { Link } from 'react-router-dom'
import { ROUTES } from '@/routes/paths'
import { cn } from '@/utils'
import { CrownIcon } from './CrownIcon'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'header' | 'lg'
}

const sizeMap = {
  sm: { icon: 18, symbol: 'h-7 w-7', text: 'text-lg', gap: 'gap-2.5' },
  md: { icon: 22, symbol: 'h-8 w-8', text: 'text-xl', gap: 'gap-2.5' },
  header: { icon: 27, symbol: 'h-9 w-9', text: 'text-[1.4rem]', gap: 'gap-3' },
  lg: { icon: 31, symbol: 'h-10 w-10', text: 'text-2xl', gap: 'gap-3.5' },
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const s = sizeMap[size]

  return (
    <Link
      to={ROUTES.HOME}
      className={cn(
        'brand-logo group inline-flex items-center rounded-lg transition-all duration-300 focus-ring',
        s.gap,
        className,
      )}
      aria-label="DevRoyale — Página inicial"
    >
      <span
        className={cn(
          'brand-logo__symbol relative flex shrink-0 items-center justify-center',
          s.symbol,
        )}
        aria-hidden="true"
      >
        <CrownIcon size={s.icon} />
      </span>
      <span className={cn('brand-logo__wordmark font-black leading-none', s.text)}>
        <span className="brand-logo__dev">Dev</span>
        <span className="brand-logo__royale">Royale</span>
      </span>
    </Link>
  )
}
