import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router'
import { searchSets, getEventCoverUrl } from '../lib/api'
import { SetGrid } from '../components/sets/SetGrid'
import { Badge } from '../components/ui/Badge'
import { formatTime, formatConfidence } from '../lib/formatTime'
import type { SearchResults } from '../lib/types'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }

    setIsLoading(true)
    setError(null)

    searchSets(query)
      .then((res) => setResults(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Search failed'))
      .finally(() => setIsLoading(false))
  }, [query])

  if (!query.trim()) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-text-muted text-sm">Enter a search query to find sets, tracks, and events.</p>
      </div>
    )
  }

  const totalResults = results
    ? results.sets.length + results.tracks.length + (results.events?.length || 0)
    : 0

  return (
    <div className="px-6 lg:px-10 py-6">
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Search results for &ldquo;{query}&rdquo;
      </h1>

      {error && (
        <p className="text-danger text-sm mt-4">{error}</p>
      )}

      {isLoading ? (
        <div className="mt-8">
          <SetGrid sets={[]} isLoading={true} />
        </div>
      ) : results ? (
        <>
          {/* Event results */}
          {results.events && results.events.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Events ({results.events.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.events.map((event) => (
                  <Link
                    key={event.id}
                    to={`/app/events/${event.slug || event.id}`}
                    className="group no-underline block overflow-hidden rounded-[var(--card-radius)]"
                    style={{ boxShadow: 'var(--card-border), var(--card-shadow)' }}
                  >
                    <div className="relative h-28 overflow-hidden" style={{ background: 'hsl(var(--b4))' }}>
                      {event.cover_image_r2_key ? (
                        <img
                          src={getEventCoverUrl(event.id)}
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, hsl(var(--h3) / 0.15), hsl(var(--b4)))' }}
                        >
                          <span className="text-2xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3) / 0.3)' }}>
                            {event.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {event.year && (
                        <span
                          className="absolute top-2 right-2 text-[10px] font-mono font-[var(--font-weight-bold)] px-2 py-0.5 rounded-md text-white/90"
                          style={{ background: 'hsl(var(--h3) / 0.7)', backdropFilter: 'blur(4px)' }}
                        >
                          {event.year}
                        </span>
                      )}
                      <div className="absolute bottom-2.5 left-3 right-3">
                        <h3 className="text-sm font-[var(--font-weight-bold)] text-white truncate">{event.name}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-white/60">
                          {event.location && <span className="truncate">{event.location}</span>}
                          {event.set_count > 0 && (
                            <span className="shrink-0">{event.set_count} {event.set_count === 1 ? 'set' : 'sets'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Track results */}
          {results.tracks.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Tracks ({results.tracks.length})
              </h2>
              <div className="border border-border rounded-xl overflow-hidden">
                {results.tracks.map((track) => (
                  <Link
                    key={track.id}
                    to={`/app/sets/${track.set_id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border last:border-b-0 no-underline"
                  >
                    <span className="text-xs text-accent font-mono w-14">
                      {formatTime(track.start_time_seconds)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{track.track_title}</p>
                      <p className="text-xs text-text-secondary truncate">
                        in {track.set_title} by {track.set_artist}
                      </p>
                    </div>
                    <Badge variant="muted">{formatConfidence(track.confidence)}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Set results */}
          {results.sets.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Sets ({results.sets.length})
              </h2>
              <SetGrid sets={results.sets} />
            </section>
          )}

          {totalResults === 0 && (
            <div className="text-center py-16">
              <p className="text-text-muted text-sm">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
