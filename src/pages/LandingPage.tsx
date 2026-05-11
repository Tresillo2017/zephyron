import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '../components/ui/Logo'
import { fetchSets, getCoverUrl } from '../lib/api'
import type { DjSet } from '../lib/types'

// Spec requires this import for future feature usage
void getCoverUrl

function useLandingData(): { featured: DjSet | null; recent: DjSet[]; loading: boolean } {
  const [featured, setFeatured] = useState<DjSet | null>(null)
  const [recent, setRecent] = useState<DjSet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchSets({ sort: 'popular', pageSize: 1 }),
      fetchSets({ sort: 'newest', pageSize: 6 }),
    ])
      .then(([pop, rec]) => {
        setFeatured(pop.data[0] ?? null)
        setRecent(rec.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { featured, recent, loading }
}

export function LandingPage() {
  const { featured, recent, loading } = useLandingData()
  // Variables used in later tasks
  void featured
  void recent
  void loading

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: 'hsl(var(--b6))' }}>

      {/* ── NAV ── */}
      <header className="flex items-center justify-between px-5 sm:px-8 lg:px-16 py-5 relative z-20">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'hsl(var(--c1))' }}>Zephyron</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link
            to="/login"
            className="text-sm no-underline transition-colors"
            style={{ color: 'hsl(var(--c2))' }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-white text-sm font-medium rounded-xl no-underline transition-all active:scale-[0.98]"
            style={{
              background: 'hsl(var(--h3))',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1)',
            }}
          >
            Get Access
          </Link>
        </nav>
      </header>

      {/* sections go here */}

      {/* ── FOOTER ── */}
      <footer className="px-5 sm:px-8 lg:px-16 py-6 relative z-10" style={{ borderTop: '1px solid hsl(var(--b4) / 0.3)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
            &copy; {new Date().getFullYear()} Zephyron
          </p>
          <div className="flex items-center gap-5 text-xs">
            <Link to="/app/profile?tab=about" className="no-underline transition-colors" style={{ color: 'hsl(var(--c3))' }}>About</Link>
            <Link to="/privacy" className="no-underline transition-colors" style={{ color: 'hsl(var(--c3))' }}>Privacy</Link>
            <Link to="/terms" className="no-underline transition-colors" style={{ color: 'hsl(var(--c3))' }}>Terms</Link>
            <a href="https://github.com/tresillo2017/zephyron" target="_blank" rel="noopener noreferrer" className="no-underline transition-colors" style={{ color: 'hsl(var(--c3))' }}>GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
