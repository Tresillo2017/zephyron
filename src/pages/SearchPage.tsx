import { useState, useEffect, useCallback, memo } from 'react'
import { useSearchParams, Link } from 'react-router'
import { searchSets, getCoverUrl, getArtistImageUrl, getEventCoverUrl, getSongCoverUrl } from '../lib/api'
import { getPlaceholder } from '../lib/placeholders'
import { usePlayerStore } from '../stores/playerStore'
import { formatTime, formatConfidence } from '../lib/formatTime'
import type { SearchResults, TopResult, DjSet } from '../lib/types'

const TABS = ['all', 'sets', 'tracks', 'artists', 'events'] as const
type Tab = typeof TABS[number]


// ── Set card (square art, hover play) ────────────────────────────────────────

const SetCard = memo(function SetCard({ set }: { set: DjSet }) {
  const play = usePlayerStore((s) => s.play)
  const currentSet = usePlayerStore((s) => s.currentSet)
  const isPlaying = currentSet?.id === set.id

  return (
    <Link
      to={`/app/sets/${set.id}`}
      className="group block rounded-[var(--card-radius)] p-3.5 no-underline transition-colors"
      style={{ background: 'hsl(var(--b5))' }}
      onMouseEnter={() => {}}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3" style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }}>
        <img
          src={set.cover_image_r2_key ? getCoverUrl(set.id) : getPlaceholder('square')}
          alt={set.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
        />
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); play(set) }}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0"
          style={{ background: 'hsl(var(--h3))', boxShadow: '0 4px 14px hsl(var(--h4) / 0.5)' }}
          aria-label={`Play ${set.title}`}
        >
          {isPlaying
            ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>
      </div>
      <p className="text-sm font-[var(--font-weight-medium)] truncate mb-0.5" style={{ color: 'hsl(var(--c1))' }}>{set.title}</p>
      <p className="text-xs truncate" style={{ color: 'hsl(var(--c3))' }}>{set.artist}</p>
    </Link>
  )
})

// ── Top Result hero card ──────────────────────────────────────────────────────

const TopResultCard = memo(function TopResultCard({ result }: { result: TopResult }) {
  const coverUrl = result.type === 'set' && result.image_r2_key
    ? getCoverUrl(result.id)
    : result.type === 'artist' && result.image_r2_key
    ? getArtistImageUrl(result.id)
    : result.type === 'event' && result.image_r2_key
    ? getEventCoverUrl(result.id)
    : null

  const isRound = result.type === 'artist'

  return (
    <Link
      to={result.link}
      className="group flex flex-col gap-5 p-5 rounded-[var(--card-radius)] no-underline h-full transition-colors"
      style={{ background: 'hsl(var(--b4))' }}
    >
      <div
        className={`w-24 h-24 overflow-hidden flex-shrink-0 ${isRound ? 'rounded-full' : 'rounded-lg'}`}
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
      >
        <img
          src={coverUrl ?? getPlaceholder(isRound ? 'circle' : 'square')}
          alt={result.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder(isRound ? 'circle' : 'square') }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-[var(--font-weight-medium)] uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--c3))' }}>
          Top Result
        </p>
        <p className="text-2xl font-[var(--font-weight-bold)] leading-tight mb-1" style={{ color: 'hsl(var(--c1))' }}>
          {result.title}
        </p>
        <p className="text-sm mb-3" style={{ color: 'hsl(var(--c3))' }}>
          {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
          {result.subtitle ? ` · ${result.subtitle}` : ''}
        </p>
        {result.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-0.5 rounded-full"
                style={{ background: 'hsl(var(--b3))', color: 'hsl(var(--c2))' }}
              >
                #{tag.toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
          style={{ background: 'hsl(var(--h3))', boxShadow: '0 4px 16px hsl(var(--h4) / 0.5)' }}
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </Link>
  )
})

// ── Main page ─────────────────────────────────────────────────────────────────

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const activeTab = (searchParams.get('tab') as Tab) || 'all'

  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)

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

  const totalResults = results
    ? results.sets.length + results.tracks.length + results.artists.length + results.events.length
    : 0

  // Empty state
  if (!query.trim()) {
    return (
      <div className="px-6 lg:px-10 py-24 flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
          style={{ background: 'hsl(var(--b5))', boxShadow: 'var(--card-border)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'hsl(var(--c3))' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <p className="text-base font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c2))' }}>Search sets, artists, tracks, and events</p>
        <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Use the search bar above to get started</p>
      </div>
    )
  }

  const show = (tab: Tab) => activeTab === 'all' || activeTab === tab

  return (
    <div className="px-6 lg:px-10 py-6">

      {/* Category tabs — pill style */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {TABS.map((tab) => {
          const count = tab === 'all' ? totalResults
            : tab === 'sets' ? (results?.sets.length ?? 0)
            : tab === 'tracks' ? (results?.tracks.length ?? 0)
            : tab === 'artists' ? (results?.artists.length ?? 0)
            : (results?.events.length ?? 0)
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className="px-4 py-1.5 rounded-full text-sm font-[var(--font-weight-medium)] transition-colors capitalize"
              style={{
                background: isActive ? 'hsl(var(--c1))' : 'hsl(var(--b4))',
                color: isActive ? 'hsl(var(--b6))' : 'hsl(var(--c2))',
              }}
            >
              {tab}
              {tab !== 'all' && count > 0 && !isActive && (
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 gap-5 mb-8">
          <div className="h-52 rounded-[var(--card-radius)] animate-pulse" style={{ background: 'hsl(var(--b5))' }} />
          <div className="h-52 rounded-[var(--card-radius)] animate-pulse" style={{ background: 'hsl(var(--b5))' }} />
        </div>
      )}

      {!loading && results && (
        <div className="space-y-10">

          {/* All tab: Spotify 2-col hero */}
          {activeTab === 'all' && (results.top_result || results.tracks.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Left: Top Result */}
              {results.top_result && (
                <div>
                  <h2 className="text-xl font-[var(--font-weight-bold)] mb-4" style={{ color: 'hsl(var(--c1))' }}>Top Result</h2>
                  <TopResultCard result={results.top_result} />
                </div>
              )}

              {/* Right: Tracks */}
              {results.tracks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>Tracks</h2>
                    {results.tracks.length > 5 && (
                      <button type="button" onClick={() => setTab('tracks')} className="text-xs font-[var(--font-weight-medium)] uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>
                        See all
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {results.tracks.slice(0, 5).map((track, i) => (
                      <Link
                        key={track.id}
                        to={`/app/sets/${track.set_id}`}
                        className="group flex items-center gap-3 px-3 py-2 rounded-lg no-underline transition-colors hover:bg-[hsl(var(--b4))]"
                      >
                        <span className="w-5 text-right text-sm shrink-0" style={{ color: 'hsl(var(--c3))' }}>{i + 1}</span>
                        <img
                          src={track.song_id && track.song_cover_r2_key ? getSongCoverUrl(track.song_id) : getCoverUrl(track.set_id)}
                          alt={track.track_title}
                          className="w-10 h-10 rounded shrink-0 object-cover"
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>{track.track_title}</p>
                          <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
                            {track.set_artist} · {formatTime(track.start_time_seconds)}
                          </p>
                        </div>
                        <span className="text-xs font-mono shrink-0 opacity-0 group-hover:opacity-100" style={{ color: 'hsl(var(--c3))' }}>
                          {formatConfidence(track.confidence)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tracks tab (standalone full list) */}
          {activeTab === 'tracks' && results.tracks.length > 0 && (
            <section>
              <h2 className="text-xl font-[var(--font-weight-bold)] mb-5" style={{ color: 'hsl(var(--c1))' }}>Tracks</h2>
              <div className="space-y-0.5">
                {results.tracks.map((track, i) => (
                  <Link
                    key={track.id}
                    to={`/app/sets/${track.set_id}`}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors hover:bg-[hsl(var(--b4))]"
                  >
                    <span className="w-5 text-right text-sm shrink-0" style={{ color: 'hsl(var(--c3))' }}>{i + 1}</span>
                    <img
                      src={getCoverUrl(track.set_id)}
                      alt={track.set_title}
                      className="w-10 h-10 rounded shrink-0 object-cover"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>{track.track_title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
                        {track.set_artist} · in {track.set_title} · {formatTime(track.start_time_seconds)}
                      </p>
                    </div>
                    <span className="text-xs font-mono shrink-0" style={{ color: 'hsl(var(--c3))' }}>
                      {formatConfidence(track.confidence)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Sets */}
          {show('sets') && results.sets.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>Sets</h2>
                {activeTab === 'all' && results.sets.length > 5 && (
                  <button type="button" onClick={() => setTab('sets')} className="text-xs font-[var(--font-weight-medium)] uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>
                    See all {results.sets.length}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {(activeTab === 'all' ? results.sets.slice(0, 5) : results.sets).map((set) => (
                  <SetCard key={set.id} set={set} />
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {show('artists') && results.artists.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>Artists</h2>
                {activeTab === 'all' && results.artists.length > 5 && (
                  <button type="button" onClick={() => setTab('artists')} className="text-xs font-[var(--font-weight-medium)] uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>
                    See all {results.artists.length}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {(activeTab === 'all' ? results.artists.slice(0, 5) : results.artists).map((artist) => (
                  <Link
                    key={artist.id}
                    to={`/app/artists/${artist.id}`}
                    className="group flex flex-col items-center gap-3 p-4 rounded-[var(--card-radius)] no-underline text-center transition-colors hover:bg-[hsl(var(--b4))]"
                  >
                    <div
                      className="w-full aspect-square rounded-full overflow-hidden"
                      style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }}
                    >
                      <img
                        src={getArtistImageUrl(artist.id)}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('circle') }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-[var(--font-weight-medium)] truncate w-full" style={{ color: 'hsl(var(--c1))' }}>{artist.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--c3))' }}>Artist · {artist.set_count} sets</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Events */}
          {show('events') && results.events.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>Events</h2>
                {activeTab === 'all' && results.events.length > 4 && (
                  <button type="button" onClick={() => setTab('events')} className="text-xs font-[var(--font-weight-medium)] uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>
                    See all {results.events.length}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(activeTab === 'all' ? results.events.slice(0, 4) : results.events).map((event) => (
                  <Link
                    key={event.id}
                    to={`/app/events/${event.slug || event.id}`}
                    className="group rounded-[var(--card-radius)] overflow-hidden no-underline transition-colors"
                    style={{ background: 'hsl(var(--b5))' }}
                  >
                    <div
                      className="w-full aspect-square"
                    >
                      <img
                        src={event.cover_image_r2_key ? getEventCoverUrl(event.id) : getPlaceholder('square')}
                        alt={event.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-[var(--font-weight-medium)] truncate" style={{ color: 'hsl(var(--c1))' }}>{event.name}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'hsl(var(--c3))' }}>
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
            <div className="py-24 text-center">
              <p className="text-base font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--c2))' }}>
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
                Try a shorter query or check the spelling
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
