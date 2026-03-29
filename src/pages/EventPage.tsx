import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { fetchEvent, getEventCoverUrl, getEventLogoUrl } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { SetGrid } from '../components/sets/SetGrid'
import type { EventArtist, EventGenreBreakdown } from '../lib/types'

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
      // Same month: "Jul 19 - 21, 2024"
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.getDate()}, ${e.getFullYear()}`
    }
    if (s.getFullYear() === e.getFullYear()) {
      // Same year: "Jul 19 - Aug 2, 2024"
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
    }
    // Different years
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
  const [event, setEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    fetchEvent(id)
      .then((r) => setEvent(r.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (error) return <div className="flex items-center justify-center h-full"><p className="text-sm" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p></div>

  if (isLoading || !event) {
    return (
      <div>
        <div className="h-[280px]" style={{ background: 'hsl(var(--b5))' }} />
        <div className="px-6 lg:px-10 -mt-20 relative z-10">
          <Skeleton className="h-10 w-1/2 mb-3" />
          <Skeleton className="h-5 w-1/3" />
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
  const eventYear = event.start_date?.match(/^(\d{4})/)?.[1] || event.name.match(/\b(20\d{2})\b/)?.[1] || null

  return (
    <div>
      {/* Banner — Mixcloud-style: darkened bg image, cover art left, text right */}
      <div className="relative overflow-hidden" style={{ background: 'hsl(var(--b6))' }}>
        {/* Blurred background image */}
        {event.cover_image_r2_key && (
          <div className="absolute inset-0">
            <img
              src={getEventCoverUrl(event.id)}
              alt=""
              className="w-full h-full object-cover scale-110 blur-sm"
              style={{ opacity: 0.2 }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, hsl(var(--b6) / 0.6), hsl(var(--b6) / 0.85))' }} />
          </div>
        )}

        {/* Content row */}
        <div className="relative z-10 flex items-center gap-6 lg:gap-8 px-6 lg:px-10 py-8 lg:py-10">
          {/* Cover art — square */}
          <div
            className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] lg:w-[180px] lg:h-[180px] rounded-xl overflow-hidden shrink-0"
            style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}
          >
            {event.logo_r2_key ? (
              <img src={getEventLogoUrl(event.id)} alt={event.name} className="w-full h-full object-cover" />
            ) : event.cover_image_r2_key ? (
              <img src={getEventCoverUrl(event.id)} alt={event.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(var(--h3) / 0.25), hsl(var(--b4)))' }}
              >
                <span className="text-4xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3) / 0.3)' }}>
                  {event.name?.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Text info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'hsl(var(--c3))' }}>Event</p>
              {eventYear && (
                <span
                  className="text-[10px] font-mono font-[var(--font-weight-bold)] px-2 py-0.5 rounded-md"
                  style={{ color: 'hsl(var(--h2))', background: 'hsl(var(--h3) / 0.15)' }}
                >
                  {eventYear}
                </span>
              )}
            </div>
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-[var(--font-weight-bold)] leading-tight mb-2 truncate"
              style={{ color: 'hsl(var(--c1))' }}
            >
              {event.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {event.location && (
                <span className="text-sm flex items-center gap-1" style={{ color: 'hsl(var(--c2))' }}>
                  <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--c3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                  </svg>
                  {event.location}
                </span>
              )}
              {(event.start_date || event.end_date) && (
                <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>
                  {formatDateRange(event.start_date, event.end_date)}
                </span>
              )}
              {event.series && <Badge variant="accent">{event.series}</Badge>}
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-3">
                {tags.map((tag: string) => <Badge key={tag} variant="tag">{tag}</Badge>)}
              </div>
            )}
            {event.website && (
              <a href={event.website} target="_blank" rel="noopener noreferrer" className="text-xs no-underline inline-flex items-center gap-1 mt-3 transition-colors" style={{ color: 'hsl(var(--h3))' }}>
                Visit website
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 lg:px-10 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main: sets */}
          <div className="flex-1 min-w-0">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>DJ Sets</h2>
                <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>
              </div>
              {sets.length > 0 ? (
                <SetGrid sets={sets} />
              ) : (
                <p className="text-sm py-8 text-center" style={{ color: 'hsl(var(--c3))' }}>No sets linked to this event yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-[300px] shrink-0 space-y-5">

            {/* Stats card */}
            <div className="card">
              <h3 className="text-[10px] font-mono tracking-wider mb-4" style={{ color: 'hsl(var(--c3))' }}>EVENT STATS</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xl font-[var(--font-weight-bold)] tabular-nums" style={{ color: 'hsl(var(--c1))' }}>{stats.set_count}</p>
                  <p className="text-[11px]" style={{ color: 'hsl(var(--c3))' }}>Sets</p>
                </div>
                <div>
                  <p className="text-xl font-[var(--font-weight-bold)] tabular-nums" style={{ color: 'hsl(var(--c1))' }}>{stats.artist_count}</p>
                  <p className="text-[11px]" style={{ color: 'hsl(var(--c3))' }}>Artists</p>
                </div>
                <div>
                  <p className="text-xl font-[var(--font-weight-bold)] tabular-nums" style={{ color: 'hsl(var(--c1))' }}>{formatTotalDuration(stats.total_duration)}</p>
                  <p className="text-[11px]" style={{ color: 'hsl(var(--c3))' }}>Total Duration</p>
                </div>
                <div>
                  <p className="text-xl font-[var(--font-weight-bold)] tabular-nums" style={{ color: 'hsl(var(--c1))' }}>{stats.total_plays.toLocaleString()}</p>
                  <p className="text-[11px]" style={{ color: 'hsl(var(--c3))' }}>Total Plays</p>
                </div>
              </div>
            </div>

            {/* Genre breakdown */}
            {genres.length > 0 && (
              <div className="card">
                <h3 className="text-[10px] font-mono tracking-wider mb-3" style={{ color: 'hsl(var(--c3))' }}>GENRES</h3>
                <div className="space-y-2.5">
                  {genres.map((g) => (
                    <div key={g.genre}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: 'hsl(var(--c1))' }}>{g.genre}</span>
                        <span className="text-[10px] font-mono tabular-nums" style={{ color: 'hsl(var(--c3))' }}>{g.count}</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'hsl(var(--b3))' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(g.count / maxGenreCount) * 100}%`,
                            background: 'hsl(var(--h3))',
                            transition: 'width 0.3s ease-out',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Artist lineup */}
            {artists.length > 0 && (
              <div className="card">
                <h3 className="text-[10px] font-mono tracking-wider mb-3" style={{ color: 'hsl(var(--c3))' }}>ARTIST LINEUP</h3>
                <div className="space-y-1">
                  {artists.slice(0, 15).map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/app/artists/${artist.slug || artist.id}`}
                      className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg no-underline transition-colors"
                      style={{ color: 'hsl(var(--c1))' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--b3) / 0.5)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                    >
                      <div
                        className="w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                        style={{ background: 'hsl(var(--b3))', boxShadow: 'var(--card-border)' }}
                      >
                        {artist.image_url ? (
                          <img src={artist.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-[10px] font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3))' }}>
                            {artist.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs truncate">{artist.name}</span>
                    </Link>
                  ))}
                  {artists.length > 15 && (
                    <p className="text-[11px] text-center pt-1" style={{ color: 'hsl(var(--c3))' }}>
                      +{artists.length - 15} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* About */}
            {event.description && (
              <div className="card">
                <h3 className="text-[10px] font-mono tracking-wider mb-3" style={{ color: 'hsl(var(--c3))' }}>ABOUT</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--c2))' }}>{event.description}</p>
              </div>
            )}

            {/* Details */}
            <div className="card">
              <h3 className="text-[10px] font-mono tracking-wider mb-3" style={{ color: 'hsl(var(--c3))' }}>DETAILS</h3>
              <div className="space-y-2.5">
                {event.location && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'hsl(var(--c3))' }}>Location</span>
                    <span style={{ color: 'hsl(var(--c1))' }}>{event.location}</span>
                  </div>
                )}
                {event.series && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'hsl(var(--c3))' }}>Series</span>
                    <span style={{ color: 'hsl(var(--c1))' }}>{event.series}</span>
                  </div>
                )}
                {(event.start_date || event.end_date) && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'hsl(var(--c3))' }}>Date</span>
                    <span className="font-mono text-xs" style={{ color: 'hsl(var(--c1))' }}>
                      {formatDateRange(event.start_date, event.end_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
