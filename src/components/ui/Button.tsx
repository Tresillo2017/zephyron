import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

/** Legacy variant names mapped onto the bleh button appearances (see components/bleh/Button.tsx). */
const APPEARANCE: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'primary',
  secondary: 'default',
  ghost: 'ghost',
  danger: 'danger',
}

const HUE: Partial<Record<NonNullable<ButtonProps['variant']>, string>> = {
  danger: 'hue-neg',
}

/**
 * Legacy Zephyron button. Same props as before; renders the bleh `ui-btn` recipe
 * (b3 fill, 9px radius, press scale .98, accent glow on primary).
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cn('ui-btn', HUE[variant], className)}
      data-appearance={APPEARANCE[variant]}
      data-size={size === 'sm' ? 'sm' : 'md'}
    />
  )
}
