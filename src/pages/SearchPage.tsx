import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router'
import { searchSets } from '../lib/api'
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
        <p className="text-text-muted text-sm">Enter a search query to find sets and tracks.</p>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Search results for "{query}"
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

          {results.sets.length === 0 && results.tracks.length === 0 && (
            <div className="text-center py-16">
              <p className="text-text-muted text-sm">No results found for "{query}"</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
