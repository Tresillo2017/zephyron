import type { ComponentType } from 'react'
import { NavLink } from 'react-router'
import { CalendarFilled, Home1Filled, MicFilled, MusicFilled } from '@mingcute/react/core-filled'
import { AccountMenu } from './AccountMenu'
import { PRIMARY_NAV } from './navItems'

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  '/app': Home1Filled,
  '/app/browse': MusicFilled,
  '/app/artists': MicFilled,
  '/app/events': CalendarFilled,
}

/**
 * Bottom bar for narrow screens (sc-dashboard MobileBar): primary links plus the Me sheet.
 * Rendered by AppLayout inside a md:hidden wrapper, between the page and the player.
 * No props.
 */
export function MobileBar() {
  return (
    <nav className="sh-mobilebar" aria-label="Mobile navigation">
      {PRIMARY_NAV.map(({ to, label, end }) => {
        const Icon = ICONS[to]
        return (
        <NavLink key={to} to={to} end={end} className="sh-mctl">
          <Icon className="sh-mctl-icon" />
          <span className="sh-mctl-label">{label}</span>
        </NavLink>
        )
      })}
      <AccountMenu variant="mobile" />
    </nav>
  )
}
