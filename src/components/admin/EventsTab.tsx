import { useState, useEffect } from 'react'
import { fetchEvents, fetchSets, createEventAdmin, updateEventAdmin, deleteEventAdmin, linkSetToEvent } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'

interface Event {
  id: string; name: string; slug: string; series: string | null; location: string | null;
  start_date: string | null; end_date: string | null; set_count: number; description: string | null; website: string | null;
}

export function EventsTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [linkingEvent, setLinkingEvent] = useState<string | null>(null)

  const loadEvents = () => {
    setIsLoading(true)
    fetchEvents().then((r) => setEvents(r.data)).catch(() => {}).finally(() => setIsLoading(false))
  }
  useEffect(() => { loadEvents() }, [])

  const handleDelete = async (id: string) => {
    await deleteEventAdmin(id); setEvents((p) => p.filter((e) => e.id !== id)); setConfirmDelete(null)
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>{events.length} events</p>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Create Event</Button>
      </div>

      {events.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>No events yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="card !p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-[var(--font-weight-medium)] truncate" style={{ color: 'hsl(var(--c1))' }}>{event.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {event.location && <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>{event.location}</span>}
                  {event.start_date && <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>{event.start_date}</span>}
                  {event.series && <Badge variant="muted">{event.series}</Badge>}
                </div>
              </div>
              <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>{event.set_count} sets</span>
              <div className="flex gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setLinkingEvent(event.id)}>Link Set</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingEvent(event)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(event.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && <EventFormModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadEvents() }} />}

      {/* Edit modal */}
      {editingEvent && <EventFormModal event={editingEvent} onClose={() => setEditingEvent(null)} onSaved={() => { setEditingEvent(null); loadEvents() }} />}

      {/* Delete confirm */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Event">
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>This will delete the event. Sets will be unlinked but not deleted.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)} className="flex-1">Delete</Button>
        </div>
      </Modal>

      {/* Link set modal */}
      {linkingEvent && <LinkSetModal eventId={linkingEvent} onClose={() => setLinkingEvent(null)} onLinked={() => { setLinkingEvent(null); loadEvents() }} />}
    </>
  )
}

function EventFormModal({ event, onClose, onSaved }: { event?: Event; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(event?.name || '')
  const [series, setSeries] = useState(event?.series || '')
  const [location, setLocation] = useState(event?.location || '')
  const [startDate, setStartDate] = useState(event?.start_date || '')
  const [endDate, setEndDate] = useState(event?.end_date || '')
  const [description, setDescription] = useState(event?.description || '')
  const [website, setWebsite] = useState(event?.website || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = { name: name.trim(), series: series.trim() || undefined, location: location.trim() || undefined, start_date: startDate || undefined, end_date: endDate || undefined, description: description.trim() || undefined, website: website.trim() || undefined }
      if (event) { await updateEventAdmin(event.id, data) }
      else { await createEventAdmin(data) }
      onSaved()
    } catch {} finally { setSaving(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title={event ? `Edit: ${event.name}` : 'Create Event'}>
      <div className="space-y-3">
        <Input label="Event Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tomorrowland 2025" />
        <Input label="Series" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="Tomorrowland" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Boom, Belgium" />
          <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">{saving ? 'Saving...' : event ? 'Save' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function LinkSetModal({ eventId, onClose, onLinked }: { eventId: string; onClose: () => void; onLinked: () => void }) {
  const [sets, setSets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)

  useEffect(() => {
    fetchSets({ pageSize: 50 }).then((r) => setSets(r.data)).catch(() => {}).finally(() => setIsLoading(false))
  }, [])

  const handleLink = async (setId: string) => {
    setLinking(setId)
    try { await linkSetToEvent(eventId, setId); onLinked() } catch {} finally { setLinking(null) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Link Set to Event">
      {isLoading ? <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Loading sets...</p> : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {sets.map((set) => (
            <button
              key={set.id}
              onClick={() => handleLink(set.id)}
              disabled={linking === set.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={{ color: 'hsl(var(--c2))' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--b3) / 0.4)'}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'hsl(var(--c1))' }}>{set.title}</p>
                <p className="text-xs truncate" style={{ color: 'hsl(var(--c3))' }}>{set.artist}</p>
              </div>
              {linking === set.id ? <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>Linking...</span> : (
                <svg className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--c3))' }} fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
