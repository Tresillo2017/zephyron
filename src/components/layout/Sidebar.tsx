import { Link, useLocation, useNavigate } from 'react-router'
import { useState } from 'react'
import { useSession, signOut } from '../../lib/auth-client'
import { Logo } from '../ui/Logo'

const NAV_ITEMS = [
  { to: '/app', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/app/browse', label: 'Browse', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { to: '/app/artists', label: 'Artists', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

const LIBRARY_ITEMS = [
  { to: '/app/playlists', label: 'Playlists', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { to: '/app/history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app'
    return location.pathname.startsWith(path)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/app/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setMobileOpen(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-6">
        <Link to="/app" className="flex items-center gap-2.5 no-underline" onClick={() => setMobileOpen(false)}>
          <Logo size={32} />
          <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 mb-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-surface-overlay border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all duration-200"
            />
          </div>
        </form>
      </div>

      {/* Main nav */}
      <nav className="px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 no-underline ${
              isActive(item.to)
                ? 'bg-accent/10 text-accent font-medium shadow-[inset_0_0_0_1px_hsl(var(--h3)/0.15)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-custom)' }}
          >
            <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Library section */}
      <div className="px-3 mt-6">
        <p className="px-3 mb-2 text-[10px] font-mono text-text-muted tracking-wider uppercase">Library</p>
        <div className="space-y-0.5">
          {LIBRARY_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 no-underline ${
                isActive(item.to)
                  ? 'bg-accent/10 text-accent font-medium shadow-[inset_0_0_0_1px_hsl(var(--h3)/0.15)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
              style={{ transitionTimingFunction: 'var(--ease-out-custom)' }}
            >
              <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Admin link */}
      {session?.user?.role === 'admin' && (
        <div className="px-3 mt-6">
          <p className="px-3 mb-2 text-[10px] font-mono text-text-muted tracking-wider uppercase">Admin</p>
          <Link
            to="/app/admin"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 no-underline ${
              isActive('/app/admin')
                ? 'bg-accent/10 text-accent font-medium shadow-[inset_0_0_0_1px_hsl(var(--h3)/0.15)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-custom)' }}
          >
            <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Dashboard
          </Link>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User */}
      <div className="px-3 pb-3 border-t border-border pt-3 mt-3">
        {session?.user ? (
          <div className="space-y-1">
            <Link
              to="/app/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors no-underline"
            >
              <div className="w-8 h-8 bg-accent/15 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                {session.user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary truncate">{session.user.name}</p>
                <p className="text-[10px] text-text-muted truncate">{session.user.email}</p>
              </div>
            </Link>
            <div className="flex items-center gap-1 px-2">
              <button onClick={handleSignOut} className="w-full text-text-muted hover:text-text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-hover flex items-center gap-2 text-xs" title="Sign out">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <Link to="/login" className="block px-3 py-2 text-sm text-accent hover:text-accent-hover transition-colors no-underline">
            Sign In
          </Link>
        )}
        <p className="text-[10px] font-mono text-text-muted/50 text-center mt-2 select-none">v{__APP_VERSION__}</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 lg:w-64 bg-[hsl(var(--b5)/0.8)] backdrop-blur-xl border-r border-[hsl(var(--br1)/0.5)] flex-col shrink-0 h-full overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile: top bar with hamburger */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-[hsl(var(--b5)/0.85)] backdrop-blur-xl border-b border-[hsl(var(--br1)/0.5)] shrink-0">
        <Link to="/app" className="flex items-center gap-2 no-underline">
          <Logo size={28} />
          <span className="text-base font-semibold text-text-primary tracking-tight">Zephyron</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-50 flex">
          <div className="w-72 bg-[hsl(var(--b5)/0.9)] backdrop-blur-xl border-r border-[hsl(var(--br1)/0.5)] h-full overflow-y-auto">
            {sidebarContent}
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}
