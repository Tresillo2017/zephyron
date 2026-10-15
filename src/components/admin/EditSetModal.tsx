import { useState, useEffect, useCallback } from 'react'
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
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { AutocompleteInput, type AutocompleteOption } from '../ui/AutocompleteInput'
import { parse1001TracklistFromHtml } from '../../lib/parse-1001tracklists'
import { GENRES } from '../../lib/constants'
import type { DjSet } from '../../lib/types'

/** Modal for editing set metadata */
export function EditSetModal({ set, onClose, onSaved, onDeleted }: { set: DjSet; onClose: () => void; onSaved: () => void; onDeleted: (id: string) => void }) {
  const [tab, setTab] = useState<'metadata' | 'tracklist' | 'danger'>('metadata')

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

  const inputClass = 'w-full px-3 py-2 bg-[oklch(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none'

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

  const tabs = [
    { id: 'metadata' as const, label: 'Metadata' },
    { id: 'tracklist' as const, label: 'Tracklist' },
    { id: 'danger' as const, label: 'Danger Zone' },
  ]

  return (
    <Modal isOpen onClose={onClose} title={`Edit: ${set.title}`}>
      <div className="min-w-0" style={{ maxHeight: '75vh', overflow: 'auto' }}>
        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'oklch(var(--b5) / 0.5)' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? 'oklch(var(--h3) / 0.15)' : 'transparent',
                color: tab === t.id ? 'oklch(var(--h3))' : 'oklch(var(--c3))',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ METADATA TAB ═══ */}
        {tab === 'metadata' && (
          <div className="space-y-3">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'oklch(var(--c2))' }}>Artist / DJ</label>
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
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {additionalArtists.map(a => (
                      <span key={a.id} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
                        style={{ background: 'oklch(var(--h3) / 0.12)', color: 'oklch(var(--h3))' }}>
                        {a.name}
                        <button onClick={() => handleRemoveCoArtist(a.id)} className="opacity-60 hover:opacity-100 ml-0.5 leading-none cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Co-artist picker */}
                <div className="flex gap-1.5 mt-1.5">
                  <div className="flex-1">
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
                  <Button size="sm" variant="secondary" onClick={handleAddCoArtist} disabled={!coArtistId}>
                    Add
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'oklch(var(--c2))' }}>Event</label>
                <AutocompleteInput
                  value={event} onChange={setEvent}
                  onSelect={(opt) => setEventId(opt.id)}
                  onClear={() => setEventId(null)}
                  selectedId={eventId}
                  fetchOptions={fetchEventOptions}
                  placeholder="Boiler Room Berlin"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
              <Input label="Subgenre" value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g. Dark Techno" />
            </div>
            <div>
              <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'oklch(var(--c2))' }}>Genre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'oklch(var(--c2))' }}>1001Tracklists URL</label>
              <input value={tracklistUrl} onChange={(e) => setTracklistUrl(e.target.value)} placeholder="https://www.1001tracklists.com/tracklist/..." className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'oklch(var(--c2))' }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
            </div>
            {error && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p>}
            {success && <p className="text-xs" style={{ color: 'oklch(var(--h3))' }}>{success}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={isSaving || !title.trim() || !artist.trim()} className="flex-1">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ TRACKLIST TAB ═══ */}
        {tab === 'tracklist' && (
          <div className="space-y-4">
            {/* Auto-detect section */}
            <div className="rounded-xl p-4" style={{ background: 'oklch(var(--b5) / 0.5)', boxShadow: 'inset 0 0 0 1px oklch(var(--b4) / 0.3)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'oklch(var(--c1))' }}>Auto-detect from YouTube</p>
              <p className="text-[10px] mb-3" style={{ color: 'oklch(var(--c3))' }}>
                Parses the YouTube description and comments via Invidious + AI. Falls back if no 1001tracklists data is available.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDetect} disabled={isDetecting}>
                  {isDetecting ? 'Detecting...' : 'Run Detection'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRedetect} disabled={isDetecting}>
                  Re-detect Low Confidence
                </Button>
              </div>
              {detectMsg && (
                <p className="text-[10px] mt-2" style={{ color: detectMsg.includes('Failed') || detectMsg.includes('failed') ? 'hsl(0, 60%, 55%)' : 'oklch(var(--h3))' }}>
                  {detectMsg}
                </p>
              )}
            </div>

            {/* Manual 1001tracklists paste */}
            <div className="rounded-xl p-4" style={{ background: 'oklch(var(--b5) / 0.5)', boxShadow: 'inset 0 0 0 1px oklch(var(--b4) / 0.3)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'oklch(var(--c1))' }}>Import from 1001Tracklists</p>
              <p className="text-[10px] mb-3" style={{ color: 'oklch(var(--c3))' }}>
                Open the 1001tracklists page → <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'oklch(var(--b3))', color: 'oklch(var(--c2))' }}>Ctrl+U</kbd> → <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'oklch(var(--b3))', color: 'oklch(var(--c2))' }}>Ctrl+A</kbd> → copy → paste below. This replaces all existing detections.
              </p>
              <textarea
                value={tracklistHtml}
                onChange={(e) => setTracklistHtml(e.target.value)}
                placeholder="Paste full page source HTML..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono placeholder:text-text-muted focus:outline-none resize-none"
                style={{ background: 'oklch(var(--b6))', color: 'oklch(var(--c2))', boxShadow: 'inset 0 0 0 1px oklch(var(--b4) / 0.25)' }}
              />
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={handleParse} disabled={isParsing || !tracklistHtml.trim()}>
                  {isParsing ? 'Parsing...' : 'Parse'}
                </Button>
                {parsedTracks.length > 0 && (
                  <Button variant="primary" size="sm" onClick={handleImport} disabled={isImporting}>
                    {isImporting ? 'Importing...' : `Import ${parsedTracks.length} tracks`}
                  </Button>
                )}
                {tracklistHtml.trim() && (
                  <span className="text-[10px] font-mono ml-auto" style={{ color: 'oklch(var(--c3))' }}>
                    {(tracklistHtml.length / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
              {tracklistMsg && (
                <p className="text-[10px] mt-2" style={{ color: tracklistMsg.type === 'error' ? 'hsl(0, 60%, 55%)' : 'oklch(var(--h3))' }}>
                  {tracklistMsg.text}
                </p>
              )}
              {isImporting && importProgress && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'oklch(var(--h3) / 0.06)' }}>
                  <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: 'oklch(var(--h3) / 0.3)', borderTopColor: 'oklch(var(--h3))' }} />
                  <span className="text-[11px]" style={{ color: 'oklch(var(--h3))' }}>{importProgress}</span>
                </div>
              )}
            </div>

            {/* Parsed tracks preview */}
            {parsedTracks.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px oklch(var(--b4) / 0.25)' }}>
                <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'oklch(var(--b5) / 0.5)' }}>
                  <span className="text-xs font-medium" style={{ color: 'oklch(var(--h3))' }}>{parsedTracks.length} tracks</span>
                  <button className="text-[10px]" style={{ color: 'oklch(var(--c3))' }} onClick={() => { setParsedTracks([]); setTracklistHtml('') }}>Clear</button>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {parsedTracks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px]" style={{ borderTop: i > 0 ? '1px solid oklch(var(--b4) / 0.1)' : undefined }}>
                      {t.artwork_url ? (
                        <img src={t.artwork_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded shrink-0" style={{ background: 'oklch(var(--b4) / 0.4)' }} />
                      )}
                      <span className="w-8 text-right font-mono shrink-0" style={{ color: t.is_continuation ? 'oklch(var(--h3) / 0.5)' : 'oklch(var(--c3))' }}>
                        {t.is_continuation ? 'w/' : t.cue_time || String(t.position).padStart(2, '0')}
                      </span>
                      <span className="truncate flex-1" style={{ color: 'oklch(var(--c1))' }}>
                        {t.artist} - {t.title}
                      </span>
                      {t.label && <span className="shrink-0 truncate max-w-20" style={{ color: 'oklch(var(--c3))' }}>[{t.label}]</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ DANGER ZONE ═══ */}
        {tab === 'danger' && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'hsl(0, 50%, 15% / 0.3)', boxShadow: 'inset 0 0 0 1px hsl(0, 50%, 30% / 0.3)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'hsl(0, 60%, 65%)' }}>Delete this set</p>
              <p className="text-[10px] mb-3" style={{ color: 'oklch(var(--c3))' }}>
                Permanently removes this set, all detections, annotations, votes, and audio. This cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value)}
                  placeholder={`Type "${set.id.slice(0, 6)}" to confirm`}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none"
                  style={{ background: 'oklch(var(--b6))', color: 'oklch(var(--c2))', boxShadow: 'inset 0 0 0 1px hsl(0, 50%, 30% / 0.3)' }}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || confirmDeleteText !== set.id.slice(0, 6)}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Set'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
