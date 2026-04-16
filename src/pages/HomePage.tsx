import { useSets } from '../hooks/useSets'
import { SetGrid } from '../components/sets/SetGrid'
import { GENRES } from '../lib/constants'
import { Link } from 'react-router'

export function HomePage() {
  const { sets, isLoading } = useSets({ pageSize: 15, sort: 'newest' })

  return (
    <div>
      {/* Hero banner with gradient */}
      <section className="relative overflow-hidden mb-12">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--h3) / 0.12) 0%, hsl(var(--b6)) 40%, hsl(var(--h3) / 0.08) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--b6)) 100%)',
          }}
        />

        <div className="relative px-6 lg:px-10 py-12 sm:py-14">
          <div className="max-w-4xl">
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-[var(--font-weight-bold)] leading-[1.1] tracking-tight mb-4"
              style={{ color: 'hsl(var(--c1))' }}
            >
              Curated sets from
              <br />
              <span
                className="font-[var(--font-weight-default)]"
                style={{ color: 'hsl(var(--c2))' }}
              >
                the world's best DJs
              </span>
            </h1>
            <p
              className="text-sm sm:text-base max-w-2xl leading-relaxed"
              style={{ color: 'hsl(var(--c3))' }}
            >
              AI-detected tracklists. Community-verified. Every set, every track.
            </p>
          </div>
        </div>
      </section>

      <div className="px-6 lg:px-10">
        {/* Genre exploration */}
        <section className="mb-12">
          <h2
            className="text-xs font-mono tracking-wider mb-5 uppercase"
            style={{ color: 'hsl(var(--c3))' }}
          >
            Explore by Genre
          </h2>
          <div className="flex items-center gap-2.5 flex-wrap">
            {GENRES.slice(0, 10).map((genre) => (
              <Link
                key={genre}
                to={`/app/browse?genre=${encodeURIComponent(genre)}`}
                className="px-4 py-2.5 text-sm rounded-lg transition-all no-underline"
                style={{
                  background: 'hsl(var(--b4) / 0.3)',
                  color: 'hsl(var(--c2))',
                  boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'hsl(var(--h3) / 0.1)'
                  e.currentTarget.style.color = 'hsl(var(--h3))'
                  e.currentTarget.style.boxShadow = 'inset 0 0 0 1px hsl(var(--h3) / 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'hsl(var(--b4) / 0.3)'
                  e.currentTarget.style.color = 'hsl(var(--c2))'
                  e.currentTarget.style.boxShadow = 'inset 0 0 0 1px hsl(var(--b4) / 0.3)'
                }}
              >
                #{genre}
              </Link>
            ))}
            <Link
              to="/app/browse"
              className="px-4 py-2.5 text-sm transition-colors no-underline"
              style={{ color: 'hsl(var(--h3))' }}
            >
              See all →
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div
          className="h-px mb-12"
          style={{
            background: 'linear-gradient(to right, hsl(var(--b4) / 0) 0%, hsl(var(--b4) / 0.5) 50%, hsl(var(--b4) / 0) 100%)',
          }}
        />

        {/* Recent sets */}
        <section className="pb-8">
          <div className="flex items-center justify-between mb-7">
            <h2
              className="text-xl font-[var(--font-weight-medium)]"
              style={{ color: 'hsl(var(--c1))' }}
            >
              Recent Sets
            </h2>
            <Link
              to="/app/browse"
              className="text-xs font-mono transition-colors no-underline uppercase tracking-wider"
              style={{ color: 'hsl(var(--c3))' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'hsl(var(--h3))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'hsl(var(--c3))'
              }}
            >
              View All →
            </Link>
          </div>
          <SetGrid sets={sets} isLoading={isLoading} />
        </section>
      </div>
    </div>
  )
}
