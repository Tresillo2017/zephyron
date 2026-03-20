import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { fetchEvent, getEventCoverUrl } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { SetGrid } from '../components/sets/SetGrid'

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

  return (
    <div>
      {/* Banner */}
      <div className="relative h-[280px] overflow-hidden">
        {event.cover_image_r2_key ? (
          <img src={getEventCoverUrl(event.id)} alt="" className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full" style={{ background: 'hsl(var(--b5))' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--b6)), hsl(var(--b6) / 0.3), transparent)' }} />
      </div>

      {/* Header */}
      <div className="relative -mt-[100px] z-10 px-6 lg:px-10">
        <p className="text-sm banner-text mb-1" style={{ color: 'hsl(var(--c2))' }}>Event</p>
        <h1 className="text-3xl sm:text-4xl font-[var(--font-weight-bold)] banner-text mb-3" style={{ color: 'hsl(var(--c1))' }}>{event.name}</h1>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          {event.location && <span className="text-sm" style={{ color: 'hsl(var(--c2))' }}>{event.location}</span>}
          {event.start_date && (
            <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>
              {event.start_date}{event.end_date && ` — ${event.end_date}`}
            </span>
          )}
          {event.series && <Badge variant="accent">{event.series}</Badge>}
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {tags.map((tag: string) => <Badge key={tag} variant="tag">{tag}</Badge>)}
          </div>
        )}
        {event.website && (
          <a href={event.website} target="_blank" rel="noopener noreferrer" className="text-xs no-underline inline-flex items-center gap-1" style={{ color: 'hsl(var(--h3))' }}>
            Visit website
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        )}
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
            {event.description && (
              <div className="card">
                <h3 className="text-xs mb-3" style={{ color: 'hsl(var(--c3))' }}>About</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--c2))' }}>{event.description}</p>
              </div>
            )}
            <div className="card">
              <div className="space-y-3">
                {event.location && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Location</span>
                    <span className="text-sm" style={{ color: 'hsl(var(--c1))' }}>{event.location}</span>
                  </div>
                )}
                {event.series && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Series</span>
                    <span className="text-sm" style={{ color: 'hsl(var(--c1))' }}>{event.series}</span>
                  </div>
                )}
                {sets.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Sets</span>
                    <span className="text-sm font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--h3))' }}>{sets.length}</span>
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
