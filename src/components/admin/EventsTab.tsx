import { useState, useEffect, useMemo } from 'react'
import { fetchEvents, fetchSets, createEventAdmin, updateEventAdmin, deleteEventAdmin, linkSetToEvent, uploadEventCoverAdmin, uploadEventLogoAdmin, getEventCoverUrl, getEventLogoUrl } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'

interface Event {
  id: string; name: string; slug: string; series: string | null; location: string | null;
  start_date: string | null; end_date: string | null; set_count: number; description: string | null;
  website: string | null; cover_image_r2_key: string | null; logo_r2_key: string | null;
}

/** Extract year from start_date or event name */
function getEventYear(event: Event): string | null {
  if (event.start_date) {
    const match = event.start_date.match(/^(\d{4})/)
    if (match) return match[1]
  }
  const nameMatch = event.name.match(/\b(20\d{2})\b/)
  return nameMatch ? nameMatch[1] : null
}

export function EventsTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [linkingEvent, setLinkingEvent] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadEvents = () => {
    setIsLoading(true)
    fetchEvents().then((r) => setEvents(r.data)).catch(() => {}).finally(() => setIsLoading(false))
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadEvents() }, [])

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
        <p className="text-sm shrink-0" style={{ color: 'hsl(var(--c3))' }}>{filtered.length} event{filtered.length !== 1 ? 's' : ''}</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm placeholder:text-text-muted focus:outline-none transition-all duration-200"
          style={{
            background: 'hsl(var(--b4) / 0.4)',
            color: 'hsl(var(--c1))',
          }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px hsl(var(--h3) / 0.5)' }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        />
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Create Event</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            {search ? 'No events match your search.' : 'No events yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => {
            const year = getEventYear(event)
            return (
              <div key={event.id} className="card !p-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div
                  className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ background: 'hsl(var(--b4))', boxShadow: 'var(--card-border)' }}
                >
                  {event.cover_image_r2_key ? (
                    <img src={`${getEventCoverUrl(event.id)}?v=${refreshKey}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-base font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3) / 0.4)' }}>
                      {event.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-[var(--font-weight-medium)] truncate" style={{ color: 'hsl(var(--c1))' }}>{event.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {event.location && <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>{event.location}</span>}
                    {year && <span className="text-[10px] font-mono px-1.5 py-0 rounded" style={{ color: 'hsl(var(--h3))', background: 'hsl(var(--h3) / 0.1)' }}>{year}</span>}
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

  // Logo (square)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    event?.logo_r2_key ? getEventLogoUrl(event.id) : null
  )

  // Cover (wide background)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(
    event?.cover_image_r2_key ? getEventCoverUrl(event.id) : null
  )

  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const handleFileSelect = (setter: (f: File) => void, previewSetter: (url: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setter(file)
    const reader = new FileReader()
    reader.onloadend = () => previewSetter(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        series: series.trim() || undefined,
        location: location.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        description: description.trim() || undefined,
        website: website.trim() || undefined,
      }

      let eventId = event?.id
      if (event) {
        await updateEventAdmin(event.id, data)
      } else {
        const res = await createEventAdmin(data)
        eventId = res.data.id
      }

      // Upload images
      if (eventId) {
        if (logoFile) {
          setUploadProgress('Uploading logo...')
          try { await uploadEventLogoAdmin(eventId, logoFile) } catch (err) { console.error('Logo upload failed:', err) }
        }
        if (coverFile) {
          setUploadProgress('Uploading cover...')
          try { await uploadEventCoverAdmin(eventId, coverFile) } catch (err) { console.error('Cover upload failed:', err) }
        }
        setUploadProgress(null)
      }

      onSaved()
    } catch { /* ignore */ } finally {
      setSaving(false)
      setUploadProgress(null)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={event ? `Edit: ${event.name}` : 'Create Event'}>
      <div className="space-y-3">
        {/* Images: Logo + Cover side by side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Logo upload (square) */}
          <div>
            <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>
              Logo <span className="text-[10px] font-normal" style={{ color: 'hsl(var(--c3))' }}>(square)</span>
            </label>
            <div
              className="w-full aspect-square rounded-xl overflow-hidden mb-2 flex items-center justify-center cursor-pointer relative group"
              style={{ background: 'hsl(var(--b4))', boxShadow: 'var(--card-border)' }}
              onClick={() => document.getElementById('logo-input')?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6" style={{ color: 'hsl(var(--c3) / 0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-[10px]" style={{ color: 'hsl(var(--c3) / 0.4)' }}>Upload logo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs text-white/80">Change</span>
              </div>
            </div>
            <input
              id="logo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect(setLogoFile, setLogoPreview)}
              className="hidden"
            />
            {logoFile && <p className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>{logoFile.name}</p>}
          </div>

          {/* Cover upload (wide) */}
          <div>
            <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>
              Cover <span className="text-[10px] font-normal" style={{ color: 'hsl(var(--c3))' }}>(background)</span>
            </label>
            <div
              className="w-full aspect-square rounded-xl overflow-hidden mb-2 flex items-center justify-center cursor-pointer relative group"
              style={{ background: 'hsl(var(--b4))', boxShadow: 'var(--card-border)' }}
              onClick={() => document.getElementById('cover-input')?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6" style={{ color: 'hsl(var(--c3) / 0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <span className="text-[10px]" style={{ color: 'hsl(var(--c3) / 0.4)' }}>Upload cover</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs text-white/80">Change</span>
              </div>
            </div>
            <input
              id="cover-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect(setCoverFile, setCoverPreview)}
              className="hidden"
            />
            {coverFile && <p className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>{coverFile.name}</p>}
          </div>
        </div>

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
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none" style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }} />
        </div>

        {uploadProgress && (
          <p className="text-xs animate-pulse" style={{ color: 'hsl(var(--h3))' }}>{uploadProgress}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">{saving ? 'Saving...' : event ? 'Save' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function LinkSetModal({ eventId, onClose, onLinked }: { eventId: string; onClose: () => void; onLinked: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sets, setSets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)

  useEffect(() => {
    fetchSets({ pageSize: 50 }).then((r) => setSets(r.data)).catch(() => {}).finally(() => setIsLoading(false))
  }, [])

  const handleLink = async (setId: string) => {
    setLinking(setId)
    try { await linkSetToEvent(eventId, setId); onLinked() } catch { /* ignore */ } finally { setLinking(null) }
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
