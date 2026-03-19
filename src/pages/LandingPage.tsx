import { Link } from 'react-router'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-hidden">
      {/* Nav */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent/90 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
            Sign In
          </Link>
          <Link to="/register" className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors no-underline">
            Get Access
          </Link>
        </div>
      </header>

      {/* Hero — asymmetric split with waveform visualization */}
      <main className="flex-1 flex items-center relative">
        {/* Ambient glow */}
        <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full bg-accent/8 blur-[150px] pointer-events-none" style={{ animation: 'drift 20s ease-in-out infinite' }} />
        <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" style={{ animation: 'drift 25s ease-in-out infinite reverse' }} />

        <div className="relative z-10 px-5 sm:px-8 lg:px-16 max-w-7xl w-full mx-auto flex items-center">
          {/* Left: text content */}
          <div className="max-w-xl flex-1">
            {/* Beta badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 text-accent text-xs font-mono tracking-wider rounded-md mb-8">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              INVITE-ONLY BETA
            </div>

            {/* Headline — dramatic weight contrast */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-text-primary leading-[1.05] tracking-tight mb-6">
              The platform for
              <br />
              <span className="text-accent" style={{ textShadow: '0 0 60px oklch(0.55 0.25 280 / 0.3)' }}>DJ sets</span>
            </h1>

            <p className="text-base sm:text-lg text-text-secondary max-w-md leading-relaxed mb-10">
              Curated festival and club mixes with AI-powered tracklists
              that get smarter with every listen.
            </p>

            {/* CTAs — left-aligned */}
            <div className="flex items-center gap-3">
              <Link to="/register" className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors no-underline text-sm">
                Request Access
              </Link>
              <Link to="/login" className="px-6 py-3 border border-border text-text-secondary rounded-lg hover:border-border-light hover:text-text-primary transition-colors no-underline text-sm">
                Sign In
              </Link>
            </div>

            {/* Features — as a subtle list, not identical pills */}
            <div className="mt-16 flex flex-col sm:flex-row gap-8 text-sm text-text-muted">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-accent" />
                AI Track Detection
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-accent" />
                Community Corrections
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-accent" />
                Self-Improving ML
              </div>
            </div>
          </div>

          {/* Right: abstract waveform visualization */}
          <div className="hidden lg:block flex-1 max-w-md ml-auto">
            <div className="relative h-64">
              {/* Abstract waveform bars */}
              <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
                {Array.from({ length: 80 }).map((_, i) => {
                  const x = i * 5
                  const seed = Math.sin(i * 0.3) * Math.cos(i * 0.15) + Math.sin(i * 0.08)
                  const h = Math.abs(seed) * 80 + 10
                  const opacity = 0.15 + Math.abs(seed) * 0.3
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={100 - h / 2}
                      width={3}
                      height={h}
                      rx={1.5}
                      fill="currentColor"
                      className="text-accent"
                      opacity={opacity}
                    />
                  )
                })}
                {/* Playhead line */}
                <line x1="120" y1="0" x2="120" y2="200" stroke="currentColor" className="text-accent" strokeWidth="1.5" opacity="0.5" />
              </svg>
              {/* Overlay gradient to fade edges */}
              <div className="absolute inset-0 bg-gradient-to-r from-surface via-transparent to-surface pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface pointer-events-none" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-5 sm:px-8 py-5 relative z-10">
        <p className="text-xs text-text-muted">
          Zephyron &mdash; By invitation only
        </p>
      </footer>
    </div>
  )
}
