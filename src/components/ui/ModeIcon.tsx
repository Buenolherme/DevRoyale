import { cn } from '@/utils'

export type ModeIconName = 'battle' | 'studies' | 'bug' | 'interview'

interface ModeIconProps {
  mode: ModeIconName
  size?: number
  className?: string
}

export function ModeIcon({ mode, size = 24, className }: ModeIconProps) {
  return (
    <svg
      className={cn('mode-icon', `mode-icon--${mode}`, className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {mode === 'battle' && (
        <>
          <path d="m14.5 5.5 4-2 2 2-2 4-6.3 6.3" />
          <path d="m9.5 5.5-4-2-2 2 2 4 6.3 6.3" />
          <path d="m8.2 14.8-4.1 4.1M5.8 16.6l1.6 1.6" />
          <path d="m15.8 14.8 4.1 4.1M18.2 16.6l-1.6 1.6" />
        </>
      )}

      {mode === 'studies' && (
        <>
          <path d="M3.5 5.5c3.1-.8 5.9-.2 8.5 1.8v12c-2.6-2-5.4-2.6-8.5-1.8v-12Z" />
          <path d="M20.5 5.5c-3.1-.8-5.9-.2-8.5 1.8v12c2.6-2 5.4-2.6 8.5-1.8v-12Z" />
          <path d="M6.5 9c1.1-.1 2.1.1 3 .6M6.5 12c1.1-.1 2.1.1 3 .6" />
        </>
      )}

      {mode === 'bug' && (
        <>
          <rect x="7" y="6.5" width="10" height="12" rx="5" />
          <path d="M9.5 6.5V5a2.5 2.5 0 0 1 5 0v1.5M8 10H4.5M19.5 10H16M8 14H4M20 14h-4M9 18l-2 2M15 18l2 2M12 9v7" />
        </>
      )}

      {mode === 'interview' && (
        <>
          <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
          <path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3.5 11.5h17" />
          <path d="m8 15 1.3 1.3L12 13.5M14.5 15h3" />
        </>
      )}
    </svg>
  )
}
