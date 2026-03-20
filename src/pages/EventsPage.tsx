import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { fetchEvents, getEventCoverUrl } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'

export function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setIsLoading(true)
    fetchEvents(search || undefined)
      .then((r) => setEvents(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [search])

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono tracking-wider" style={{ color: 'hsl(var(--h3))' }}>EVENTS</p>
          <h1 className="text-xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>Festivals & Events</h1>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="px-4 py-2 rounded-[var(--button-radius)] text-sm w-64"
          style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            {search ? `No events matching "${search}"` : 'No events yet. Events are created from the admin dashboard.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/app/events/${event.slug || event.id}`}
              className="group no-underline block overflow-hidden rounded-[var(--card-radius)]"
              style={{ boxShadow: 'var(--card-border), var(--card-shadow)' }}
            >
              {/* Cover image */}
              <div className="relative h-40 overflow-hidden" style={{ background: 'hsl(var(--b4))' }}>
                {event.cover_image_r2_key ? (
                  <img src={getEventCoverUrl(event.id)} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--h3) / 0.15), hsl(var(--b4)))' }}>
                    <span className="text-3xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3) / 0.3)' }}>{event.name?.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-base font-[var(--font-weight-bold)] text-white truncate">{event.name}</h3>
                  {event.location && <p className="text-xs text-white/70 truncate">{event.location}</p>}
                </div>
              </div>
              {/* Info */}
              <div className="px-4 py-3" style={{ background: 'hsl(var(--b5))' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>
                    {event.start_date && <span>{event.start_date}</span>}
                    {event.series && <span style={{ color: 'hsl(var(--h3))' }}>{event.series}</span>}
                  </div>
                  {event.set_count > 0 && (
                    <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>{event.set_count} sets</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
