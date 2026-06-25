import type { ImgHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils'
import { ScoutImage } from './ScoutImage'

interface ScoutMascotProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'className' | 'src'> {
  alt: string
  bubbleClassName?: string
  className?: string
  imageClassName?: string
  message: string
  src: string
  stageEffects?: ReactNode
}

export function ScoutMascot({
  alt,
  bubbleClassName,
  className,
  imageClassName,
  loading = 'eager',
  message,
  src,
  stageEffects,
  ...props
}: ScoutMascotProps) {
  return (
    <div className={cn('scout-mascot', className)}>
      <div className="scout-mascot__stage" data-scout-stage>
        <div className="scout-mascot__halo" aria-hidden="true" />
        <ScoutImage
          src={src}
          alt={alt}
          loading={loading}
          className={cn('scout-mascot__image', imageClassName)}
          {...props}
        />
        {stageEffects ? (
          <div className="scout-mascot__effects" aria-hidden="true">
            {stageEffects}
          </div>
        ) : null}
      </div>

      <div className={cn('scout-mascot__bubble', bubbleClassName)} aria-live="polite">
        <p>&ldquo;{message}&rdquo;</p>
      </div>
    </div>
  )
}
