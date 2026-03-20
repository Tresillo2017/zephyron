import { useSets } from '../hooks/useSets'
import { SetGrid } from '../components/sets/SetGrid'
import { GENRES } from '../lib/constants'
import { Link } from 'react-router'

export function HomePage() {
  const { sets, isLoading } = useSets({ pageSize: 10, sort: 'newest' })

  return (
    <div className="px-6 lg:px-10 py-6">
      {/* Hero — bold, opinionated, not "Welcome to" */}
      <section className="mb-16 sm:mb-20">
        <p className="text-xs font-mono text-accent tracking-wider mb-4">NOW STREAMING</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-[1.1] tracking-tight mb-4">
          Curated sets from<br />
          <span className="text-text-secondary font-light">the world's best DJs</span>
        </h1>
        <p className="text-text-muted text-sm max-w-md leading-relaxed">
          AI-detected tracklists. Community-verified. Every set, every track.
        </p>
      </section>

      {/* Genre exploration */}
      <section className="mb-14">
        <h2 className="text-xs font-mono text-text-muted tracking-wider mb-5">EXPLORE BY GENRE</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {GENRES.slice(0, 10).map((genre) => (
            <Link
              key={genre}
              to={`/app/browse?genre=${encodeURIComponent(genre)}`}
              className="px-4 py-2 bg-surface-raised text-text-secondary text-sm rounded-lg border border-border hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all no-underline"
            >
              {genre}
            </Link>
          ))}
          <Link to="/app/browse" className="px-4 py-2 text-accent text-sm hover:text-accent-hover transition-colors no-underline">
            See all &rarr;
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-border via-border-light to-border mb-14" />

      {/* Recent sets */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Recent Sets</h2>
          <Link to="/app/browse" className="text-xs font-mono text-text-muted hover:text-accent transition-colors no-underline">
            VIEW ALL &rarr;
          </Link>
        </div>
        <SetGrid sets={sets} isLoading={isLoading} />
      </section>
    </div>
  )
}
