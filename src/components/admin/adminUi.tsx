import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { More2Filled } from '@mingcute/react/core-filled'
import {
  Button, Badge, Modal, IconButton, Popout, usePopout, MenuItem, MenuSeparator,
  type BadgeTone, type ButtonAppearance,
} from '../bleh'
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

export type RowMenuItem =
  | { type: 'separator' }
  | { label: string; icon?: ReactNode; tone?: 'default' | 'danger'; disabled?: boolean; onSelect: () => void }

/**
 * Per-row kebab menu on the bleh Popout (no app-wide ContextMenuHost needed).
 * Closes itself on select via the Popout context.
 */
export function RowMenu({ label, items, disabled }: { label: string; items: RowMenuItem[]; disabled?: boolean }) {
  const { mounted, btnRef, triggerProps, popoutProps } = usePopout()
  return (
    <>
      <IconButton
        ref={btnRef}
        label={label}
        size="sm"
        tooltip={false}
        disabled={disabled}
        {...triggerProps}
      >
        <More2Filled />
      </IconButton>
      {mounted && (
        <Popout {...popoutProps} align="end" width={208}>
          {items.map((item, i) =>
            'type' in item ? (
              <MenuSeparator key={`sep-${i}`} />
            ) : (
              <MenuItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                tone={item.tone}
                disabled={item.disabled}
                onClick={item.onSelect}
              />
            ),
          )}
        </Popout>
      )}
    </>
  )
}

/** Dense admin table cell helpers (compact 36px rows, muted secondary text). */
export const cellMuted = 'text-[13px] leading-[17px] text-muted'
export const cellMono = 'font-mono text-[13px] tracking-wider text-accent-2'

/**
 * Returns the URL only when it parses as http(s); otherwise undefined so callers
 * render plain text instead of an href. Blocks javascript:/data: URLs from user input.
 */
export function safeUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  try {
    const url = new URL(raw, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}
