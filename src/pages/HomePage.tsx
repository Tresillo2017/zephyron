import { useSets } from '../hooks/useSets'
import { SetGrid } from '../components/sets/SetGrid'
import { GENRES } from '../lib/constants'
import { Link } from 'react-router'

export function HomePage() {
  const { sets, isLoading } = useSets({ pageSize: 10, sort: 'newest' })

  return (
    <div className="px-5 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
      {/* Hero — generous top breathing room */}
      <section className="mb-14">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3 leading-tight">
          Welcome to Zephyron
        </h1>
        <p className="text-text-secondary text-sm sm:text-base max-w-lg leading-relaxed">
          Curated DJ sets from the world's best festivals and clubs.
          AI-detected tracklists, community-powered accuracy.
        </p>
      </section>

      {/* Genre exploration — tighter grouping to hero above, generous gap to grid below */}
      <section className="mb-12">
        <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Explore by genre</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {GENRES.slice(0, 10).map((genre) => (
            <Link
              key={genre}
              to={`/app/browse?genre=${encodeURIComponent(genre)}`}
              className="px-4 py-1.5 bg-surface-raised text-text-secondary text-sm rounded-full border border-border hover:bg-surface-hover hover:text-text-primary hover:border-border-light transition-colors no-underline"
            >
              {genre}
            </Link>
          ))}
          <Link
            to="/app/browse"
            className="px-4 py-1.5 text-accent text-sm hover:underline no-underline"
          >
            See all
          </Link>
        </div>
      </section>

      {/* Recent sets — content section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Recent Sets</h2>
          <Link
            to="/app/browse"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline"
          >
            See all
          </Link>
        </div>
        <SetGrid sets={sets} isLoading={isLoading} />
      </section>
    </div>
  )
}
