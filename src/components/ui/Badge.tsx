interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'muted'
  className?: string
}

const variantClasses: Record<string, string> = {
  default: 'bg-surface-overlay text-text-secondary',
  accent: 'bg-accent/15 text-accent',
  muted: 'bg-surface-raised text-text-muted',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
