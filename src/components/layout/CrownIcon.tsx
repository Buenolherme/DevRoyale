import { useId } from 'react'
import { cn } from '@/utils'

interface CrownIconProps {
  className?: string
  size?: number
}

export function CrownIcon({ className, size = 20 }: CrownIconProps) {
  const id = useId().replace(/:/g, '')
  const goldId = `${id}-gold`
  const bandId = `${id}-band`
  const jewelId = `${id}-jewel`
  const glowId = `${id}-glow`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('devroyale-crown', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={goldId} x1="13" y1="14" x2="51" y2="49" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF3AE" />
          <stop offset="0.25" stopColor="#F0C760" />
          <stop offset="0.58" stopColor="#C88822" />
          <stop offset="0.82" stopColor="#8B4A10" />
          <stop offset="1" stopColor="#E3AD3E" />
        </linearGradient>
        <linearGradient id={bandId} x1="16" y1="43" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7A3D0A" />
          <stop offset="0.28" stopColor="#E0A936" />
          <stop offset="0.52" stopColor="#FFF0A0" />
          <stop offset="0.76" stopColor="#C17816" />
          <stop offset="1" stopColor="#6B3208" />
        </linearGradient>
        <radialGradient id={jewelId} cx="0" cy="0" r="1" gradientTransform="translate(30 43) rotate(35) scale(8)">
          <stop stopColor="#FFB082" />
          <stop offset="0.35" stopColor="#D43B2F" />
          <stop offset="1" stopColor="#721616" />
        </radialGradient>
        <filter id={glowId} x="-18" y="-18" width="100" height="100" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#050506" floodOpacity="0.8" />
          <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="#E0A936" floodOpacity="0.42" />
          <feDropShadow dx="0" dy="1" stdDeviation="2.4" floodColor="#9D211F" floodOpacity="0.26" />
        </filter>
      </defs>
      <g filter={`url(#${glowId})`}>
        <path
          d="M10.5 22.5 21 31.2 31.8 11.5 43.2 31 53.5 22.5 49.2 45.8H14.8L10.5 22.5Z"
          fill={`url(#${goldId})`}
          stroke="#F6D570"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="m14.2 27.1 8.5 10.2 9.1-18.7 9.3 18.7 8.8-10.1-2.8 15.2H17l-2.8-15.3Z"
          fill="#5A2808"
          fillOpacity="0.2"
        />
        <path
          d="M16 42.5h32.1l-1.3 9.2c-.2 1.4-1.4 2.4-2.8 2.4H20c-1.4 0-2.6-1-2.8-2.4L16 42.5Z"
          fill={`url(#${bandId})`}
          stroke="#F2CA60"
          strokeWidth="1.15"
        />
        <path d="M19 46h26" stroke="#FFF0A0" strokeWidth="1.2" strokeLinecap="round" opacity="0.68" />
        <path d="m18.4 39.8 4.3-7.5M45.4 32.4l4.1 7.3M31.9 17v20" stroke="#FFF7C7" strokeWidth="1.15" strokeLinecap="round" opacity="0.55" />
        <path d="M22 49.5h20" stroke="#5F2B08" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
        <circle cx="10.5" cy="21.6" r="3.2" fill={`url(#${bandId})`} stroke="#FFE994" strokeWidth="1" />
        <circle cx="31.8" cy="10.7" r="3.5" fill={`url(#${bandId})`} stroke="#FFE994" strokeWidth="1" />
        <circle cx="53.5" cy="21.6" r="3.2" fill={`url(#${bandId})`} stroke="#FFE994" strokeWidth="1" />
        <path d="m32 39.5 4 4.2-4 4.2-4-4.2 4-4.2Z" fill={`url(#${jewelId})`} stroke="#FFCA84" strokeWidth="0.9" />
        <circle cx="21.5" cy="46.6" r="1.7" fill="#A51F22" stroke="#F3B45A" strokeWidth="0.7" />
        <circle cx="42.5" cy="46.6" r="1.7" fill="#A51F22" stroke="#F3B45A" strokeWidth="0.7" />
        <path d="M19 42.5h26" stroke="#FFF8D1" strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
      </g>
    </svg>
  )
}
