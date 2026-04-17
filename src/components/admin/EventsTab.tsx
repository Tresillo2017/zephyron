import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { fetchEvents, fetchSets, fetchEvent, createEventAdmin, updateEventAdmin, deleteEventAdmin, linkSetToEvent, unlinkSetFromEvent, uploadEventCoverAdmin, uploadEventLogoAdmin, getEventCoverUrl, getEventLogoUrl, fetchEvent1001Sets, adminCreateSet, fetch1001Tracklists, import1001Tracklists, fetchArtists, createArtistAdmin } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { parseEventSourceHtml, parse1001EventSetsHtml, type Event1001Parsed, type EventSetEntry } from '../../lib/parse-1001tracklists-source'

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
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--b4) / 0.4)' }}>
          <button
            onClick={() => setViewMode('list')}
            className="px-2.5 py-1.5 transition-all"
            style={{
              background: viewMode === 'list' ? 'hsl(var(--h3) / 0.15)' : 'transparent',
              color: viewMode === 'list' ? 'hsl(var(--h3))' : 'hsl(var(--c3))',
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
              background: viewMode === 'grid' ? 'hsl(var(--h3) / 0.15)' : 'transparent',
              color: viewMode === 'grid' ? 'hsl(var(--h3))' : 'hsl(var(--c3))',
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
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
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
                  style={{ background: 'hsl(var(--b4))', boxShadow: 'var(--card-border)' }}
                >
                  {event.cover_image_r2_key ? (
                    <img src={`${getEventCoverUrl(event.id)}?v=${refreshKey}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-4xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3) / 0.4)' }}>
                      {event.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-sm font-[var(--font-weight-medium)] truncate mb-2" style={{ color: 'hsl(var(--c1))' }}>
                  {event.name}
                </h3>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {event.location && (
                    <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>{event.location}</span>
                  )}
                  {year && (
                    <span className="text-[10px] font-mono px-1.5 py-0 rounded" style={{ color: 'hsl(var(--h3))', background: 'hsl(var(--h3) / 0.1)' }}>
                      {year}
                    </span>
                  )}
                  {event.series && <Badge variant="muted">{event.series}</Badge>}
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'hsl(var(--c3))' }}>
                    {event.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span className="font-mono" style={{ color: 'hsl(var(--c3))' }}>
                    {event.set_count} set{event.set_count !== 1 ? 's' : ''}
                  </span>
                  {event.source_1001_id && (
                    <span className="font-mono" style={{ color: 'hsl(var(--h3) / 0.7)' }}>
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
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>This will delete the event. Sets will be unlinked but not deleted.</p>
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

// ═══════════════════════════════════════════
// Import Sets from 1001Tracklists modal
// ═══════════════════════════════════════════

type ImportStatus = 'idle' | 'fetching' | 'parsed' | 'importing'
type SetImportState = 'pending' | 'creating' | 'linking' | 'fetching_tl' | 'importing_tl' | 'done' | 'error'

interface ImportableSet extends EventSetEntry {
  selected: boolean
  importState: SetImportState
  importError?: string
}

function ImportSetsModal({ event, onClose, onImported }: { event: Event; onClose: () => void; onImported: () => void }) {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [entries, setEntries] = useState<ImportableSet[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [manualHtml, setManualHtml] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)
  const abortRef = useRef(false)

  // Show manual paste immediately — event source pages are Turnstile-protected
  // so auto-fetch is attempted as a bonus, not the primary path
  useEffect(() => {
    setShowManual(true)
    if (event.source_1001_id) {
      autoFetch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const autoFetch = useCallback(async () => {
    setStatus('fetching')
    setFetchError(null)
    try {
      const res = await fetchEvent1001Sets(event.id)
      if (res.ok && res.data.html) {
        parseHtml(res.data.html)
        setShowManual(false)
      } else {
        setFetchError(res.error || 'Auto-fetch blocked by Turnstile. Use manual paste below.')
        setStatus('idle')
      }
    } catch (err) {
      setFetchError(`Auto-fetch blocked: ${err instanceof Error ? err.message : String(err)}`)
      setStatus('idle')
    }
  }, [event.id])

  const parseHtml = useCallback((html: string) => {
    try {
      const parsed = parse1001EventSetsHtml(html)
      if (parsed.length === 0) {
        setFetchError('No set entries found in the HTML. Make sure you pasted the full event source page.')
        setStatus('idle')
        return
      }
      setEntries(parsed.map((e) => ({ ...e, selected: true, importState: 'pending' as SetImportState })))
      setStatus('parsed')
      setFetchError(null)
    } catch (err) {
      setFetchError(`Parse failed: ${err instanceof Error ? err.message : String(err)}`)
      setStatus('idle')
    }
  }, [])

  const handleManualParse = () => {
    if (!manualHtml.trim()) return
    parseHtml(manualHtml)
  }

  const toggleSelect = (idx: number) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e))
  }

  const toggleAll = () => {
    const allSelected = entries.every((e) => e.selected)
    setEntries((prev) => prev.map((e) => ({ ...e, selected: !allSelected })))
  }

  const selectedCount = entries.filter((e) => e.selected).length

  // Resolve or create artist by name
  const resolveArtist = async (name: string): Promise<string | null> => {
    try {
      const res = await fetchArtists(name)
      const exact = res.data.find((a: { name: string }) => a.name.toLowerCase() === name.toLowerCase())
      if (exact) return exact.id

      // Create new artist
      const createRes = await createArtistAdmin({ name })
      return createRes.data?.id || null
    } catch {
      return null
    }
  }

  const handleImport = async () => {
    const toImport = entries.filter((e) => e.selected && e.importState !== 'done')
    if (toImport.length === 0) return

    setStatus('importing')
    setImportProgress({ current: 0, total: toImport.length })
    abortRef.current = false

    for (let i = 0; i < toImport.length; i++) {
      if (abortRef.current) break

      const entry = toImport[i]
      const entryIdx = entries.findIndex((e) => e.tracklist_id === entry.tracklist_id)
      setImportProgress({ current: i + 1, total: toImport.length })

      try {
        // Step 1: Create the set
        updateEntryState(entryIdx, 'creating')

        const artistId = await resolveArtist(entry.artist)
        const tlUrl = `https://www.1001tracklists.com${entry.tracklist_url}`

        const setRes = await adminCreateSet({
          title: entry.title,
          artist: entry.artist,
          genre: entry.genre,
          duration_seconds: (entry.duration_minutes || 60) * 60,
          recorded_date: entry.date,
          tracklist_1001_url: tlUrl,
          event_id: event.id,
          ...(artistId ? { artist_id: artistId } : {}),
        })

        const setId = setRes.data.id

        // Step 2: Link to event
        updateEntryState(entryIdx, 'linking')
        await linkSetToEvent(event.id, setId)

        // Step 3: Try to fetch tracklist from 1001TL
        updateEntryState(entryIdx, 'fetching_tl')
        try {
          const tlRes = await fetch1001Tracklists(setId)
          if (tlRes.data?.tracks?.length > 0) {
            // Step 4: Import tracks
            updateEntryState(entryIdx, 'importing_tl')
            await import1001Tracklists(setId, tlRes.data.tracks)
          }
        } catch {
          // Tracklist fetch failed — set is still created, just no tracks
          console.warn(`[ImportSets] Tracklist fetch failed for ${entry.tracklist_id}`)
        }

        updateEntryState(entryIdx, 'done')
      } catch (err) {
        updateEntryState(entryIdx, 'error', err instanceof Error ? err.message : 'Import failed')
      }
    }

    setStatus('parsed')
    setImportProgress(null)
  }

  const updateEntryState = (idx: number, state: SetImportState, error?: string) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, importState: state, importError: error } : e))
  }

  const doneCount = entries.filter((e) => e.importState === 'done').length
  const errorCount = entries.filter((e) => e.importState === 'error').length
  const remainingSelected = entries.filter((e) => e.selected && e.importState !== 'done').length

  return (
    <Modal isOpen onClose={onClose} title={`Import Sets — ${event.name}`} className="!max-w-3xl">
      <div className="space-y-3">
        {/* Fetch status / error */}
        {status === 'fetching' && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'hsl(var(--h3) / 0.3)', borderTopColor: 'hsl(var(--h3))' }} />
            <span className="text-sm" style={{ color: 'hsl(var(--c2))' }}>Fetching event page from 1001Tracklists...</span>
          </div>
        )}

        {fetchError && (
          <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'hsl(0 60% 50% / 0.1)', color: 'hsl(0, 60%, 65%)' }}>
            {fetchError}
          </div>
        )}

        {/* Manual paste */}
        {showManual && status !== 'fetching' && status !== 'importing' && status !== 'parsed' && (
          <div className="space-y-2">
            <div className="px-3 py-2.5 rounded-lg space-y-1.5" style={{ background: 'hsl(var(--b4) / 0.2)' }}>
              <p className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>
                How to get the full page source:
              </p>
              <ol className="text-[11px] space-y-1 list-decimal list-inside" style={{ color: 'hsl(var(--c2))' }}>
                <li>
                  Go to{' '}
                  <code className="font-mono text-[10px] px-1 py-0.5 rounded" style={{ color: 'hsl(var(--h3))', background: 'hsl(var(--h3) / 0.08)' }}>
                    1001tracklists.com/source/{event.source_1001_id || '...'}/
                  </code>
                </li>
                <li>Scroll down until all sets are loaded (click "Show More" if needed)</li>
                <li>
                  Open browser console (<kbd className="font-mono text-[10px] px-1 py-0.5 rounded" style={{ background: 'hsl(var(--b3) / 0.5)' }}>F12</kbd> {'>'} Console) and run:{' '}
                  <code className="font-mono text-[10px] px-1 py-0.5 rounded select-all" style={{ color: 'hsl(var(--h3))', background: 'hsl(var(--h3) / 0.08)' }}>
                    copy(document.documentElement.outerHTML)
                  </code>
                </li>
                <li>Paste below (the full page with all sets will be in your clipboard)</li>
              </ol>
              <p className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>
                Note: "View Page Source" (Ctrl+U) only gets the first ~14 sets. The console method above gets all of them.
              </p>
            </div>
            <textarea
              value={manualHtml}
              onChange={(e) => setManualHtml(e.target.value)}
              rows={4}
              placeholder="Paste event source page HTML..."
              className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-none focus:outline-none"
              style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleManualParse} disabled={!manualHtml.trim()}>
                Parse HTML
              </Button>
              {event.source_1001_id && (
                <Button variant="ghost" size="sm" onClick={autoFetch}>
                  Retry auto-fetch
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Parsed entries table */}
        {status !== 'idle' && status !== 'fetching' && entries.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>
                  {entries.length} sets found
                </span>
                {doneCount > 0 && (
                  <Badge variant="accent">{doneCount} imported</Badge>
                )}
                {errorCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(0 60% 50% / 0.15)', color: 'hsl(0 60% 65%)' }}>
                    {errorCount} failed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {status !== 'importing' && (
                  <>
                    <button
                      onClick={() => { setEntries([]); setStatus('idle'); setShowManual(true); setManualHtml('') }}
                      className="text-xs border-none cursor-pointer px-2 py-1 rounded-md transition-colors"
                      style={{ color: 'hsl(var(--c3))', background: 'hsl(var(--b4) / 0.2)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--b4) / 0.35)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--b4) / 0.2)' }}
                    >
                      Re-paste
                    </button>
                    <button
                      onClick={toggleAll}
                      className="text-xs border-none cursor-pointer px-2 py-1 rounded-md transition-colors"
                      style={{ color: 'hsl(var(--h3))', background: 'hsl(var(--h3) / 0.08)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--h3) / 0.15)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--h3) / 0.08)' }}
                    >
                      {entries.every((e) => e.selected) ? 'Deselect all' : 'Select all'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
              {entries.map((entry, idx) => (
                <div
                  key={entry.tracklist_id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors"
                  style={{
                    background: entry.importState === 'done' ? 'hsl(120 40% 40% / 0.08)'
                      : entry.importState === 'error' ? 'hsl(0 60% 50% / 0.06)'
                      : entry.selected ? 'hsl(var(--b4) / 0.15)' : 'transparent',
                    opacity: entry.importState === 'done' ? 0.6 : 1,
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(idx)}
                    disabled={entry.importState === 'done' || status === 'importing'}
                    className="w-4 h-4 rounded shrink-0 flex items-center justify-center border-none cursor-pointer transition-colors"
                    style={{
                      background: entry.selected ? 'hsl(var(--h3))' : 'hsl(var(--b4) / 0.4)',
                      boxShadow: entry.selected ? 'none' : 'inset 0 0 0 1px hsl(var(--b3) / 0.4)',
                    }}
                  >
                    {entry.selected && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-[var(--font-weight-medium)] truncate" style={{ color: 'hsl(var(--c1))' }}>
                      {entry.artist}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {entry.stage && (
                        <span className="text-[10px] truncate" style={{ color: 'hsl(var(--c3))' }}>@ {entry.stage}</span>
                      )}
                      {entry.date && (
                        <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--c3) / 0.6)' }}>{entry.date}</span>
                      )}
                      {entry.genre && (
                        <span className="text-[9px] font-mono px-1 py-0 rounded" style={{ color: 'hsl(var(--h3) / 0.7)', background: 'hsl(var(--h3) / 0.08)' }}>
                          {entry.genre}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.duration_minutes && (
                      <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--c3))' }}>
                        {entry.duration_minutes >= 60 ? `${Math.floor(entry.duration_minutes / 60)}h${entry.duration_minutes % 60 > 0 ? `${entry.duration_minutes % 60}m` : ''}` : `${entry.duration_minutes}m`}
                      </span>
                    )}
                    {entry.tracks_total && (
                      <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--c3))' }}>
                        {entry.tracks_identified !== undefined ? `${entry.tracks_identified}/${entry.tracks_total}` : entry.tracks_total} tracks
                      </span>
                    )}
                    {entry.has_video && (
                      <svg className="w-3 h-3" style={{ color: 'hsl(var(--c3) / 0.5)' }} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                    )}
                  </div>

                  {/* Import state indicator */}
                  <div className="w-16 text-right shrink-0">
                    {entry.importState === 'creating' && (
                      <span className="text-[10px] animate-pulse" style={{ color: 'hsl(var(--h3))' }}>Creating...</span>
                    )}
                    {entry.importState === 'linking' && (
                      <span className="text-[10px] animate-pulse" style={{ color: 'hsl(var(--h3))' }}>Linking...</span>
                    )}
                    {entry.importState === 'fetching_tl' && (
                      <span className="text-[10px] animate-pulse" style={{ color: 'hsl(var(--h3))' }}>Tracks...</span>
                    )}
                    {entry.importState === 'importing_tl' && (
                      <span className="text-[10px] animate-pulse" style={{ color: 'hsl(var(--h3))' }}>Saving...</span>
                    )}
                    {entry.importState === 'done' && (
                      <span className="text-[10px]" style={{ color: 'hsl(120 50% 55%)' }}>Done</span>
                    )}
                    {entry.importState === 'error' && (
                      <span className="text-[10px]" style={{ color: 'hsl(0 60% 65%)' }} title={entry.importError}>
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Import progress bar */}
        {status === 'importing' && importProgress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'hsl(var(--c2))' }}>Importing set {importProgress.current} of {importProgress.total}...</span>
              <span style={{ color: 'hsl(var(--c3))' }}>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--b4) / 0.3)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                  background: 'hsl(var(--h3))',
                }}
              />
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={status === 'importing' ? () => { abortRef.current = true } : onClose} className="flex-1">
            {status === 'importing' ? 'Stop' : 'Cancel'}
          </Button>
          {(status === 'parsed' || (status === 'importing' && importProgress)) && (
            <Button
              variant="primary"
              onClick={doneCount > 0 && remainingSelected === 0 ? onImported : handleImport}
              disabled={status === 'importing' || (doneCount === 0 && selectedCount === 0)}
              className="flex-1"
            >
              {doneCount > 0 && remainingSelected === 0
                ? 'Done'
                : doneCount > 0
                ? `Import ${remainingSelected} remaining`
                : `Import ${selectedCount} set${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
