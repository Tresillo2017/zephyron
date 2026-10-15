import type { ComponentType, ReactNode } from 'react'
import { NavLink } from 'react-router'
import { Badge } from '../bleh'
import { cn } from '../../lib/cn'

export interface HeaderTab {
  to: string
  label: ReactNode
  icon?: ComponentType<{ className?: string }>
  /** Shows a count badge when > 0 (capped at 99+). */
  count?: number
  /** Exact-match active state. */
  end?: boolean
}

/**
 * Tab row under the hero: router-aware (NavLink), accent bar under the active tab.
 * Props:
 * - tabs: entries to render
 * - trailing: right-aligned content (e.g. a secondary tab)
 * - label: aria-label of the nav landmark
 * - className: extra classes
 */
interface HeaderTabsProps {
  tabs: HeaderTab[]
  trailing?: ReactNode
  label: string
  className?: string
}

export function HeaderTabs({ tabs, trailing, label, className }: HeaderTabsProps) {
  return (
    <nav className={cn('sh-tabs', className)} aria-label={label}>
      <div className="sh-tabs-list">
        {tabs.map(({ to, label: text, icon: Icon, count, end }) => (
          <NavLink key={to} to={to} end={end} className="sh-tab">
            {Icon && <Icon className="sh-tab-icon" />}
            {text}
            {count != null && count > 0 && <Badge>{count > 99 ? '99+' : count}</Badge>}
          </NavLink>
        ))}
        {trailing && <span className="sh-tab-spacer" />}
        {trailing}
      </div>
    </nav>
  )
}
