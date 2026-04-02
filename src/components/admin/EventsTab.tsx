import { useState, useEffect, useMemo } from 'react'
import { fetchEvents, fetchSets, fetchEvent, createEventAdmin, updateEventAdmin, deleteEventAdmin, linkSetToEvent, unlinkSetFromEvent, uploadEventCoverAdmin, uploadEventLogoAdmin, getEventCoverUrl, getEventLogoUrl } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { parseEventSourceHtml, type Event1001Parsed } from '../../lib/parse-1001tracklists-source'

interface Event {
  id: string; name: string; slug: string; series: string | null; location: string | null;
  start_date: string | null; end_date: string | null; set_count: number; description: string | null;
  website: string | null; cover_image_r2_key: string | null; logo_r2_key: string | null;
  year?: number | null;
  source_1001_id?: string | null;
  facebook_url?: string | null; instagram_url?: string | null;
  youtube_url?: string | null; x_url?: string | null;
  aftermovie_url?: string | null;
}

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
                    {event.source_1001_id && (
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--h3) / 0.7)' }}>1001TL:{event.source_1001_id}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>{event.set_count} sets</span>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setLinkingEvent(event.id)}>Manage Sets</Button>
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

      {/* Link/unlink sets modal */}
      {linkingEvent && <LinkSetModal eventId={linkingEvent} onClose={() => setLinkingEvent(null)} onChanged={loadEvents} />}
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
  const [source1001Id, setSource1001Id] = useState(event?.source_1001_id || '')
  const [year, setYear] = useState(event?.year ? String(event.year) : '')

  // Social links (editable)
  const [facebookUrl, setFacebookUrl] = useState(event?.facebook_url || '')
  const [instagramUrl, setInstagramUrl] = useState(event?.instagram_url || '')
  const [youtubeUrl, setYoutubeUrl] = useState(event?.youtube_url || '')
  const [xUrl, setXUrl] = useState(event?.x_url || '')
  const [aftermovieUrl, setAftermovieUrl] = useState(event?.aftermovie_url || '')

  // 1001TL import (create mode only)
  const [importHtml, setImportHtml] = useState('')
  const [importParsed, setImportParsed] = useState<Event1001Parsed | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null) // from 1001TL parse

  const handleParse1001TL = () => {
    setImportError(null)
    setImportParsed(null)
    if (!importHtml.trim()) { setImportError('Paste the source page HTML first.'); return }
    try {
      const result = parseEventSourceHtml(importHtml)
      if (!result.name || result.name === 'Unknown Event') {
        setImportError('Could not find event name. Make sure you pasted the full source page HTML.')
        return
      }
      setImportParsed(result)
      // In edit mode: fill only empty fields. In create mode: always fill.
      const fillAlways = !event
      if ((fillAlways || !name) && result.name) setName(result.name)
      if ((fillAlways || !series) && result.series) setSeries(result.series)
      if ((fillAlways || !location) && result.location) setLocation(result.location)
      if ((fillAlways || !website) && result.website) setWebsite(result.website)
      if ((fillAlways || !coverImageUrl) && result.cover_image_url) setCoverImageUrl(result.cover_image_url)
      if ((fillAlways || !source1001Id) && result.source_id) setSource1001Id(result.source_id)
      if ((fillAlways || !facebookUrl) && result.facebook_url) setFacebookUrl(result.facebook_url)
      if ((fillAlways || !instagramUrl) && result.instagram_url) setInstagramUrl(result.instagram_url)
      if ((fillAlways || !youtubeUrl) && result.youtube_url) setYoutubeUrl(result.youtube_url)
      if ((fillAlways || !xUrl) && result.x_url) setXUrl(result.x_url)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Parse failed')
    }
  }

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
        year: year.trim() ? parseInt(year.trim()) : undefined,
        source_1001_id: source1001Id.trim() || undefined,
        facebook_url: facebookUrl.trim() || undefined,
        instagram_url: instagramUrl.trim() || undefined,
        youtube_url: youtubeUrl.trim() || undefined,
        x_url: xUrl.trim() || undefined,
        aftermovie_url: aftermovieUrl.trim() || undefined,
        // Pass CDN cover URL on create (backend will auto-fetch to R2)
        ...(!event && coverImageUrl ? { cover_image_url: coverImageUrl } : {}),
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

        {/* 1001TL Import/Enrich section — available in both create and edit */}
        <div className="rounded-lg overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.2)' }}>
          <button
            onClick={() => setImportHtml(importHtml || ' ')}
            className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer"
            style={{ background: 'hsl(var(--b5) / 0.4)' }}
          >
            <span className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c2))' }}>
              {event ? 'Enrich from 1001Tracklists' : 'Import from 1001Tracklists (optional)'}
            </span>
            <svg
              className="w-3.5 h-3.5 transition-transform"
              style={{ color: 'hsl(var(--c3))', transform: importHtml ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {importHtml !== '' && (
            <div className="px-3 pb-3 pt-2 space-y-2" style={{ background: 'hsl(var(--b5) / 0.2)' }}>
              <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
                Go to the event source page (e.g. <code className="font-mono">/source/u8bf5c/</code>), view page source, paste below.
                {event && ' Existing values are preserved — only empty fields will be filled.'}
              </p>
              <textarea
                value={importHtml === ' ' ? '' : importHtml}
                onChange={(e) => { setImportHtml(e.target.value); setImportParsed(null); setImportError(null) }}
                rows={3}
                placeholder="Paste source page HTML here..."
                className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-none focus:outline-none"
                style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
              />
              <Button variant="secondary" size="sm" onClick={handleParse1001TL} disabled={!importHtml.trim()}>
                Parse &amp; {event ? 'Fill Missing' : 'Autofill'}
              </Button>
              {importError && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{importError}</p>}
              {importParsed && (
                <div className="text-xs space-y-0.5" style={{ color: 'hsl(var(--c2))' }}>
                  <p>Parsed: <strong style={{ color: 'hsl(var(--c1))' }}>{importParsed.name}</strong></p>
                  {importParsed.source_id && <p>Source ID: <code className="font-mono">{importParsed.source_id}</code></p>}
                  {importParsed.tracklist_count && <p>{importParsed.tracklist_count.toLocaleString()} tracklists on 1001TL</p>}
                  {importParsed.cover_image_url && <p>Cover image: found {event ? '' : '(will be cached to R2)'}</p>}
                  {importParsed.website && <p>Website: {importParsed.website}</p>}
                  {(importParsed.facebook_url || importParsed.instagram_url || importParsed.youtube_url || importParsed.x_url) && (
                    <p>Social links: {[importParsed.facebook_url && 'Facebook', importParsed.instagram_url && 'Instagram', importParsed.youtube_url && 'YouTube', importParsed.x_url && 'X'].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="Series" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="Tomorrowland" />
          </div>
          <Input label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025" />
        </div>
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

        <Input
          label="1001Tracklists Source ID"
          value={source1001Id}
          onChange={(e) => setSource1001Id(e.target.value)}
          placeholder="e.g. u8bf5c (from /source/u8bf5c/)"
        />

        {/* Social links */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Facebook URL" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
          <Input label="Instagram URL" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
          <Input label="YouTube URL" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
          <Input label="X (Twitter) URL" value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="https://x.com/..." />
          <Input label="Aftermovie URL" value={aftermovieUrl} onChange={(e) => setAftermovieUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
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

function LinkSetModal({ eventId, onClose, onChanged }: { eventId: string; onClose: () => void; onChanged: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allSets, setAllSets] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [linkedSets, setLinkedSets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<'linked' | 'add'>('linked')

  const load = () => {
    Promise.all([
      fetchSets({ pageSize: 200 }),
      fetchEvent(eventId),
    ]).then(([allRes, eventRes]) => {
      setAllSets(allRes.data)
      setLinkedSets(eventRes.data?.sets || [])
    }).catch(() => {}).finally(() => setIsLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [eventId])

  const linkedIds = new Set(linkedSets.map((s: any) => s.id))
  const unlinkedSets = allSets.filter((s) => !linkedIds.has(s.id))

  const filteredLinked = linkedSets.filter((s: any) =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredUnlinked = unlinkedSets.filter((s) =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase())
  )

  const handleLink = async (setId: string) => {
    setWorking(setId)
    try { await linkSetToEvent(eventId, setId); onChanged(); load() } catch { /* ignore */ } finally { setWorking(null) }
  }

  const handleUnlink = async (setId: string) => {
    setWorking(setId)
    try { await unlinkSetFromEvent(eventId, setId); onChanged(); load() } catch { /* ignore */ } finally { setWorking(null) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Manage Linked Sets">
      <div className="space-y-3">
        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sets..."
          className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-text-muted focus:outline-none"
          style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px hsl(var(--h3) / 0.5)' }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        />

        {/* Section toggle */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'hsl(var(--b4) / 0.3)' }}>
          {(['linked', 'add'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all border-none cursor-pointer"
              style={{
                background: activeSection === section ? 'hsl(var(--b3))' : 'transparent',
                color: activeSection === section ? 'hsl(var(--c1))' : 'hsl(var(--c3))',
              }}
            >
              {section === 'linked' ? `Linked (${linkedSets.length})` : `Add Sets (${unlinkedSets.length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm py-4 text-center" style={{ color: 'hsl(var(--c3))' }}>Loading...</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {activeSection === 'linked' && (
              <>
                {filteredLinked.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'hsl(var(--c3))' }}>
                    {search ? 'No linked sets match.' : 'No sets linked yet.'}
                  </p>
                ) : filteredLinked.map((set: any) => (
                  <div key={set.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'hsl(var(--b4) / 0.2)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'hsl(var(--c1))' }}>{set.title}</p>
                      <p className="text-xs truncate" style={{ color: 'hsl(var(--c3))' }}>{set.artist}</p>
                    </div>
                    <button
                      onClick={() => handleUnlink(set.id)}
                      disabled={working === set.id}
                      className="shrink-0 px-2 py-1 rounded-md text-xs transition-colors border-none cursor-pointer"
                      style={{ background: 'hsl(0 60% 50% / 0.15)', color: 'hsl(0 60% 65%)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 60% 50% / 0.25)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 60% 50% / 0.15)' }}
                    >
                      {working === set.id ? '...' : 'Unlink'}
                    </button>
                  </div>
                ))}
              </>
            )}

            {activeSection === 'add' && (
              <>
                {filteredUnlinked.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'hsl(var(--c3))' }}>
                    {search ? 'No sets match.' : 'All sets are already linked.'}
                  </p>
                ) : filteredUnlinked.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => handleLink(set.id)}
                    disabled={working === set.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border-none cursor-pointer"
                    style={{ color: 'hsl(var(--c2))' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--b3) / 0.4)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'hsl(var(--c1))' }}>{set.title}</p>
                      <p className="text-xs truncate" style={{ color: 'hsl(var(--c3))' }}>{set.artist}</p>
                    </div>
                    {working === set.id ? (
                      <span className="text-xs shrink-0" style={{ color: 'hsl(var(--c3))' }}>Linking...</span>
                    ) : (
                      <svg className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--c3))' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
