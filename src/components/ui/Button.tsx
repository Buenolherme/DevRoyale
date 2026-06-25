import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { getButtonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={getButtonClassName({ variant, size, fullWidth, className })}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
