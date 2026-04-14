import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { fetchEvent, getEventCoverUrl, getEventLogoUrl, getArtistImageUrl } from '../lib/api'
import { useSession } from '../lib/auth-client'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { TabBar } from '../components/ui/TabBar'
import { SetGrid } from '../components/sets/SetGrid'
import { SocialLinks, countSocialLinks } from '../components/ui/SocialLinks'
import { formatPlayCount } from '../lib/formatTime'
import type { EventArtist, EventGenreBreakdown, EventEdition } from '../lib/types'

/** Extract YouTube video ID from any YouTube URL format */
function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const m = url.match(pattern)
    if (m) return m[1]
  }
  return null
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z' },
  { id: 'lineup', label: 'Artist Lineup', icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' },
  { id: 'sets', label: 'Sets', icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z' },
  { id: 'info', label: 'Info', icon: 'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z' },
]

/** Format an ISO date string to a readable format like "Jul 19, 2024" */
function formatEventDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

/** Format a date range like "Jul 19 - 21, 2024" or "Jul 19 - Aug 2, 2024" */
function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return ''
  const startFormatted = formatEventDate(start)
  if (!end || end === start) return startFormatted

  try {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')

    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.getDate()}, ${e.getFullYear()}`
    }
    if (s.getFullYear() === e.getFullYear()) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
    }
    return `${startFormatted} - ${formatEventDate(end)}`
  } catch {
    return `${startFormatted} - ${formatEventDate(end)}`
  }
}

/** Format total duration in hours/minutes like "12h 30m" */
function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function EventPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [event, setEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setActiveTab('overview')
    fetchEvent(id)
      .then((r) => setEvent(r.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [id])

  // Build edition list including current event, sorted by year descending
  const editions: EventEdition[] = event?.editions || []
  const eventYear: number | null = event?.year ?? null
  const allEditions = useMemo(() => {
    if (!event) return []
    const current: EventEdition = { id: event.id, slug: event.slug, year: eventYear, name: event.name }
    const combined = [current, ...editions.filter((e: EventEdition) => e.id !== current.id)]
    return combined.sort((a, b) => (b.year || 0) - (a.year || 0))
  }, [event, eventYear, editions])

  if (error) return <div className="flex items-center justify-center h-full"><p className="text-sm" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p></div>

  if (isLoading || !event) {
    return (
      <div>
        <div className="h-[280px] bg-surface-raised" />
        <div className="px-6 lg:px-10 -mt-24 relative z-10">
          <div className="flex gap-6">
            <Skeleton className="w-[160px] h-[160px] rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-16">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tags = Array.isArray(event.tags) ? event.tags : []
  const sets = event.sets || []
  const stats = event.stats || { set_count: 0, total_plays: 0, total_duration: 0, artist_count: 0 }
  const genres: EventGenreBreakdown[] = event.genres || []
  const artists: EventArtist[] = event.artists || []
  const maxGenreCount = genres.length > 0 ? genres[0].count : 1
  const aftermovieVideoId = extractYouTubeId(event.aftermovie_url || '')

  return (
    <div>
      {/* ═══ BANNER — aftermovie video > cover image > fallback ═══ */}
      <div className="relative h-[280px] overflow-hidden">
        {aftermovieVideoId ? (
          <>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${aftermovieVideoId}?autoplay=1&mute=1&loop=1&controls=0&playlist=${aftermovieVideoId}&modestbranding=1&rel=0&showinfo=0&disablekb=1&fs=0&iv_load_policy=3`}
              allow="autoplay; encrypted-media"
              title="Aftermovie"
              style={{
                border: 'none',
                position: 'absolute',
                top: '50%',
                left: '50%',
                // Keep 16:9 ratio but always fill the container:
                // width = 100% of container height × (16/9), height = 100% of container width × (9/16)
                // Use whichever is larger so no black bars remain
                width: 'calc(280px * 16 / 9)',
                height: 'calc(100vw * 9 / 16)',
                minWidth: '100%',
                minHeight: '100%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
            {/* Fallback cover shown until iframe loads */}
            {event.cover_image_r2_key && (
              <img
                src={getEventCoverUrl(event.id)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{ zIndex: -1 }}
              />
            )}
          </>
        ) : event.cover_image_r2_key ? (
          <img src={getEventCoverUrl(event.id)} alt="" className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full bg-surface-raised" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
      </div>

      {/* ═══ HEADER — overlapping banner ═══ */}
      <div className="relative -mt-[100px] z-10">
        <div className="px-6 lg:px-10">
          <div className="flex items-end gap-5 mb-6">
            {/* Cover art / logo */}
            <div
              className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] rounded-[var(--card-radius)] overflow-hidden flex-shrink-0 bg-surface-overlay"
              style={{ boxShadow: 'var(--subtle-shadow)' }}
            >
              {event.logo_r2_key ? (
                <img src={getEventLogoUrl(event.id)} alt={event.name} className="w-full h-full object-cover" />
              ) : event.cover_image_r2_key ? (
                <img src={getEventCoverUrl(event.id)} alt={event.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/15 to-surface-overlay">
                  <svg className="w-14 h-14 text-text-muted/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title on banner */}
            <div className="pb-2 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-text-secondary banner-text">Event</p>
                {eventYear && <Badge variant="accent">{eventYear}</Badge>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight banner-text mb-1 truncate">
                {event.name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                {event.location && (
                  <span className="text-sm text-text-secondary banner-text flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                    </svg>
                    {event.location}
                  </span>
                )}
                {(event.start_date || event.end_date) && (
                  <span className="text-xs font-mono text-text-muted banner-text">
                    {formatDateRange(event.start_date, event.end_date)}
                  </span>
                )}
                {event.series && <Badge variant="accent">{event.series}</Badge>}
              </div>

              {/* Edition year selector */}
              {allEditions.length > 1 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {allEditions.map((ed) => {
                    const isCurrent = ed.id === event.id
                    return (
                      <button
                        key={ed.id}
                        onClick={() => { if (!isCurrent) navigate(`/app/events/${ed.slug || ed.id}`) }}
                        className="px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer border-none"
                        style={{
                          background: isCurrent ? 'hsl(var(--h3) / 0.2)' : 'hsl(var(--b3) / 0.4)',
                          color: isCurrent ? 'hsl(var(--h2))' : 'hsl(var(--c3))',
                          fontWeight: isCurrent ? 'var(--font-weight-bold)' : 'var(--font-weight-default)',
                        }}
                      >
                        {ed.year || '?'}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Admin edit button */}
            {isAdmin && (
              <div className="pb-2 flex items-end">
                <Link to={`/app/admin?tab=events&edit=${event.id}`} className="no-underline">
                  <Button variant="secondary" size="sm">
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 lg:px-10">
          <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-6 lg:px-10 py-5">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Main: genres + featured artists */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Genre breakdown */}
              {genres.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs text-text-muted font-mono tracking-wider mb-4">GENRES</h3>
                  <div className="space-y-3">
                    {genres.map((g) => (
                      <div key={g.genre}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-text-primary">{g.genre}</span>
                          <span className="text-xs font-mono tabular-nums text-text-muted">{g.count} {g.count === 1 ? 'set' : 'sets'}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-surface-overlay">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(g.count / maxGenreCount) * 100}%`,
                              background: 'hsl(var(--h3))',
                              transition: 'width 0.4s ease-out',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured artists preview */}
              {artists.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs text-text-muted font-mono tracking-wider">ARTIST LINEUP</h3>
                    {artists.length > 6 && (
                      <button
                        onClick={() => setActiveTab('lineup')}
                        className="text-xs text-accent hover:text-accent-hover transition-colors"
                      >
                        View all {artists.length} →
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {artists.slice(0, 6).map((artist) => (
                      <Link
                        key={artist.id}
                        to={`/app/artists/${artist.slug || artist.id}`}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg no-underline transition-colors hover:bg-surface-hover"
                      >
                        <div
                          className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                          style={{ background: 'hsl(var(--b3))', boxShadow: 'var(--card-border)' }}
                        >
                          {artist.id ? (
                            <img src={getArtistImageUrl(artist.id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-[11px] font-bold text-text-muted">{artist.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-xs text-text-secondary truncate">{artist.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Social links */}
              {countSocialLinks(event, ['social']) > 0 && (
                <div className="card p-5">
                  <SocialLinks data={event} categories={['social']} heading="CONNECT" />
                </div>
              )}
            </div>

            {/* Sidebar: stats */}
            <div className="lg:w-[280px] shrink-0 space-y-5">
              <div className="card p-5">
                <h3 className="text-xs text-text-muted font-mono tracking-wider mb-4">EVENT STATS</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-text-primary">{stats.set_count}</p>
                    <p className="text-xs text-text-muted mt-0.5">Sets</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-text-primary">{stats.artist_count}</p>
                    <p className="text-xs text-text-muted mt-0.5">Artists</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-text-primary">{formatTotalDuration(stats.total_duration)}</p>
                    <p className="text-xs text-text-muted mt-0.5">Total Music</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-text-primary">{formatPlayCount(stats.total_plays)}</p>
                    <p className="text-xs text-text-muted mt-0.5">Total Plays</p>
                  </div>
                </div>
              </div>

              {/* Quick info */}
              <div className="card p-5">
                <h3 className="text-xs text-text-muted font-mono tracking-wider mb-4">DETAILS</h3>
                <div className="space-y-3">
                  {event.location && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Location</p>
                      <p className="text-sm text-text-primary">{event.location as string}</p>
                    </div>
                  )}
                  {(event.start_date || event.end_date) && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Date</p>
                      <p className="text-sm font-mono text-text-primary">{formatDateRange(event.start_date, event.end_date)}</p>
                    </div>
                  )}
                  {event.series && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Series</p>
                      <p className="text-sm text-text-primary">{event.series as string}</p>
                    </div>
                  )}
                  {event.website && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Website</p>
                      <a
                        href={event.website as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm no-underline text-accent hover:text-accent-hover transition-colors"
                      >
                        {(event.website as string).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ARTIST LINEUP ── */}
        {activeTab === 'lineup' && (
          <>
            {artists.length > 0 ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-text-primary">Artist Lineup</h3>
                  <span className="text-xs font-mono text-text-muted">{artists.length} {artists.length === 1 ? 'artist' : 'artists'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {artists.map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/app/artists/${artist.slug || artist.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors hover:bg-surface-hover"
                    >
                      <div
                        className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                        style={{ background: 'hsl(var(--b3))', boxShadow: 'var(--card-border)' }}
                      >
                        {artist.id ? (
                          <img src={getArtistImageUrl(artist.id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-sm font-bold text-text-muted">{artist.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-sm text-text-secondary truncate">{artist.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-10 text-center">
                <p className="text-text-muted text-sm">No artist lineup data available.</p>
              </div>
            )}
          </>
        )}

        {/* ── SETS ── */}
        {activeTab === 'sets' && (
          <>
            {sets.length > 0 ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-text-primary">DJ Sets</h3>
                  <span className="text-xs font-mono text-text-muted">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>
                </div>
                <SetGrid sets={sets} />
              </div>
            ) : (
              <div className="card p-10 text-center">
                <p className="text-text-muted text-sm">No sets linked to this event yet.</p>
              </div>
            )}
          </>
        )}

        {/* ── INFO ── */}
        {activeTab === 'info' && (
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex-1 min-w-0 space-y-5">

              {/* About / Description */}
              {event.description && (
                <div className="card p-5">
                  <h3 className="text-xs text-text-muted font-mono tracking-wider mb-3">ABOUT</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{event.description}</p>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs text-text-muted font-mono tracking-wider mb-3">TAGS</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string) => <Badge key={tag} variant="tag">{tag}</Badge>)}
                  </div>
                </div>
              )}

              {/* Editions */}
              {allEditions.length > 1 && (
                <div className="card p-5">
                  <h3 className="text-xs text-text-muted font-mono tracking-wider mb-4">EDITIONS</h3>
                  <div className="space-y-1">
                    {allEditions.map((ed) => {
                      const isCurrent = ed.id === event.id
                      return (
                        <button
                          key={ed.id}
                          onClick={() => { if (!isCurrent) navigate(`/app/events/${ed.slug || ed.id}`) }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left border-none cursor-pointer"
                          style={{
                            background: isCurrent ? 'hsl(var(--h3) / 0.1)' : 'transparent',
                            color: isCurrent ? 'hsl(var(--h2))' : 'hsl(var(--c2))',
                          }}
                          onMouseEnter={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'hsl(var(--b3) / 0.4)' }}
                          onMouseLeave={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <span className="text-sm font-semibold">{ed.year || '?'}</span>
                          <span className="text-xs text-text-muted truncate max-w-[200px]">{ed.name}</span>
                          {isCurrent && <span className="text-[10px] font-mono text-accent ml-auto">CURRENT</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: full details */}
            <div className="lg:w-[280px] shrink-0 space-y-5">
              <div className="card p-5">
                <h3 className="text-xs text-text-muted font-mono tracking-wider mb-4">DETAILS</h3>
                <div className="space-y-3">
                  {event.location && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Location</p>
                      <p className="text-sm text-text-primary">{event.location as string}</p>
                    </div>
                  )}
                  {eventYear && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Year</p>
                      <p className="text-sm font-mono text-text-primary">{eventYear}</p>
                    </div>
                  )}
                  {(event.start_date || event.end_date) && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Dates</p>
                      <p className="text-sm font-mono text-text-primary">{formatDateRange(event.start_date, event.end_date)}</p>
                    </div>
                  )}
                  {event.series && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Series</p>
                      <p className="text-sm text-text-primary">{event.series as string}</p>
                    </div>
                  )}
                  {event.website && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-0.5">Website</p>
                      <a
                        href={event.website as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm no-underline text-accent hover:text-accent-hover transition-colors break-all"
                      >
                        {(event.website as string).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Social links */}
              {countSocialLinks(event, ['social']) > 0 && (
                <div className="card p-5">
                  <SocialLinks data={event} categories={['social']} heading="CONNECT" />
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
