import type { ReactNode } from 'react'
import { CheckFilled, CloseFilled, Refresh1Filled } from '@mingcute/react/core-filled'
import { Range, Switch } from '../../bleh'
import { cn } from '../../../lib/cn'
import './settings.css'

/** Rounded card of rows. */
export function SettingGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('setting-group', className)}>{children}</div>
}

interface SettingRowProps {
  title: string
  body?: ReactNode
  type?: 'toggle' | 'options' | 'input' | 'action'
  /** Shows the reset bubble when true (ignored for toggle rows, which show their own state). */
  modified?: boolean
  onReset?: () => void
  disabled?: boolean
  /** Makes the whole row a click target. */
  onClick?: () => void
  /** `range` = 400px slider block, `none` = no right-hand slot (full-width content below the heading). */
  slot?: 'default' | 'range' | 'none'
  children?: ReactNode
}

/** Heading (title, body, reset bubble) with a right-hand control slot. Titles double as search-friendly labels. */
export function SettingRow({ title, body, type = 'action', modified, onReset, disabled, onClick, slot = 'default', children }: SettingRowProps) {
  const clickable = !!onClick && !disabled
  const showReset = !!modified && !!onReset && type !== 'toggle'
  return (
    <div
      className="setting"
      data-type={type}
      data-modified={modified ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      data-clickable={clickable ? '' : undefined}
      onClick={clickable ? onClick : undefined}
    >
      <div className="setting-heading">
        <h3 className="setting-title">
          {title}
          {showReset && (
            <button
              type="button"
              className="setting-reset"
              aria-label={`Reset ${title}`}
              title="Reset"
              onClick={(e) => { e.stopPropagation(); onReset?.() }}
            >
              <Refresh1Filled />
            </button>
          )}
        </h3>
        {body && <p className="setting-body">{body}</p>}
      </div>
      {children != null && (slot === 'none'
        ? <div className="setting-below">{children}</div>
        : (
          <div
            className="setting-slot"
            data-kind={slot === 'default' ? undefined : slot}
            onClick={clickable ? (e) => e.stopPropagation() : undefined}
          >
            {children}
          </div>
        ))}
    </div>
  )
}

/** Toggle row: the whole row flips the value. */
export function SettingSwitch({ title, body, checked, onChange, disabled }: {
  title: string; body?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  const toggle = () => { if (!disabled) onChange(!checked) }
  return (
    <SettingRow title={title} body={body} type="toggle" disabled={disabled} onClick={toggle}>
      <Switch checked={checked} onChange={toggle} label={title} disabled={disabled} withIcon />
    </SettingRow>
  )
}

/** Slider row bound to a number. */
export function SettingRange({ title, body, value, min, max, step, format, onChange, defaultValue, variant }: {
  title: string
  body?: ReactNode
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
  /** Shows the reset bubble when the value differs from this. */
  defaultValue?: number
  variant?: 'default' | 'hue'
}) {
  const modified = defaultValue !== undefined && value !== defaultValue
  return (
    <SettingRow
      title={title}
      body={body}
      type="input"
      slot="range"
      modified={modified}
      onReset={defaultValue !== undefined ? () => onChange(defaultValue) : undefined}
    >
      <Range value={value} min={min} max={max} step={step} label={title} format={format} variant={variant} onChange={onChange} />
    </SettingRow>
  )
}

/** One choice in a radio-style group (font, avatar shape). */
export function SettingChoices<T extends string>({ title, body, value, options, onChange, shapes }: {
  title: string
  body?: ReactNode
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (v: T) => void
  /** Renders each choice with a matching data-shape (avatar preview). */
  shapes?: boolean
}) {
  return (
    <SettingRow title={title} body={body} type="options" slot="none">
      <div className="setting-options" role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className="setting-choice"
            data-shape={shapes ? o.id : undefined}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </SettingRow>
  )
}

/** Inline success / error line used by the forms on the Security tab. */
export function FeedbackBanner({ type, text }: { type: 'success' | 'error'; text: string }) {
  const Icon = type === 'success' ? CheckFilled : CloseFilled
  return (
    <div className="setting-feedback" data-type={type} role={type === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      {text}
    </div>
  )
}
