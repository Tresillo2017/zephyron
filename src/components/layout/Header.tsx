import { Link, useNavigate } from 'react-router'
import { useState } from 'react'
import { useSession, signOut } from '../../lib/auth-client'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { data: session } = useSession()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/app/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setMobileMenuOpen(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const navLinks = [
    { to: '/app', label: 'Home' },
    { to: '/app/browse', label: 'Browse' },
    { to: '/app/artists', label: 'Artists' },
    { to: '/app/playlists', label: 'Playlists' },
    { to: '/app/history', label: 'History' },
  ]

  return (
    <>
      <header className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 bg-surface-raised border-b border-border shrink-0">
        <Link to="/app" className="flex items-center gap-2 no-underline">
          <img src="/logo-128.png" alt="Zephyron logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          <span className="text-base sm:text-lg font-bold text-text-primary tracking-tight">Zephyron</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">{link.label}</Link>
          ))}
          {session?.user?.role === 'admin' && (
            <Link to="/app/admin" className="text-sm text-accent hover:text-accent-hover transition-colors no-underline">Admin</Link>
          )}
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-44 lg:w-56 pl-10 pr-4 py-2 bg-surface-overlay border border-border rounded-full text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors" />
            </div>
          </form>
          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link to="/app/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-overlay border border-border hover:border-border-light transition-colors no-underline">
                <div className="w-6 h-6 bg-accent/15 rounded-full flex items-center justify-center text-accent text-xs font-bold">{session.user.name?.charAt(0).toUpperCase() || '?'}</div>
                <span className="text-sm text-text-primary hidden lg:inline">{session.user.name}</span>
              </Link>
              <button onClick={handleSignOut} className="text-xs text-text-muted hover:text-text-primary transition-colors">Sign out</button>
            </div>
          ) : (
            <Link to="/login" className="px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border rounded-full hover:border-border-light transition-colors no-underline">Sign In</Link>
          )}
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden p-2 text-text-secondary hover:text-text-primary transition-colors">
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </header>

      {mobileMenuOpen && (
        <div
          className="sm:hidden fixed inset-0 top-14 z-50 bg-surface/95 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="flex flex-col p-4 gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSearch} className="mb-3">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search sets, artists, tracks..." className="w-full px-4 py-3 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
            </form>
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-base text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors no-underline">{link.label}</Link>
            ))}
            {session?.user?.role === 'admin' && (
              <Link to="/app/admin" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-base text-accent hover:bg-surface-hover rounded-lg transition-colors no-underline">Admin</Link>
            )}
            <div className="border-t border-border mt-3 pt-3">
              {session?.user ? (
                <>
                  <Link to="/app/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-surface-hover transition-colors no-underline">
                    <div className="w-8 h-8 bg-accent/15 rounded-full flex items-center justify-center text-accent text-sm font-bold">{session.user.name?.charAt(0).toUpperCase() || '?'}</div>
                    <div><p className="text-sm text-text-primary">{session.user.name}</p><p className="text-xs text-text-muted">{session.user.email}</p></div>
                  </Link>
                  <button onClick={() => { handleSignOut(); setMobileMenuOpen(false) }} className="w-full px-4 py-3 text-left text-sm text-text-muted hover:text-danger hover:bg-surface-hover rounded-lg transition-colors">Sign Out</button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm text-accent hover:bg-surface-hover rounded-lg transition-colors no-underline">Sign In</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
