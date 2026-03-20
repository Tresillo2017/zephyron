import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses: Record<string, string> = {
  primary: 'bg-accent text-white font-[var(--font-weight-medium)] shadow-[0_3px_12px_hsl(var(--h4)/0.32)]',
  secondary: 'bg-[hsl(var(--b3))] text-text-secondary',
  ghost: 'bg-transparent text-text-secondary hover:bg-[hsl(var(--b4)/0.6)]',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-[9px] py-[5px] text-xs h-[26px]',
  md: 'px-[9px] py-[6px] text-sm h-[var(--button-height)]',
  lg: 'px-4 py-[8px] text-sm h-[36px]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[var(--button-radius)] cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={{
        transitionProperty: 'background-color, transform, box-shadow, color, opacity',
        transitionDuration: 'var(--trans)',
        transitionTimingFunction: 'var(--ease-out-custom)',
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'
        props.onMouseDown?.(e)
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = ''
        props.onMouseUp?.(e)
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = ''
        props.onMouseLeave?.(e)
      }}
      {...props}
    />
  )
}
