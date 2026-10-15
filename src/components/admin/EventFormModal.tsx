import { useState } from 'react'
import { createEventAdmin, updateEventAdmin, uploadEventLogoAdmin, uploadEventCoverAdmin, getEventCoverUrl, getEventLogoUrl } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { parseEventSourceHtml, type Event1001Parsed } from '../../lib/parse-1001tracklists-source'
import type { Event } from './eventTypes'

export function EventFormModal({ event, onClose, onSaved }: { event?: Event; onClose: () => void; onSaved: () => void }) {
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
        <div className="rounded-lg overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px oklch(var(--b4) / 0.2)' }}>
          <button
            onClick={() => setImportHtml(importHtml || ' ')}
            className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer"
            style={{ background: 'oklch(var(--b5) / 0.4)' }}
          >
            <span className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'oklch(var(--c2))' }}>
              {event ? 'Enrich from 1001Tracklists' : 'Import from 1001Tracklists (optional)'}
            </span>
            <svg
              className="w-3.5 h-3.5 transition-transform"
              style={{ color: 'oklch(var(--c3))', transform: importHtml ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {importHtml !== '' && (
            <div className="px-3 pb-3 pt-2 space-y-2" style={{ background: 'oklch(var(--b5) / 0.2)' }}>
              <p className="text-xs" style={{ color: 'oklch(var(--c3))' }}>
                Go to the event source page (e.g. <code className="font-mono">/source/u8bf5c/</code>), view page source, paste below.
                {event && ' Existing values are preserved — only empty fields will be filled.'}
              </p>
              <textarea
                value={importHtml === ' ' ? '' : importHtml}
                onChange={(e) => { setImportHtml(e.target.value); setImportParsed(null); setImportError(null) }}
                rows={3}
                placeholder="Paste source page HTML here..."
                className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-none focus:outline-none"
                style={{ background: 'oklch(var(--b4) / 0.4)', color: 'oklch(var(--c1))' }}
              />
              <Button variant="secondary" size="sm" onClick={handleParse1001TL} disabled={!importHtml.trim()}>
                Parse &amp; {event ? 'Fill Missing' : 'Autofill'}
              </Button>
              {importError && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{importError}</p>}
              {importParsed && (
                <div className="text-xs space-y-0.5" style={{ color: 'oklch(var(--c2))' }}>
                  <p>Parsed: <strong style={{ color: 'oklch(var(--c1))' }}>{importParsed.name}</strong></p>
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
            <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'oklch(var(--c2))' }}>
              Logo <span className="text-[10px] font-normal" style={{ color: 'oklch(var(--c3))' }}>(square)</span>
            </label>
            <div
              className="w-full aspect-square rounded-xl overflow-hidden mb-2 flex items-center justify-center cursor-pointer relative group"
              style={{ background: 'oklch(var(--b4))', boxShadow: 'var(--card-border)' }}
              onClick={() => document.getElementById('logo-input')?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6" style={{ color: 'oklch(var(--c3) / 0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-[10px]" style={{ color: 'oklch(var(--c3) / 0.4)' }}>Upload logo</span>
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
            {logoFile && <p className="text-[10px]" style={{ color: 'oklch(var(--c3))' }}>{logoFile.name}</p>}
          </div>

          {/* Cover upload (wide) */}
          <div>
            <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'oklch(var(--c2))' }}>
              Cover <span className="text-[10px] font-normal" style={{ color: 'oklch(var(--c3))' }}>(background)</span>
            </label>
            <div
              className="w-full aspect-square rounded-xl overflow-hidden mb-2 flex items-center justify-center cursor-pointer relative group"
              style={{ background: 'oklch(var(--b4))', boxShadow: 'var(--card-border)' }}
              onClick={() => document.getElementById('cover-input')?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6" style={{ color: 'oklch(var(--c3) / 0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <span className="text-[10px]" style={{ color: 'oklch(var(--c3) / 0.4)' }}>Upload cover</span>
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
            {coverFile && <p className="text-[10px]" style={{ color: 'oklch(var(--c3))' }}>{coverFile.name}</p>}
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
          <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'oklch(var(--c2))' }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none" style={{ background: 'oklch(var(--b4) / 0.4)', color: 'oklch(var(--c1))' }} />
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
          <p className="text-xs animate-pulse" style={{ color: 'oklch(var(--h3))' }}>{uploadProgress}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">{saving ? 'Saving...' : event ? 'Save' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  )
}
