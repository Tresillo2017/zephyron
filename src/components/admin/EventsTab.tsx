import { useState, useEffect, useMemo } from 'react'
import { fetchEvents, deleteEventAdmin, getEventCoverUrl } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import type { Event } from './eventTypes'
import { EventFormModal } from './EventFormModal'
import { LinkSetModal } from './LinkSetModal'
import { ImportSetsModal } from './ImportSetsModal'

/** Extract year from DB year column, start_date, or event name (fallback) */
function getEventYear(event: Event): string | null {
  if (event.year) return String(event.year)
  if (event.start_date) {
    const match = event.start_date.match(/^(\d{4})/)
    if (match) return match[1]
  }
  const nameMatch = event.name.match(/\b(20\d{2})\b/)
  return nameMatch ? nameMatch[1] : null
}

export function EventsTab({ editId }: { editId?: string } = {}) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [linkingEvent, setLinkingEvent] = useState<string | null>(null)
  const [importingEvent, setImportingEvent] = useState<Event | null>(null)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadEvents = () => {
    setIsLoading(true)
    fetchEvents().then((r) => setEvents(r.data)).catch(() => {}).finally(() => setIsLoading(false))
  }
   
  useEffect(() => { loadEvents() }, [])

  // Auto-open edit modal when editId is provided via URL
  useEffect(() => {
    if (editId && events.length > 0 && !editingEvent) {
      const match = events.find((e) => e.id === editId)
      if (match) setEditingEvent(match)
    }
  }, [editId, events, editingEvent])

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      (e.series || '').toLowerCase().includes(q) ||
      (e.location || '').toLowerCase().includes(q)
    )
  }, [events, search])

  const handleDelete = async (id: string) => {
    await deleteEventAdmin(id); setEvents((p) => p.filter((e) => e.id !== id)); setConfirmDelete(null)
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />

  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-4">
        <p className="text-sm shrink-0" style={{ color: 'oklch(var(--c3))' }}>{filtered.length} event{filtered.length !== 1 ? 's' : ''}</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm placeholder:text-text-muted focus:outline-none transition-all duration-200"
          style={{
            background: 'oklch(var(--b4) / 0.4)',
            color: 'oklch(var(--c1))',
          }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px oklch(var(--h3) / 0.5)' }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        />
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid oklch(var(--b4) / 0.4)' }}>
          <button
            onClick={() => setViewMode('list')}
            className="px-2.5 py-1.5 transition-all"
            style={{
              background: viewMode === 'list' ? 'oklch(var(--h3) / 0.15)' : 'transparent',
              color: viewMode === 'list' ? 'oklch(var(--h3))' : 'oklch(var(--c3))',
            }}
            title="List view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className="px-2.5 py-1.5 transition-all"
            style={{
              background: viewMode === 'grid' ? 'oklch(var(--h3) / 0.15)' : 'transparent',
              color: viewMode === 'grid' ? 'oklch(var(--h3))' : 'oklch(var(--c3))',
            }}
            title="Grid view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Create Event</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm" style={{ color: 'oklch(var(--c3))' }}>
            {search ? 'No events match your search.' : 'No events yet.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map((event) => {
            const year = getEventYear(event)
            return (
              <div key={event.id} className="card !p-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div
                  className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ background: 'oklch(var(--b4))', boxShadow: 'var(--card-border)' }}
                >
                  {event.cover_image_r2_key ? (
                    <img src={`${getEventCoverUrl(event.id)}?v=${refreshKey}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-base font-[var(--font-weight-bold)]" style={{ color: 'oklch(var(--c3) / 0.4)' }}>
                      {event.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-[var(--font-weight-medium)] truncate" style={{ color: 'oklch(var(--c1))' }}>{event.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {event.location && <span className="text-xs" style={{ color: 'oklch(var(--c3))' }}>{event.location}</span>}
                    {year && <span className="text-[10px] font-mono px-1.5 py-0 rounded" style={{ color: 'oklch(var(--h3))', background: 'oklch(var(--h3) / 0.1)' }}>{year}</span>}
                    {event.series && <Badge variant="muted">{event.series}</Badge>}
                    {event.source_1001_id && (
                      <span className="text-xs font-mono" style={{ color: 'oklch(var(--h3) / 0.7)' }}>1001TL:{event.source_1001_id}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-mono" style={{ color: 'oklch(var(--c3))' }}>{event.set_count} sets</span>
                <div className="flex gap-1.5 shrink-0">
                  {event.source_1001_id && (
                    <Button variant="ghost" size="sm" onClick={() => setImportingEvent(event)}>Import Sets</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setLinkingEvent(event.id)}>Manage Sets</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingEvent(event)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(event.id)}>Delete</Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((event) => {
            const year = getEventYear(event)
            return (
              <div key={event.id} className="card !p-4">
                {/* Cover image */}
                <div
                  className="aspect-video rounded-lg overflow-hidden mb-3 flex items-center justify-center"
                  style={{ background: 'oklch(var(--b4))', boxShadow: 'var(--card-border)' }}
                >
                  {event.cover_image_r2_key ? (
                    <img src={`${getEventCoverUrl(event.id)}?v=${refreshKey}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-4xl font-[var(--font-weight-bold)]" style={{ color: 'oklch(var(--c3) / 0.4)' }}>
                      {event.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-sm font-[var(--font-weight-medium)] truncate mb-2" style={{ color: 'oklch(var(--c1))' }}>
                  {event.name}
                </h3>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {event.location && (
                    <span className="text-xs" style={{ color: 'oklch(var(--c3))' }}>{event.location}</span>
                  )}
                  {year && (
                    <span className="text-[10px] font-mono px-1.5 py-0 rounded" style={{ color: 'oklch(var(--h3))', background: 'oklch(var(--h3) / 0.1)' }}>
                      {year}
                    </span>
                  )}
                  {event.series && <Badge variant="muted">{event.series}</Badge>}
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'oklch(var(--c3))' }}>
                    {event.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span className="font-mono" style={{ color: 'oklch(var(--c3))' }}>
                    {event.set_count} set{event.set_count !== 1 ? 's' : ''}
                  </span>
                  {event.source_1001_id && (
                    <span className="font-mono" style={{ color: 'oklch(var(--h3) / 0.7)' }}>
                      1001TL:{event.source_1001_id}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-1.5">
                  {event.source_1001_id && (
                    <Button variant="secondary" size="sm" onClick={() => setImportingEvent(event)} className="w-full">
                      Import Sets
                    </Button>
                  )}
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setLinkingEvent(event.id)} className="flex-1">
                      Manage
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingEvent(event)} className="flex-1">
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(event.id)} className="flex-1">
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && <EventFormModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); setRefreshKey((k) => k + 1); loadEvents() }} />}

      {/* Edit modal */}
      {editingEvent && <EventFormModal event={editingEvent} onClose={() => setEditingEvent(null)} onSaved={() => { setEditingEvent(null); setRefreshKey((k) => k + 1); loadEvents() }} />}

      {/* Delete confirm */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Event">
        <p className="text-sm mb-4" style={{ color: 'oklch(var(--c2))' }}>This will delete the event. Sets will be unlinked but not deleted.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)} className="flex-1">Delete</Button>
        </div>
      </Modal>

      {/* Link/unlink sets modal */}
      {linkingEvent && <LinkSetModal eventId={linkingEvent} onClose={() => setLinkingEvent(null)} onChanged={loadEvents} />}

      {/* Import sets from 1001TL modal */}
      {importingEvent && (
        <ImportSetsModal
          event={importingEvent}
          onClose={() => setImportingEvent(null)}
          onImported={() => { setImportingEvent(null); loadEvents() }}
        />
      )}
    </>
  )
}
