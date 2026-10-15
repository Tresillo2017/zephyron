import type { ReactNode } from 'react'
import { Badge as BlehBadge, type BadgeTone } from '../bleh/ui/Badge'
import { cn } from '../../lib/cn'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'accent' | 'muted' | 'tag'
  className?: string
}

const TONE: Record<NonNullable<BadgeProps['variant']>, BadgeTone> = {
  default: 'neutral',
  accent: 'accent',
  muted: 'neutral',
  tag: 'neutral',
}

/** Legacy Zephyron badge. `tag` keeps the `#label` form; everything else uses the bleh badge tones. */
export function Badge({ children, variant = 'default', className }: BadgeProps) {
  if (variant === 'tag') {
    return <span className={cn('tag', className)}>#{children}</span>
  }
  return (
    <BlehBadge tone={TONE[variant]} className={className}>
      {children}
    </BlehBadge>
  )
}
