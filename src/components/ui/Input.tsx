import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, id, error, className, ...props }: InputProps) {
  const inputId = id ?? props.name

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-background px-4 py-2.5 text-foreground',
          'placeholder:text-muted transition-colors',
          'focus-visible:border-secondary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-secondary',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
