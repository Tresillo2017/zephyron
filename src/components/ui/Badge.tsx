interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'muted'
  className?: string
}

const variantClasses: Record<string, string> = {
  default: 'bg-surface-overlay text-text-secondary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]',
  accent: 'bg-accent/15 text-accent shadow-[inset_0_0_0_1px_hsl(var(--h3)/0.2)]',
  muted: 'bg-surface-raised text-text-muted shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]',
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
