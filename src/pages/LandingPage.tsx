import { Link } from 'react-router'
import { Logo } from '../components/ui/Logo'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 sm:px-8 lg:px-16 py-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link to="/about" className="text-sm text-text-muted hover:text-text-primary transition-colors no-underline hidden sm:block">
            About
          </Link>
          <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all no-underline"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1)' }}
          >
            Get Access
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex items-center justify-center px-5 sm:px-8 lg:px-16 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Ambient glow blobs */}
        <div
          className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full bg-accent/8 blur-[150px] pointer-events-none"
          style={{ animation: 'drift 20s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/3 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[150px] pointer-events-none"
          style={{ animation: 'drift 25s ease-in-out infinite reverse' }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Beta badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent text-xs font-mono tracking-wider rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            INVITE-ONLY BETA
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-[1.1] tracking-tight mb-6">
            The platform for
            <br />
            <span
              className="text-accent"
              style={{ textShadow: '0 0 80px oklch(0.55 0.25 280 / 0.35)' }}
            >
              DJ sets
            </span>
          </h1>

          <p className="text-base sm:text-lg text-text-secondary max-w-lg mx-auto leading-relaxed mb-10">
            Curated festival and club mixes with AI-powered tracklists
            that get smarter with every listen.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all no-underline text-sm"
              style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1)' }}
            >
              Request Access
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-border text-text-secondary rounded-xl hover:border-border-light hover:text-text-primary active:scale-[0.98] transition-all no-underline text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-5 sm:px-8 lg:px-16 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto space-y-20 sm:space-y-28">

          {/* Feature 1: AI Track Detection — text left, visual right */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 max-w-lg">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
                AI Track Detection
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Our AI analyzes YouTube descriptions, comments, and metadata to identify tracks with
                timestamps, then enriches them via <span className="text-accent">Last.fm</span> for
                complete artist and release data.
              </p>
            </div>

            {/* Visual: Mock tracklist card */}
            <div className="flex-1 w-full max-w-md">
              <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-0.5">
                <div className="flex items-center gap-3 text-xs text-text-muted font-mono uppercase tracking-wider mb-3 px-1">
                  <span className="w-12">Time</span>
                  <span className="flex-1">Track</span>
                  <span className="w-16 text-right">Source</span>
                </div>
                {[
                  { time: '0:00', artist: 'Bicep', title: 'Glue', source: 'AI', confidence: 'high' },
                  { time: '6:32', artist: 'Ross From Friends', title: 'John Cage', source: 'AI', confidence: 'high' },
                  { time: '11:15', artist: 'DJ Seinfeld', title: 'U', source: 'AI', confidence: 'med' },
                  { time: '17:48', artist: 'Mall Grab', title: 'Pool Party', source: 'User', confidence: 'high' },
                ].map((track, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-hover transition-colors group"
                  >
                    <span className="w-12 text-xs font-mono text-text-muted tabular-nums">{track.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        <span className="text-text-secondary">{track.artist}</span>
                        {' — '}
                        {track.title}
                      </p>
                    </div>
                    <span className={`w-16 text-right text-xs font-mono ${track.source === 'AI' ? 'text-accent' : 'text-emerald-400'}`}>
                      {track.source}
                      <span className="text-text-muted ml-1">
                        {track.confidence === 'high' ? '●' : '○'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2: Community Corrections — visual left, text right */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16">
            <div className="flex-1 max-w-lg">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
                Community Corrections
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Users vote on detections and submit corrections. The community&rsquo;s{' '}
                <span className="text-accent">collective knowledge</span> fills in what AI misses.
              </p>
            </div>

            {/* Visual: Mock voting UI */}
            <div className="flex-1 w-full max-w-md">
              <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-3">
                {/* A track with voting */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <button className="text-accent hover:text-accent-hover transition-colors" aria-label="Upvote">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="text-xs font-mono font-semibold text-accent tabular-nums">24</span>
                    <button className="text-text-muted hover:text-text-secondary transition-colors" aria-label="Downvote">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.55-.24l-3.25-3.5a.75.75 0 1 1 1.1-1.02L10 15.148l2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="text-text-secondary">Bicep</span> — Glue
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 font-mono">0:00 – 6:31</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-accent/10 text-accent rounded-md border border-accent/20">
                    ✓ Verified
                  </span>
                </div>

                <div className="border-t border-border" />

                {/* A correction suggestion */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <button className="text-text-muted hover:text-accent transition-colors" aria-label="Upvote">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="text-xs font-mono text-text-muted tabular-nums">3</span>
                    <button className="text-text-muted hover:text-text-secondary transition-colors" aria-label="Downvote">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.55-.24l-3.25-3.5a.75.75 0 1 1 1.1-1.02L10 15.148l2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="line-through text-text-muted">DJ Seinfeld — U</span>
                    </p>
                    <p className="text-sm text-emerald-400 mt-0.5">
                      DJ Seinfeld — U (Hunee Remix)
                    </p>
                    <p className="text-xs text-text-muted mt-1 font-mono">11:15 – 17:47</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
                    Correction
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Self-Improving ML — text left, visual right */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 max-w-lg">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
                Self-Improving ML
              </h2>
              <p className="text-text-secondary leading-relaxed">
                Every correction feeds back into our detection prompts. The system gets{' '}
                <span className="text-accent">smarter with every listen</span> and every vote.
              </p>
            </div>

            {/* Visual: Accuracy improvement bars */}
            <div className="flex-1 w-full max-w-md">
              <div className="bg-surface-raised border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Detection Accuracy</span>
                  <span className="text-xs font-mono text-accent">Live</span>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Week 1', pct: 62, color: 'bg-accent/40' },
                    { label: 'Week 4', pct: 78, color: 'bg-accent/60' },
                    { label: 'Week 8', pct: 89, color: 'bg-accent/80' },
                    { label: 'Current', pct: 94, color: 'bg-accent' },
                  ].map((row) => (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted font-mono">{row.label}</span>
                        <span className="text-xs text-text-primary font-mono tabular-nums">{row.pct}%</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.color}`}
                          style={{ width: `${row.pct}%`, transition: 'width 1s var(--ease-out-custom)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-xs text-text-muted">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                  </svg>
                  <span>
                    <span className="text-emerald-400 font-mono">+32%</span> improvement from community feedback
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="px-5 sm:px-8 lg:px-16 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-12">
            Built With
          </h2>
          <div className="bg-surface-raised border border-border rounded-xl p-6 sm:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-8">
              {[
                { label: 'Frontend', value: 'React 19' },
                { label: 'Styling', value: 'Tailwind CSS 4' },
                { label: 'Backend', value: 'CF Workers' },
                { label: 'Database', value: 'D1' },
                { label: 'Storage', value: 'R2' },
                { label: 'AI', value: 'Workers AI' },
                { label: 'Search', value: 'Vectorize' },
                { label: 'Auth', value: 'Better Auth' },
              ].map((item) => (
                <div key={item.label} className="text-center sm:text-left">
                  <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-sm font-medium text-text-primary">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-5 sm:px-8 lg:px-16 py-20 sm:py-28">
        <div className="relative max-w-2xl mx-auto text-center">
          {/* Subtle glow behind CTA */}
          <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
            <div className="w-[300px] h-[200px] bg-accent/6 blur-[100px] rounded-full" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            Ready to listen?
          </h2>
          <p className="text-text-secondary leading-relaxed mb-10 max-w-md mx-auto">
            Join the community shaping the future of DJ set discovery.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all no-underline text-sm"
              style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1)' }}
            >
              Request Access
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-border text-text-secondary rounded-xl hover:border-border-light hover:text-text-primary active:scale-[0.98] transition-all no-underline text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 sm:px-8 lg:px-16 py-6 border-t border-border relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Zephyron &mdash; By invitation only
          </p>
          <div className="flex items-center gap-5 text-xs">
            <Link to="/about" className="text-text-muted hover:text-text-primary transition-colors no-underline">About</Link>
            <Link to="/privacy" className="text-text-muted hover:text-text-primary transition-colors no-underline">Privacy</Link>
            <Link to="/terms" className="text-text-muted hover:text-text-primary transition-colors no-underline">Terms</Link>
            <a href="https://github.com/tresillo2017/zephyron" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors no-underline">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
