import { useState, useEffect, useMemo, memo, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { CalendarFilled } from '@mingcute/react/core-filled'
import { fetchEvents, getEventCoverUrl } from '../lib/api'
import { ContentCard, EmptyState, Input, Section, Skeleton, Toolbar } from '../components/bleh'
import { PageFrame } from '../components/shell'
import './library.css'

const SEARCH_DEBOUNCE_MS = 300
const SKELETON_COUNT = 9
const MAX_STAGGER = 12
const STAGGER_MS = 30

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
    <Link to={`/app/events/${event.slug || event.id}`} className="zl-event">
      <div className="zl-event-cover">
        {event.cover_image_r2_key ? (
          <img src={getEventCoverUrl(event.id)} alt="" loading="lazy" />
        ) : (
          <div className="zl-event-fallback" aria-hidden="true">{event.name?.charAt(0)}</div>
        )}
        {year && <span className="zl-event-year">{year}</span>}
        <div className="zl-event-head">
          <span className="zl-event-name">{event.name}</span>
          {event.location && <span className="zl-event-loc">{event.location}</span>}
        </div>
      </div>
      <div className="zl-event-foot">
        <div className="zl-event-meta">
          {event.start_date && <span>{formatDate(event.start_date)}</span>}
          {event.series && <span className="zl-event-series">{event.series}</span>}
        </div>
        <div className="zl-event-counts">
          {event.total_duration > 0 && <span>{formatTotalDuration(event.total_duration)}</span>}
          {event.set_count > 0 && (
            <strong>{event.set_count} {event.set_count === 1 ? 'set' : 'sets'}</strong>
          )}
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
    }, SEARCH_DEBOUNCE_MS)
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

  let body
  if (isLoading) {
    body = (
      <ul className="zl-tiles" role="status" aria-label="Loading events">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <li key={i} className="zl-tile-cell">
            <Skeleton height={230} borderRadius="var(--card-radius)" />
          </li>
        ))}
      </ul>
    )
  } else if (events.length === 0) {
    body = (
      <EmptyState
        icon={<CalendarFilled />}
        title="No events"
        description={search ? `No events matching "${search}"` : 'No events yet. Events are created from the admin dashboard.'}
      />
    )
  } else {
    body = (
      <ul className="zl-tiles">
        {events.map((event, i) => (
          <li
            key={event.id}
            className="zl-tile-cell animate-grid"
            style={{ '--delay': `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms` } as CSSProperties}
          >
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <PageFrame>
      <ContentCard
        toolbar={
          <Toolbar>
            <h1 className="zl-toolbar-title">Festivals &amp; events</h1>
            {events.length > 0 && (
              <span className="zl-toolbar-meta">{events.length} events · {totalSets} sets</span>
            )}
            <div className="cc-toolbar-fill" />
            <div className="zl-toolbar-trail">
              <Input
                type="search"
                className="zl-toolbar-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                aria-label="Search events"
              />
            </div>
          </Toolbar>
        }
        main={<Section>{body}</Section>}
      />
    </PageFrame>
  )
}
