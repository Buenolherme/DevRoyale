import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
}

export function Select({
  label,
  id,
  options,
  placeholder = 'Selecione...',
  error,
  className,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name

  return (
    <div>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <select
        id={selectId}
        className={cn(
          'w-full rounded-xl border bg-background px-4 py-2.5 text-foreground transition-colors',
          'focus-visible:border-secondary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-secondary',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
