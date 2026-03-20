import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses: Record<string, string> = {
  primary: 'bg-accent text-white font-semibold hover:bg-accent-hover shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_3px_12px_hsl(var(--h4)/0.35)]',
  secondary: 'bg-surface-raised text-text-primary border border-border hover:bg-surface-hover hover:border-border-light shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={{ transitionTimingFunction: 'var(--ease-out-custom)' }}
      {...props}
    />
  )
}
