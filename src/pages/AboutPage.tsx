import { Link } from 'react-router'

export function AboutPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-5 relative z-10">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 bg-accent/90 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
            Sign In
          </Link>
          <Link to="/register" className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors no-underline">
            Get Access
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 sm:px-8 lg:px-16 py-12 max-w-4xl mx-auto w-full">
        {/* Mission */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              The platform built for
              <span className="text-accent"> DJ sets</span>
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 bg-surface-raised border border-border rounded-md text-[10px] font-mono text-text-muted self-start mt-2">
              v{__APP_VERSION__}
            </span>
          </div>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              Zephyron exists because DJ sets deserve better. Festival mixes, club recordings,
              and radio shows are some of the most exciting music experiences out there, yet
              finding out what tracks are playing has always been a pain.
            </p>
            <p>
              We're building a curated streaming platform where every set comes with an intelligent,
              community-refined tracklist. No more Shazam-ing mid-set. No more digging through
              YouTube comments. Just press play and know what you're hearing.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-text-primary mb-6">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-surface-raised border border-border rounded-xl p-5">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">AI Detection</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Our AI analyzes YouTube descriptions, comments, and metadata to identify
                tracks with timestamps, then enriches them via Last.fm.
              </p>
            </div>

            <div className="bg-surface-raised border border-border rounded-xl p-5">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Community Corrections</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Users vote on detections and submit corrections. The community's collective
                knowledge fills in what AI misses.
              </p>
            </div>

            <div className="bg-surface-raised border border-border rounded-xl p-5">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Self-Improving ML</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Every correction feeds back into our detection prompts. The system gets
                smarter with every listen and every vote.
              </p>
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-text-primary mb-6">Built With</h2>
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Frontend', value: 'React 19 + Vite 7' },
                { label: 'Styling', value: 'Tailwind CSS 4' },
                { label: 'Backend', value: 'Cloudflare Workers' },
                { label: 'Database', value: 'Cloudflare D1' },
                { label: 'Storage', value: 'Cloudflare R2' },
                { label: 'AI', value: 'Workers AI' },
                { label: 'Search', value: 'Vectorize' },
                { label: 'Auth', value: 'Better Auth' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-text-muted text-xs">{item.label}</p>
                  <p className="text-text-primary font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Creator */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-text-primary mb-6">Creator</h2>
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <p className="text-sm text-text-secondary leading-relaxed">
              Zephyron is built by a solo developer passionate about electronic music and
              the intersection of AI and community curation. The project is open source and
              available on{' '}
              <a
                href="https://github.com/tresillo2017/zephyron"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                GitHub
              </a>.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-text-primary mb-6">Contact & Feedback</h2>
          <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-3">
            <p className="text-sm text-text-secondary">
              Found a bug? Have a feature request? Want to contribute?
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/tresillo2017/zephyron/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary hover:border-border-light transition-colors no-underline"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Open an Issue
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-5 sm:px-8 py-5 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Zephyron. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/privacy" className="text-text-muted hover:text-text-primary transition-colors no-underline">Privacy</Link>
            <Link to="/terms" className="text-text-muted hover:text-text-primary transition-colors no-underline">Terms</Link>
            <a href="https://github.com/tresillo2017/zephyron" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors no-underline">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
