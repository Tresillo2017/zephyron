import { useState, useEffect, useMemo, memo } from 'react'
import { Link } from 'react-router'
import { fetchEvents, getEventCoverUrl } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'

/** Format total duration like "12h 30m" */
function formatTotalDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Format ISO date to readable short form */
function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

// Memoized event card component
const EventCard = memo(({ event }: { event: any }) => {
  const year = event.year || event.start_date?.match(/^(\d{4})/)?.[1] || event.name.match(/\b(20\d{2})\b/)?.[1]

  return (
    <Link
      to={`/app/events/${event.slug || event.id}`}
      className="group no-underline block overflow-hidden rounded-[var(--card-radius)]"
      style={{ boxShadow: 'var(--card-border), var(--card-shadow)' }}
    >
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden" style={{ background: 'hsl(var(--b4))' }}>
        {event.cover_image_r2_key ? (
          <img src={getEventCoverUrl(event.id)} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--h3) / 0.15), hsl(var(--b4)))' }}>
            <span className="text-4xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3) / 0.3)' }}>{event.name?.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Year badge */}
        {year && (
          <span
            className="absolute top-3 right-3 text-[10px] font-mono font-[var(--font-weight-bold)] px-2.5 py-1 rounded-md text-white/95"
            style={{ background: 'hsl(var(--h3) / 0.8)', backdropFilter: 'blur(8px)' }}
          >
            {year}
          </span>
        )}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-base font-[var(--font-weight-bold)] text-white truncate leading-tight mb-0.5">
            {event.name}
          </h3>
          {event.location && <p className="text-xs text-white/80 truncate">{event.location}</p>}
        </div>
      </div>
      {/* Info */}
      <div className="px-4 py-3.5" style={{ background: 'hsl(var(--b5))' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono min-w-0" style={{ color: 'hsl(var(--c3))' }}>
            {event.start_date && <span className="truncate">{formatDate(event.start_date)}</span>}
            {event.series && (
              <>
                <span style={{ color: 'hsl(var(--c3) / 0.4)' }}>·</span>
                <span className="truncate" style={{ color: 'hsl(var(--h3))' }}>{event.series}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5 text-xs font-mono shrink-0" style={{ color: 'hsl(var(--c3))' }}>
            {event.total_duration > 0 && <span>{formatTotalDuration(event.total_duration)}</span>}
            {event.set_count > 0 && (
              <span className="font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>
                {event.set_count} {event.set_count === 1 ? 'set' : 'sets'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
})

EventCard.displayName = 'EventCard'

export function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setIsLoading(true)
    fetchEvents(debouncedSearch || undefined)
      .then((r) => setEvents(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [debouncedSearch])

  const totalSets = useMemo(() => events.reduce((sum, e) => sum + (e.set_count || 0), 0), [events])

  return (
    <div className="px-6 lg:px-10 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-[var(--font-weight-bold)] mb-1"
            style={{ color: 'hsl(var(--c1))' }}
          >
            Festivals & Events
          </h1>
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            {events.length > 0 ? `${events.length} events · ${totalSets} sets` : 'Major electronic music festivals and events'}
          </p>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'hsl(var(--c3))' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="pl-10 pr-4 py-2 rounded-lg text-sm w-full sm:w-64 focus:outline-none transition-all"
            style={{
              background: 'hsl(var(--b4) / 0.4)',
              color: 'hsl(var(--c1))',
              boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.3)',
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-[var(--card-radius)]" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card text-center py-20">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center"
            style={{
              background: 'hsl(var(--b4) / 0.3)',
              boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)',
            }}
          >
            <svg className="w-6 h-6" style={{ color: 'hsl(var(--c3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            {search ? `No events matching "${search}"` : 'No events yet. Events are created from the admin dashboard.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
