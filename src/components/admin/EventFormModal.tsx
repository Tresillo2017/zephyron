import { useRef, useState, type ChangeEvent } from 'react'
import { Upload2Filled, ArrowDownFilled } from '@mingcute/react/core-filled'
import { createEventAdmin, updateEventAdmin, uploadEventLogoAdmin, uploadEventCoverAdmin, getEventCoverUrl, getEventLogoUrl } from '../../lib/api'
import { cn } from '../../lib/cn'
import { parseEventSourceHtml, type Event1001Parsed } from '../../lib/parse-1001tracklists-source'
import { Input, InlineAlert, Textarea, textareaClass } from '../bleh'
import { AdminButton, AdminModal } from './adminUi'
import type { Event } from './eventTypes'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

function ImageDropField({ label, hint, preview, fileName, uploadLabel, onPick }: {
  label: string; hint: string; preview: string | null; fileName: string | null
  uploadLabel: string; onPick: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium text-text">
        {label} <span className="text-[11px] font-normal text-muted">{hint}</span>
      </span>
      <button
        type="button"
        aria-label={`Upload ${label.toLowerCase()}`}
        onClick={() => inputRef.current?.click()}
        className="group relative mb-2 flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-b4 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--b4),transparent_75%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2"
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-muted/60">
            <Upload2Filled size={20} aria-hidden="true" />
            <span className="text-[11px]">{uploadLabel}</span>
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[12px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Change
        </span>
      </button>
      <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} onChange={onPick} className="hidden" />
      {fileName && <p className="text-[11px] text-muted">{fileName}</p>}
    </div>
  )
}

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

  const handleFileSelect = (setter: (f: File) => void, previewSetter: (url: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
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

  const footer = (
    <>
      <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
      <AdminButton variant="primary" onClick={handleSave} disabled={saving || !name.trim()}>
        {saving ? 'Saving...' : event ? 'Save' : 'Create'}
      </AdminButton>
    </>
  )

  return (
    <AdminModal isOpen onClose={onClose} title={event ? `Edit: ${event.name}` : 'Create Event'} size="lg" footer={footer}>
      <div className="flex flex-col gap-4">

        {/* 1001TL Import/Enrich section — available in both create and edit */}
        <div className="overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--b4),transparent_80%)]">
          <button
            type="button"
            aria-expanded={importHtml !== ''}
            onClick={() => setImportHtml(importHtml || ' ')}
            className="flex w-full cursor-pointer items-center justify-between bg-b5/40 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2"
          >
            <span className="text-[13px] font-medium text-text">
              {event ? 'Enrich from 1001Tracklists' : 'Import from 1001Tracklists (optional)'}
            </span>
            <ArrowDownFilled size={14} aria-hidden="true" className={cn('text-muted transition-transform duration-200', importHtml && 'rotate-180')} />
          </button>
          {importHtml !== '' && (
            <div className="flex flex-col gap-2 bg-b5/20 px-3 pb-3 pt-2">
              <p className="text-[12px] text-muted">
                Go to the event source page (e.g. <code className="font-mono text-accent-2">/source/u8bf5c/</code>), view page source, paste below.
                {event && ' Existing values are preserved — only empty fields will be filled.'}
              </p>
              <textarea
                value={importHtml === ' ' ? '' : importHtml}
                onChange={(e) => { setImportHtml(e.target.value); setImportParsed(null); setImportError(null) }}
                rows={3}
                placeholder="Paste source page HTML here..."
                className={textareaClass + ' resize-none font-mono text-[12px]'}
              />
              <AdminButton variant="secondary" size="sm" onClick={handleParse1001TL} disabled={!importHtml.trim()}>
                Parse &amp; {event ? 'Fill Missing' : 'Autofill'}
              </AdminButton>
              {importError && <InlineAlert tone="error">{importError}</InlineAlert>}
              {importParsed && (
                <div className="flex flex-col gap-0.5 text-[12px] text-muted">
                  <p>Parsed: <strong className="font-medium text-heading">{importParsed.name}</strong></p>
                  {importParsed.source_id && <p>Source ID: <code className="font-mono text-text">{importParsed.source_id}</code></p>}
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
          <ImageDropField
            label="Logo"
            hint="(square)"
            preview={logoPreview}
            fileName={logoFile?.name ?? null}
            uploadLabel="Upload logo"
            onPick={handleFileSelect(setLogoFile, setLogoPreview)}
          />
          <ImageDropField
            label="Cover"
            hint="(background)"
            preview={coverPreview}
            fileName={coverFile?.name ?? null}
            uploadLabel="Upload cover"
            onPick={handleFileSelect(setCoverFile, setCoverPreview)}
          />
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
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

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
          <p className="text-[12px] text-accent-2" role="status">{uploadProgress}</p>
        )}
      </div>
    </AdminModal>
  )
}
