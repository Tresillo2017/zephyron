import { Link, useNavigate, useLocation } from 'react-router'
import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from '../../lib/auth-client'

export function TopNav() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUserMenu])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/app/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSignOut = async () => {
    setShowUserMenu(false)
    await signOut()
    navigate('/')
  }

  // Is this a page with a banner? (artist, set pages)
  const hasBanner = location.pathname.match(/\/app\/(sets|artists)\//)

  return (
    <nav
      className="sticky top-0 z-40 flex items-center h-[calc(20px+var(--button-height))] px-5 gap-4"
      style={{ background: 'transparent' }}
    >
      {/* Gradient overlay behind nav — fades in on non-banner pages */}
      {!hasBanner && (
        <div className="absolute inset-0 -z-10 bg-[hsl(var(--b6)/0.85)] backdrop-blur-xl" />
      )}

      {/* Logo */}
      <Link to="/app" className="flex items-center gap-2 no-underline shrink-0 mr-2">
        <div className="w-6 h-6 bg-accent/90 rounded-md flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        </div>
        <span className="text-sm font-[var(--font-weight-bold)] text-text-primary tracking-tight hidden sm:inline">Zephyron</span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--h3) / 0.15)', color: 'hsl(var(--h3))' }}>ALPHA</span>
      </Link>

      {/* Main nav links */}
      <div className="hidden md:flex items-center gap-1">
        {[
          { to: '/app', label: 'Home' },
          { to: '/app/browse', label: 'Browse' },
          { to: '/app/artists', label: 'Artists' },
          { to: '/app/events', label: 'Events' },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`px-3 py-1.5 rounded-lg text-sm no-underline transition-colors ${
              location.pathname === link.to
                ? 'text-text-primary bg-surface-hover/50'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Center: search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for anything"
          className="w-full px-4 py-1.5 bg-transparent border-none text-sm text-text-secondary placeholder:text-text-muted text-center focus:outline-none focus:text-text-primary"
        />
      </form>

      {/* Right: icons + user */}
      <div className="flex items-center gap-2 shrink-0">
        {session?.user?.role === 'admin' && (
          <Link to="/app/admin" className="p-1.5 text-text-muted hover:text-text-primary transition-colors no-underline" title="Admin">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        )}

        {/* User dropdown */}
        {session?.user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-surface-hover/50 transition-colors"
            >
              <div className="w-6 h-6 bg-accent/15 rounded-full flex items-center justify-center text-accent text-[10px] font-bold">
                {session.user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="text-sm text-text-primary hidden sm:inline">{session.user.name}</span>
              <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu — bleh style glass */}
            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-[280px] p-[10px] z-50 rounded-[var(--card-radius)]"
                style={{
                  background: 'hsl(var(--b5) / 0.95)',
                  backdropFilter: 'var(--card-blur)',
                  WebkitBackdropFilter: 'var(--card-blur)',
                  boxShadow: 'var(--menu-shadow)',
                  animation: 'solarium 0.2s var(--ease-out-custom)',
                }}
              >
                {/* User info */}
                <div className="flex flex-col items-center py-3 mb-2">
                  <div className="w-14 h-14 bg-accent/15 rounded-full flex items-center justify-center text-accent text-xl font-bold mb-2">
                    {session.user.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <p className="text-sm font-medium text-text-primary">@{session.user.name}</p>
                </div>

                {/* Nav links */}
                {[
                  { to: '/app', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                  { to: '/app/playlists', label: 'Playlists', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                  { to: '/app/history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { to: '/app/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                  { to: '/app/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors no-underline"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                ))}

                <div className="mt-2 pt-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-danger hover:bg-surface-hover transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors no-underline">Sign In</Link>
        )}
      </div>
    </nav>
  )
}
