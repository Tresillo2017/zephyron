import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { SearchFilled, ShieldFilled } from '@mingcute/react/core-filled'
import { Logo } from '../ui/Logo'
import { useSession } from '../../lib/auth-client'
import { AccountMenu } from './AccountMenu'
import { GlobalSearch } from './GlobalSearch'
import { NotificationsMenu } from './NotificationsMenu'
import { PRIMARY_NAV } from './navItems'

/** Pages whose hero banner sits under the masthead: the bar stays transparent until scrolled. */
const BANNER_PATH = /\/app\/(sets|artists)\//
const SCROLL_THRESHOLD_PX = 10

/**
 * Sticky glass masthead (sc-dashboard Masthead, top-bar form). Logo + version, the primary
 * links (desktop), search, admin shortcut, notifications and the account menu. The mobile
 * bottom bar (MobileBar) carries the same links on narrow screens.
 * No props; reads the scroll position of #app-scroll-container.
 */
export function Masthead() {
  const { data: session } = useSession()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const hasBanner = BANNER_PATH.test(pathname)

  useEffect(() => {
    const container = document.getElementById('app-scroll-container')
    if (!container) return
    const onScroll = () => setScrolled(container.scrollTop > SCROLL_THRESHOLD_PX)
    container.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sh-masthead"
      data-banner={hasBanner ? '' : undefined}
      data-scrolled={scrolled ? '' : undefined}
    >
      <div className="sh-glass" aria-hidden="true" />
      <div className="sh-masthead-inner">
        <div className="sh-cluster sh-cluster-left">
          <Link to="/app" className="ui-btn sh-logo" data-appearance="subtle" aria-label="Zephyron home">
            <Logo size={22} />
            <span className="sh-logo-word">Zephyron</span>
            <span className="sh-logo-version">v{__APP_VERSION__}</span>
          </Link>
          <nav className="sh-nav" aria-label="Primary">
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="ui-btn sh-nav-link" data-appearance="subtle">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <GlobalSearch />
          <Link to="/app/search" className="ui-btn sh-search-mobile" data-appearance="subtle" data-icon="" aria-label="Search" title="Search">
            <SearchFilled aria-hidden />
          </Link>
        </div>
        <div className="sh-cluster">
          {session?.user?.role === 'admin' && (
            <Link to="/app/admin" className="ui-btn" data-appearance="subtle" data-icon="" aria-label="Admin" title="Admin">
              <ShieldFilled aria-hidden />
            </Link>
          )}
          {session?.user && <NotificationsMenu />}
          <span className="sh-account-sep" aria-hidden="true" />
          {session?.user ? (
            <div className="sh-account-desktop"><AccountMenu /></div>
          ) : (
            <Link to="/login" className="ui-btn" data-appearance="subtle" >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
