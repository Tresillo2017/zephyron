import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button, Badge, Modal, type BadgeTone, type ButtonAppearance } from '../bleh'
import { cn } from '../../lib/cn'

/*
 * Thin adapters so the admin tabs keep their legacy call-site API
 * (variant / isOpen / size) while rendering the bleh primitives.
 */

type LegacyVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type LegacySize = 'sm' | 'md' | 'lg'

const APPEARANCE: Record<LegacyVariant, ButtonAppearance> = {
  primary: 'primary',
  secondary: 'default',
  ghost: 'ghost',
  danger: 'danger',
}

export function AdminButton({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: LegacyVariant; size?: LegacySize }) {
  return (
    <Button
      {...rest}
      label=""
      appearance={APPEARANCE[variant]}
      size={size === 'sm' ? 'sm' : 'md'}
      className={className}
    >
      {children}
    </Button>
  )
}

const BADGE_TONE: Record<string, BadgeTone> = {
  default: 'neutral',
  muted: 'neutral',
  accent: 'accent',
}

export function AdminBadge({
  variant = 'default',
  tone,
  children,
  className,
}: {
  variant?: 'default' | 'accent' | 'muted'
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return <Badge tone={tone ?? BADGE_TONE[variant]} className={className}>{children}</Badge>
}

const MODAL_WIDTH = { sm: 384, md: 448, lg: 512 } as const

/**
 * Legacy `isOpen` modal on top of the bleh Modal. Mounts only while open;
 * the bleh Modal plays its exit and calls onClose after the close animation.
 */
export function AdminModal({
  isOpen,
  onClose,
  title,
  size = 'md',
  dismissable = true,
  footer,
  className,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: keyof typeof MODAL_WIDTH
  dismissable?: boolean
  footer?: ReactNode
  className?: string
  children: ReactNode
}) {
  if (!isOpen) return null
  return (
    <Modal
      title={title}
      onClose={onClose}
      width={MODAL_WIDTH[size]}
      dismissable={dismissable}
      footer={footer}
      className={cn('max-h-[85vh]', className)}
    >
      {children}
    </Modal>
  )
}

/** Dense admin table cell helpers (compact 36px rows, muted secondary text). */
export const cellMuted = 'text-[13px] leading-[17px] text-muted'
export const cellMono = 'font-mono text-[13px] tracking-wider text-accent-2'
