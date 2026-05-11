import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router'
import { searchSets, getCoverUrl, getArtistImageUrl, getEventCoverUrl } from '../lib/api'
import { SetGrid } from '../components/sets/SetGrid'
import { formatTime, formatConfidence } from '../lib/formatTime'
import type { SearchResults, TopResult } from '../lib/types'

const TABS = ['all', 'sets', 'tracks', 'artists', 'events'] as const
type Tab = typeof TABS[number]

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #2a1060, #5a20a0)',
  'linear-gradient(135deg, #0a1a50, #1a4090)',
  'linear-gradient(135deg, #0a2820, #1a6050)',
  'linear-gradient(135deg, #301020, #701040)',
  'linear-gradient(135deg, #1a1808, #504010)',
  'linear-gradient(135deg, #280a28, #681068)',
]
function idToGradient(id: string) {
  return COVER_GRADIENTS[id.charCodeAt(0) % COVER_GRADIENTS.length]
}

function TopResultCard({ result }: { result: TopResult }) {
  const coverUrl = result.type === 'set' && result.image_r2_key
    ? getCoverUrl(result.id)
    : result.type === 'artist' && result.image_r2_key
    ? getArtistImageUrl(result.id)
    : result.type === 'event' && result.image_r2_key
    ? getEventCoverUrl(result.id)
    : null

  return (
    <Link
      to={result.link}
      className="flex items-center gap-4 p-4 rounded-xl no-underline transition-all group"
      style={{
        background: 'hsl(var(--h3) / 0.08)',
        border: '1px solid hsl(var(--h3) / 0.2)',
      }}
    >
      <div
        className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
        style={{ background: coverUrl ? undefined : idToGradient(result.id) }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={result.title} className="w-full h-full object-cover" />
        ) : (
          result.type === 'artist' ? '🎧' : result.type === 'event' ? '🎪' : '◈'
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--h2) / 0.7)' }}>
          Top Result · {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
        </p>
        <p className="text-lg font-bold leading-tight truncate" style={{ color: 'hsl(var(--c1))' }}>
          {result.title}
        </p>
        <p className="text-sm mt-0.5 truncate" style={{ color: 'hsl(var(--c2))' }}>
          {result.subtitle}
        </p>
        {result.tags.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ background: 'hsl(var(--h3) / 0.15)', color: 'hsl(var(--h2))' }}
              >
                #{tag.toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </div>
      <svg
        className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ color: 'hsl(var(--h2))' }}
        fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </Link>
  )
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  const activeTab = (searchParams.get('tab') as Tab) || 'all'

  const [inputValue, setInputValue] = useState(query)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)

  // Sync input when URL query changes (e.g. nav search bar)
  useEffect(() => { setInputValue(query) }, [query])

  useEffect(() => {
    if (!query.trim()) { setResults(null); return }
    setLoading(true)
    searchSets(query.trim())
      .then((res) => setResults(res.data))
      .catch(() => setResults(null))
      .finally(() => setLoading(false))
  }, [query])

  const setTab = useCallback((tab: Tab) => {
    setSearchParams((prev) => { prev.set('tab', tab); return prev }, { replace: true })
  }, [setSearchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) navigate(`/app/search?q=${encodeURIComponent(inputValue.trim())}`)
  }

  const totalResults = results
    ? results.sets.length + results.tracks.length + results.artists.length + results.events.length
    : 0

  // Empty state (no query)
  if (!query.trim()) {
    return (
      <div className="px-6 lg:px-10 py-16 flex flex-col items-center gap-4">
        <svg className="w-10 h-10" style={{ color: 'hsl(var(--c3))' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Search sets, artists, tracks, and events</p>
      </div>
    )
  }

  const show = (tab: Tab) => activeTab === 'all' || activeTab === tab

  return (
    <div className="px-6 lg:px-10 py-6 max-w-5xl">

      {/* Big search bar */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'hsl(var(--b5))', boxShadow: 'inset 0 0 0 1px hsl(var(--h3) / 0.3)' }}
        >
          <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'hsl(var(--c3))' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'hsl(var(--c1))' }}
            autoFocus
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(''); navigate('/app/search') }}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={{ color: 'hsl(var(--c3))', background: 'hsl(var(--b4) / 0.5)' }}
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* Result count + tabs */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>
          {loading ? 'Searching…' : results ? `${totalResults} results` : ''}
        </span>
        {results && (
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const count = tab === 'all' ? totalResults
                : tab === 'sets' ? results.sets.length
                : tab === 'tracks' ? results.tracks.length
                : tab === 'artists' ? results.artists.length
                : results.events.length
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTab(tab)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all capitalize"
                  style={{
                    background: activeTab === tab ? 'hsl(var(--b4))' : 'transparent',
                    color: activeTab === tab ? 'hsl(var(--c1))' : 'hsl(var(--c3))',
                    fontWeight: activeTab === tab ? '500' : '400',
                  }}
                >
                  {tab}{tab !== 'all' && count > 0 && <span className="ml-1 opacity-50 text-[10px]">{count}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'hsl(var(--b5))' }} />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="space-y-8">

          {/* Top Result — only in All tab */}
          {activeTab === 'all' && results.top_result && (
            <TopResultCard result={results.top_result} />
          )}

          {/* Sets */}
          {show('sets') && results.sets.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>Sets</span>
                {activeTab === 'all' && results.sets.length > 4 && (
                  <button type="button" onClick={() => setTab('sets')} className="text-xs" style={{ color: 'hsl(var(--h2))' }}>
                    See all {results.sets.length} →
                  </button>
                )}
              </div>
              <SetGrid sets={activeTab === 'all' ? results.sets.slice(0, 4) : results.sets} />
            </section>
          )}

          {/* Tracks */}
          {show('tracks') && results.tracks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>Tracks in sets</span>
                {activeTab === 'all' && results.tracks.length > 5 && (
                  <button type="button" onClick={() => setTab('tracks')} className="text-xs" style={{ color: 'hsl(var(--h2))' }}>
                    See all {results.tracks.length} →
                  </button>
                )}
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--b5))', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}>
                {(activeTab === 'all' ? results.tracks.slice(0, 5) : results.tracks).map((track, i, arr) => (
                  <Link
                    key={track.id}
                    to={`/app/sets/${track.set_id}`}
                    className="flex items-center gap-3 px-4 py-2.5 no-underline transition-colors hover:bg-[hsl(var(--b4)/0.3)]"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--b4) / 0.2)' : 'none' }}
                  >
                    <span className="w-10 text-xs font-mono flex-shrink-0" style={{ color: 'hsl(var(--h2))' }}>
                      {formatTime(track.start_time_seconds)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'hsl(var(--c1))' }}>{track.track_title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
                        in {track.set_title} · {track.set_artist}
                      </p>
                    </div>
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: 'hsl(var(--c3))' }}>
                      {formatConfidence(track.confidence)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {show('artists') && results.artists.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>Artists</span>
                {activeTab === 'all' && results.artists.length > 4 && (
                  <button type="button" onClick={() => setTab('artists')} className="text-xs" style={{ color: 'hsl(var(--h2))' }}>
                    See all {results.artists.length} →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(activeTab === 'all' ? results.artists.slice(0, 4) : results.artists).map((artist) => (
                  <Link
                    key={artist.id}
                    to={`/app/artists/${artist.id}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl no-underline transition-all hover:-translate-y-0.5"
                    style={{ background: 'hsl(var(--b5))', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}
                  >
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg"
                      style={{ background: artist.image_url ? undefined : idToGradient(artist.id) }}
                    >
                      {artist.image_url ? (
                        <img src={getArtistImageUrl(artist.id)} alt={artist.name} className="w-full h-full object-cover" />
                      ) : '🎧'}
                    </div>
                    <p className="text-xs font-semibold text-center truncate w-full" style={{ color: 'hsl(var(--c1))' }}>
                      {artist.name}
                    </p>
                    <p className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>
                      {artist.set_count} set{artist.set_count !== 1 ? 's' : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Events */}
          {show('events') && results.events.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>Events</span>
                {activeTab === 'all' && results.events.length > 3 && (
                  <button type="button" onClick={() => setTab('events')} className="text-xs" style={{ color: 'hsl(var(--h2))' }}>
                    See all {results.events.length} →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(activeTab === 'all' ? results.events.slice(0, 3) : results.events).map((event) => (
                  <Link
                    key={event.id}
                    to={`/app/events/${event.slug || event.id}`}
                    className="rounded-xl overflow-hidden no-underline transition-all hover:-translate-y-0.5"
                    style={{ background: 'hsl(var(--b5))', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}
                  >
                    <div
                      className="h-14 flex items-center justify-center text-2xl"
                      style={{ background: event.cover_image_r2_key ? undefined : idToGradient(event.id) }}
                    >
                      {event.cover_image_r2_key ? (
                        <img src={getEventCoverUrl(event.id)} alt={event.name} className="w-full h-full object-cover" />
                      ) : '🎪'}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--c1))' }}>{event.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
                        {[event.location, event.set_count ? `${event.set_count} sets` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* No results */}
          {totalResults === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--c3) / 0.6)' }}>
                Try a shorter query or check the spelling
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
