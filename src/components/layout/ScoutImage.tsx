import type { ImgHTMLAttributes } from 'react'
import { cn } from '@/utils'

interface ScoutImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'className' | 'src'> {
  alt: string
  className?: string
  imageClassName?: string
  src: string
}

export function ScoutImage({
  alt,
  className,
  imageClassName,
  src,
  loading = 'lazy',
  ...props
}: ScoutImageProps) {
  return (
    <div className={cn('scout-image-frame', className)}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={cn('scout-image', imageClassName)}
        {...props}
      />
    </div>
  )
}
