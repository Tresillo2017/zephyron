import { useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  fetchArtists,
  fetchEvents,
  fetchSet,
  triggerDetection,
  redetectLowConfidence,
  deleteSetAdmin,
  updateSetAdmin,
  import1001Tracklists,
  type Track1001Preview,
} from '../../lib/api'
import { AutocompleteInput, type AutocompleteOption } from '../ui/AutocompleteInput'
import { Input, Kbd, Select, Spinner, Tabs, Textarea, type SelectOption, type TabItem } from '../bleh'
import { AdminBadge, AdminButton, AdminModal } from './adminUi'
import { parse1001TracklistFromHtml } from '../../lib/parse-1001tracklists'
import { GENRES } from '../../lib/constants'
import type { DjSet } from '../../lib/types'

type EditTab = 'metadata' | 'tracklist' | 'danger'

const TABS: TabItem<EditTab>[] = [
  { key: 'metadata', label: 'Metadata' },
  { key: 'tracklist', label: 'Tracklist' },
  { key: 'danger', label: 'Danger Zone' },
]

const GENRE_OPTIONS: SelectOption[] = [{ value: '', label: 'None' }, ...GENRES.map((g) => ({ value: g, label: g }))]

/** Field caption above a control (same typography as bleh Input labels). */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="ui-field-label">{label}</span>
      {children}
    </div>
  )
}

/** Muted panel used for the tracklist and danger sections. */
const PANEL = 'rounded-card bg-surface-raised/50 p-4 shadow-[var(--item-inset)]'

/** Modal for editing set metadata */
export function EditSetModal({ set, onClose, onSaved, onDeleted }: { set: DjSet; onClose: () => void; onSaved: () => void; onDeleted: (id: string) => void }) {
  const [tab, setTab] = useState<EditTab>('metadata')

  // Metadata fields
  const [title, setTitle] = useState(set.title)
  const [artist, setArtist] = useState(set.artist)
  const [description, setDescription] = useState(set.description || '')
  const [genre, setGenre] = useState(set.genre || '')
  const [subgenre, setSubgenre] = useState(set.subgenre || '')
  const [venue, setVenue] = useState(set.venue || '')
  const [event, setEvent] = useState(set.event || '')
  const [tracklistUrl, setTracklistUrl] = useState(set.tracklist_1001_url || '')
  const [isSaving, setIsSaving] = useState(false)

  // Autocomplete
  const [artistId, setArtistId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)

  // Co-artists
  const [coArtistValue, setCoArtistValue] = useState('')
  const [coArtistId, setCoArtistId] = useState<string | null>(null)
  const [additionalArtists, setAdditionalArtists] = useState<Array<{ id: string; name: string }>>([])
  const [artistsLoaded, setArtistsLoaded] = useState(false)

  // Load existing set_artists on mount
  useEffect(() => {
    if (artistsLoaded) return
    fetchSet(set.id).then((res) => {
      const sa = res.data.set_artists
      if (sa && sa.length > 0) {
        // First artist = primary, rest = co-artists
        const primary = sa.find((a) => a.position === 1) || sa[0]
        if (primary && !artistId) {
          setArtistId(primary.id)
        }
        const coArtists = sa.filter((a) => a.id !== primary.id).map((a) => ({ id: a.id, name: a.name }))
        if (coArtists.length > 0) {
          setAdditionalArtists(coArtists)
        }
      }
      setArtistsLoaded(true)
    }).catch(() => { setArtistsLoaded(true) })
  }, [set.id, artistsLoaded, artistId])

  const fetchArtistOptions = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
    const res = await fetchArtists(q)
    return (res.data || []).map((a: Record<string, unknown>) => ({ id: a.id as string, label: a.name as string, sublabel: a.set_count ? `${a.set_count} sets` : undefined }))
  }, [])

  const fetchEventOptions = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
    const res = await fetchEvents(q)
    return (res.data || []).map((e: Record<string, unknown>) => ({ id: e.id as string, label: e.name as string, sublabel: (e.series as string) || undefined }))
  }, [])

  // Co-artist handlers
  const handleAddCoArtist = () => {
    if (!coArtistId || !coArtistValue.trim()) return
    if (additionalArtists.find(a => a.id === coArtistId)) return
    if (coArtistId === artistId) return // Don't add primary artist as co-artist
    setAdditionalArtists(prev => [...prev, { id: coArtistId, name: coArtistValue }])
    setCoArtistValue('')
    setCoArtistId(null)
  }

  const handleRemoveCoArtist = (id: string) => {
    setAdditionalArtists(prev => prev.filter(a => a.id !== id))
  }

  // 1001Tracklists import
  const [tracklistHtml, setTracklistHtml] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [parsedTracks, setParsedTracks] = useState<Track1001Preview[]>([])
  const [tracklistMsg, setTracklistMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Detection
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectMsg, setDetectMsg] = useState<string | null>(null)

  // Delete
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteText, setConfirmDeleteText] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      // Build artist_ids list
      const artistIds: string[] = []
      if (artistId) artistIds.push(artistId)
      additionalArtists.forEach(a => {
        if (!artistIds.includes(a.id)) artistIds.push(a.id)
      })

      // Build artist display string
      const allArtistNames = [artist.trim(), ...additionalArtists.map(a => a.name)].filter(Boolean)
      const artistDisplayName = allArtistNames.length > 1 ? allArtistNames.join(' & ') : artist.trim()

      await updateSetAdmin(set.id, {
        title: title.trim(), artist: artistDisplayName,
        description: description.trim() || null, genre: genre || null,
        subgenre: subgenre.trim() || null, venue: venue.trim() || null,
        event: event.trim() || null,
        tracklist_1001_url: tracklistUrl.trim() || null,
        artist_id: artistId || null,
        event_id: eventId || null,
        artist_ids: artistIds.length > 0 ? artistIds : undefined,
      })
      setSuccess('Saved')
      setTimeout(() => { setSuccess(null); onSaved() }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleParse = () => {
    if (!tracklistHtml.trim()) return
    setIsParsing(true)
    setTracklistMsg(null)
    try {
      // Parse entirely client-side — no server round-trip needed
      const tracks = parse1001TracklistFromHtml(tracklistHtml)
      if (tracks.length === 0) {
        setTracklistMsg({ type: 'error', text: 'No tracks found. Paste the full page source (Ctrl+U).' })
      } else {
        setParsedTracks(tracks as Track1001Preview[])
      }
    } catch (err) {
      setTracklistMsg({ type: 'error', text: err instanceof Error ? err.message : 'Parse failed' })
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = async () => {
    if (parsedTracks.length === 0) return
    setIsImporting(true)
    setTracklistMsg(null)
    setImportProgress(`Importing ${parsedTracks.length} tracks...`)

    // Simulate progress steps while the server processes
    const steps = [
      { delay: 800, msg: 'Creating song records...' },
      { delay: 2500, msg: 'Enriching with Last.fm metadata...' },
      { delay: 5000, msg: 'Caching cover artwork...' },
      { delay: 8000, msg: 'Writing detections...' },
      { delay: 12000, msg: 'Almost done...' },
    ]
    const timers = steps.map((step) =>
      setTimeout(() => setImportProgress(step.msg), step.delay)
    )

    try {
      const res = await import1001Tracklists(set.id, parsedTracks)
      timers.forEach(clearTimeout)
      setTracklistMsg({ type: 'success', text: `Imported ${res.data.imported} tracks with song records. Tracklist is live.` })
      setParsedTracks([])
      setTracklistHtml('')
    } catch (err) {
      timers.forEach(clearTimeout)
      setTracklistMsg({ type: 'error', text: err instanceof Error ? err.message : 'Import failed' })
    } finally {
      setIsImporting(false)
      setImportProgress('')
    }
  }

  const handleDetect = async () => {
    setIsDetecting(true)
    setDetectMsg(null)
    try {
      const res = await triggerDetection(set.id)
      const data = ((res as Record<string, unknown>).data as Record<string, unknown>) || {}
      setDetectMsg(data.error ? `Failed: ${data.error}` : `Detected ${data.detections || 0} tracks`)
    } catch (err) {
      setDetectMsg(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleRedetect = async () => {
    setIsDetecting(true)
    setDetectMsg(null)
    try {
      await redetectLowConfidence(set.id)
      setDetectMsg('Re-detection triggered')
    } catch {
      setDetectMsg('Re-detection failed')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteSetAdmin(set.id)
      onDeleted(set.id)
    } catch { /* silent */ }
    finally { setIsDeleting(false) }
  }

  return (
    <AdminModal isOpen onClose={onClose} title={`Edit: ${set.title}`} size="lg">
      <div className="max-h-[75vh] min-w-0 overflow-auto">
        <Tabs variant="segmented" aria-label="Edit set sections" tabs={TABS} active={tab} onChange={setTab} className="mb-4" />

        {/* ═══ METADATA TAB ═══ */}
        {tab === 'metadata' && (
          <div className="flex flex-col gap-3">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 items-start gap-3">
              <Field label="Artist / DJ">
                <AutocompleteInput
                  value={artist} onChange={setArtist}
                  onSelect={(opt) => setArtistId(opt.id)}
                  onClear={() => setArtistId(null)}
                  selectedId={artistId}
                  fetchOptions={fetchArtistOptions}
                  placeholder="DJ name"
                />
                {/* Co-artist chips */}
                {additionalArtists.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {additionalArtists.map(a => (
                      <AdminBadge key={a.id} variant="accent" className="gap-1">
                        {a.name}
                        <button type="button" onClick={() => handleRemoveCoArtist(a.id)} aria-label={`Remove ${a.name}`} className="ml-0.5 cursor-pointer leading-none opacity-60 hover:opacity-100">×</button>
                      </AdminBadge>
                    ))}
                  </div>
                )}
                {/* Co-artist picker */}
                <div className="flex items-start gap-1.5">
                  <div className="min-w-0 flex-1">
                    <AutocompleteInput
                      value={coArtistValue}
                      onChange={setCoArtistValue}
                      onSelect={(opt) => setCoArtistId(opt.id)}
                      onClear={() => setCoArtistId(null)}
                      selectedId={coArtistId}
                      fetchOptions={fetchArtistOptions}
                      placeholder="Add co-artist..."
                    />
                  </div>
                  <AdminButton variant="secondary" size="sm" onClick={handleAddCoArtist} disabled={!coArtistId}>
                    Add
                  </AdminButton>
                </div>
              </Field>
              <Field label="Event">
                <AutocompleteInput
                  value={event} onChange={setEvent}
                  onSelect={(opt) => setEventId(opt.id)}
                  onClear={() => setEventId(null)}
                  selectedId={eventId}
                  fetchOptions={fetchEventOptions}
                  placeholder="Boiler Room Berlin"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
              <Input label="Subgenre" value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g. Dark Techno" />
            </div>
            <Field label="Genre">
              <Select label="Genre" value={genre} onChange={setGenre} options={GENRE_OPTIONS} width={400} className="w-full" />
            </Field>
            <Input label="1001Tracklists URL" value={tracklistUrl} onChange={(e) => setTracklistUrl(e.target.value)} placeholder="https://www.1001tracklists.com/tracklist/..." />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="resize-none" />
            {error && <p className="text-xs text-danger">{error}</p>}
            {success && <p className="text-xs text-success">{success}</p>}
            <div className="flex gap-3 pt-2">
              <AdminButton variant="secondary" onClick={onClose} className="flex-1">Cancel</AdminButton>
              <AdminButton variant="primary" onClick={handleSave} disabled={isSaving || !title.trim() || !artist.trim()} className="flex-1">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        )}

        {/* ═══ TRACKLIST TAB ═══ */}
        {tab === 'tracklist' && (
          <div className="flex flex-col gap-4">
            {/* Auto-detect section */}
            <div className={PANEL}>
              <p className="mb-2 text-xs font-medium text-text-primary">Auto-detect from YouTube</p>
              <p className="mb-3 text-[10px] text-text-text-muted">
                Parses the YouTube description and comments via Invidious + AI. Falls back if no 1001tracklists data is available.
              </p>
              <div className="flex gap-2">
                <AdminButton variant="primary" size="sm" onClick={handleDetect} disabled={isDetecting}>
                  {isDetecting ? 'Detecting...' : 'Run Detection'}
                </AdminButton>
                <AdminButton variant="ghost" size="sm" onClick={handleRedetect} disabled={isDetecting}>
                  Re-detect Low Confidence
                </AdminButton>
              </div>
              {detectMsg && (
                <p className={`mt-2 text-[10px] ${detectMsg.includes('Failed') || detectMsg.includes('failed') ? 'text-danger' : 'text-accent'}`}>
                  {detectMsg}
                </p>
              )}
            </div>

            {/* Manual 1001tracklists paste */}
            <div className={PANEL}>
              <p className="mb-1 text-xs font-medium text-text-primary">Import from 1001Tracklists</p>
              <p className="mb-3 text-[10px] text-text-text-muted">
                Open the 1001tracklists page → <Kbd>Ctrl+U</Kbd> → <Kbd>Ctrl+A</Kbd> → copy → paste below. This replaces all existing detections.
              </p>
              <Textarea
                aria-label="1001Tracklists page source"
                value={tracklistHtml}
                onChange={(e) => setTracklistHtml(e.target.value)}
                placeholder="Paste full page source HTML..."
                rows={4}
                className="font-mono text-xs"
              />
              <div className="mt-2 flex items-center gap-2">
                <AdminButton variant="primary" size="sm" onClick={handleParse} disabled={isParsing || !tracklistHtml.trim()}>
                  {isParsing ? 'Parsing...' : 'Parse'}
                </AdminButton>
                {parsedTracks.length > 0 && (
                  <AdminButton variant="primary" size="sm" onClick={handleImport} disabled={isImporting}>
                    {isImporting ? 'Importing...' : `Import ${parsedTracks.length} tracks`}
                  </AdminButton>
                )}
                {tracklistHtml.trim() && (
                  <span className="ml-auto font-mono text-[10px] text-text-text-muted">
                    {(tracklistHtml.length / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
              {tracklistMsg && (
                <p className={`mt-2 text-[10px] ${tracklistMsg.type === 'error' ? 'text-danger' : 'text-accent'}`}>
                  {tracklistMsg.text}
                </p>
              )}
              {isImporting && importProgress && (
                <div className="mt-3 flex items-center gap-2 rounded-ctl bg-accent/5 px-3 py-2 text-accent">
                  <Spinner size={14} />
                  <span className="text-[11px]">{importProgress}</span>
                </div>
              )}
            </div>

            {/* Parsed tracks preview */}
            {parsedTracks.length > 0 && (
              <div className="overflow-hidden rounded-card shadow-[var(--item-inset)]">
                <div className="flex items-center justify-between bg-surface-raised/50 px-3 py-2">
                  <span className="text-xs font-medium text-accent">{parsedTracks.length} tracks</span>
                  <button type="button" className="text-[10px] text-text-text-muted" onClick={() => { setParsedTracks([]); setTracklistHtml('') }}>Clear</button>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {parsedTracks.map((t, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] ${i > 0 ? 'border-t border-[oklch(var(--b4)/0.1)]' : ''}`}>
                      {t.artwork_url ? (
                        <img src={t.artwork_url} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="h-7 w-7 shrink-0 rounded bg-surface-overlay/40" />
                      )}
                      <span className={`w-8 shrink-0 text-right font-mono ${t.is_continuation ? 'text-accent/50' : 'text-text-text-muted'}`}>
                        {t.is_continuation ? 'w/' : t.cue_time || String(t.position).padStart(2, '0')}
                      </span>
                      <span className="flex-1 truncate text-text-primary">
                        {t.artist} - {t.title}
                      </span>
                      {t.label && <span className="max-w-20 shrink-0 truncate text-text-text-muted">[{t.label}]</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ DANGER ZONE ═══ */}
        {tab === 'danger' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-card bg-danger/10 p-4 shadow-[var(--item-inset)]">
              <p className="mb-1 text-xs font-medium text-danger">Delete this set</p>
              <p className="mb-3 text-[10px] text-text-text-muted">
                Permanently removes this set, all detections, annotations, votes, and audio. This cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    aria-label="Confirm set ID"
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    placeholder={`Type "${set.id.slice(0, 6)}" to confirm`}
                    className="font-mono text-xs"
                  />
                </div>
                <AdminButton
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || confirmDeleteText !== set.id.slice(0, 6)}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Set'}
                </AdminButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  )
}
