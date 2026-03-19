import { Link } from 'react-router'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-text-primary tracking-tight">Zephyron</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors no-underline"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 bg-accent text-black text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors no-underline"
          >
            Get Access
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
            Invite-only Beta
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-text-primary leading-tight mb-6">
            The DJ set
            <br />
            streaming platform
          </h1>

          <p className="text-lg text-text-secondary max-w-lg mx-auto mb-10 leading-relaxed">
            Curated festival and club mixes with AI-powered tracklists.
            Community-verified track detection that gets smarter over time.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3 bg-accent text-black font-semibold rounded-full hover:bg-accent-hover transition-colors no-underline text-base"
            >
              Request Access
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border border-border text-text-secondary rounded-full hover:border-border-light hover:text-text-primary transition-colors no-underline text-base"
            >
              Sign In
            </Link>
          </div>

          {/* Feature pills */}
          <div className="flex items-center justify-center gap-3 mt-12 flex-wrap">
            {[
              'AI Track Detection',
              'Community Corrections',
              'Self-Improving ML',
              'Curated Catalog',
            ].map((feature) => (
              <span
                key={feature}
                className="px-3 py-1.5 bg-surface-raised border border-border rounded-full text-xs text-text-muted"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-text-muted">
          Zephyron Beta &mdash; By invitation only
        </p>
      </footer>
    </div>
  )
}
