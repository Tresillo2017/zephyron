import { useState, useCallback, useRef, useEffect } from 'react'
import {
  adminCreateSet, fetchArtists, fetchEvents, import1001Tracklists, type Track1001Preview,
  fetchAdminSourceRequests, approveAdminSourceRequest, rejectAdminSourceRequest,
  fetchAdminSetRequests, approveAdminSetRequest, rejectAdminSetRequest,
  type SourceRequest, type SetRequest,
} from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { AutocompleteInput, type AutocompleteOption } from '../ui/AutocompleteInput'
import { ImportArtistModal } from './ArtistsTab'
import { parse1001TracklistFromHtml, parse1001TracklistMetadata } from '../../lib/parse-1001tracklists'
import { GENRES } from '../../lib/constants'

// ─── Inline Requests Panel ────────────────────────────────────────────────────

function RequestsPanel() {
  const [activeTab, setActiveTab] = useState<'source' | 'sets'>('source')
  const [sourceRequests, setSourceRequests] = useState<SourceRequest[]>([])
  const [setRequests, setSetRequests] = useState<SetRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [srcRes, setRes] = await Promise.all([
        fetchAdminSourceRequests('pending'),
        fetchAdminSetRequests('pending'),
      ])
      setSourceRequests(srcRes.data || [])
      setSetRequests(setRes.data || [])
    } catch {}
    setIsLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSourceApprove = async (id: string) => {
    try {
      await approveAdminSourceRequest(id)
      setActionMsg('Source applied to set.')
      load()
    } catch (e: any) { setActionMsg(e?.message || 'Failed') }
  }

  const handleSourceReject = async (id: string) => {
    try {
      await rejectAdminSourceRequest(id)
      setActionMsg('Request rejected.')
      load()
    } catch (e: any) { setActionMsg(e?.message || 'Failed') }
  }

  const handleSetApprove = async (id: string) => {
    try {
      await approveAdminSetRequest(id)
      setActionMsg('Set request marked as approved.')
      load()
    } catch (e: any) { setActionMsg(e?.message || 'Failed') }
  }

  const handleSetReject = async (id: string) => {
    try {
      await rejectAdminSetRequest(id)
      setActionMsg('Set request rejected.')
      load()
    } catch (e: any) { setActionMsg(e?.message || 'Failed') }
  }

  const sourceCount = sourceRequests.length
  const setCount = setRequests.length

  return (
    <div className="mt-5 rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}>
      <div className="flex items-center gap-0" style={{ background: 'hsl(var(--b5) / 0.6)', borderBottom: '1px solid hsl(var(--b4) / 0.2)' }}>
        <button
          onClick={() => setActiveTab('source')}
          className="px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-1.5"
          style={{
            color: activeTab === 'source' ? 'hsl(var(--h3))' : 'hsl(var(--c3))',
            borderBottom: activeTab === 'source' ? '2px solid hsl(var(--h3))' : '2px solid transparent',
          }}
        >
          Source Requests
          {sourceCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono" style={{ background: 'hsl(var(--h3) / 0.2)', color: 'hsl(var(--h3))' }}>
              {sourceCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sets')}
          className="px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-1.5"
          style={{
            color: activeTab === 'sets' ? 'hsl(var(--h3))' : 'hsl(var(--c3))',
            borderBottom: activeTab === 'sets' ? '2px solid hsl(var(--h3))' : '2px solid transparent',
          }}
        >
          Set Requests
          {setCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono" style={{ background: 'hsl(var(--h3) / 0.2)', color: 'hsl(var(--h3))' }}>
              {setCount}
            </span>
          )}
        </button>
        <button onClick={load} className="ml-auto mr-3 p-1.5 rounded-md transition-colors" style={{ color: 'hsl(var(--c3))' }} title="Refresh">
          <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {actionMsg && (
        <div className="px-4 py-2 text-xs" style={{ background: 'hsl(var(--h3) / 0.1)', color: 'hsl(var(--h3))' }}>
          {actionMsg}
          <button onClick={() => setActionMsg(null)} className="ml-2 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      <div className="max-h-[220px] overflow-y-auto">
        {activeTab === 'source' && (
          <>
            {sourceRequests.length === 0 ? (
              <p className="text-center py-6 text-xs" style={{ color: 'hsl(var(--c3))' }}>No pending source requests</p>
            ) : (
              sourceRequests.map((req) => (
                <div key={req.id} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--b4) / 0.1)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--c1))' }}>
                      {req.set_title} — {req.set_artist}
                    </p>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'hsl(var(--c3))' }}>
                      <span className="uppercase font-mono mr-1">{req.source_type}</span>
                      <a href={req.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        {req.source_url.length > 50 ? req.source_url.slice(0, 50) + '…' : req.source_url}
                      </a>
                    </p>
                    {req.user_name && (
                      <p className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>by {req.user_name}</p>
                    )}
                    {req.notes && (
                      <p className="text-[10px] italic mt-0.5" style={{ color: 'hsl(var(--c3))' }}>{req.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSourceApprove(req.id)}
                      className="px-2 py-1 text-[10px] rounded-md transition-colors"
                      style={{ background: 'hsl(var(--h3) / 0.15)', color: 'hsl(var(--h3))' }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => handleSourceReject(req.id)}
                      className="px-2 py-1 text-[10px] rounded-md transition-colors"
                      style={{ background: 'hsl(0, 60%, 50% / 0.1)', color: 'hsl(0, 60%, 60%)' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'sets' && (
          <>
            {setRequests.length === 0 ? (
              <p className="text-center py-6 text-xs" style={{ color: 'hsl(var(--c3))' }}>No pending set requests</p>
            ) : (
              setRequests.map((req) => (
                <div key={req.id} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--b4) / 0.1)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--c1))' }}>
                      {req.artist} — {req.title}
                    </p>
                    {req.source_url && (
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: 'hsl(var(--c3))' }}>
                        <span className="uppercase font-mono mr-1">{req.source_type}</span>
                        <a href={req.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          {req.source_url}
                        </a>
                      </p>
                    )}
                    <div className="flex gap-2 mt-0.5">
                      {req.event && <span className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>{req.event}</span>}
                      {req.genre && <span className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>{req.genre}</span>}
                      {req.user_name && <span className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>by {req.user_name}</span>}
                    </div>
                    {req.notes && (
                      <p className="text-[10px] italic mt-0.5" style={{ color: 'hsl(var(--c3))' }}>{req.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSetApprove(req.id)}
                      className="px-2 py-1 text-[10px] rounded-md transition-colors"
                      style={{ background: 'hsl(var(--h3) / 0.15)', color: 'hsl(var(--h3))' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleSetReject(req.id)}
                      className="px-2 py-1 text-[10px] rounded-md transition-colors"
                      style={{ background: 'hsl(0, 60%, 50% / 0.1)', color: 'hsl(0, 60%, 60%)' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── SetsUploadTab ────────────────────────────────────────────────────────────

export function SetsUploadTab({ onSetCreated, onClose }: { onSetCreated?: () => void; onClose?: () => void } = {}) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [subgenre, setSubgenre] = useState('')
  const [venue, setVenue] = useState('')
  const [event, setEvent] = useState('')
  const [recordedDate, setRecordedDate] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')

  // Source type + URL
  const [streamSource, setStreamSource] = useState<'youtube' | 'soundcloud' | 'hearthis' | 'none'>('youtube')
  const [sourceUrl, setSourceUrl] = useState('')

  // YouTube / streaming metadata (parsed from 1001TL HTML, or manual)
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [videoId, setVideoId] = useState('')

  // 1001Tracklists
  const [tracklistUrl, setTracklistUrl] = useState('')
  const [tracklistHtml, setTracklistHtml] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parsedTracks, setParsedTracks] = useState<Track1001Preview[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  // Linked artist/event IDs
  const [artistId, setArtistId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [showArtistModal, setShowArtistModal] = useState(false)
  const pendingCreateRef = useRef(false)

  // Additional artists (co-DJs, b2b)
  const [coArtistValue, setCoArtistValue] = useState('')
  const [coArtistId, setCoArtistId] = useState<string | null>(null)
  const [additionalArtists, setAdditionalArtists] = useState<Array<{ id: string; name: string }>>([])

  // Autocomplete fetch functions
  const fetchArtistOptions = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
    const res = await fetchArtists(q)
    return (res.data || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      label: a.name as string,
      sublabel: a.set_count ? `${a.set_count} sets` : undefined,
    }))
  }, [])

  const fetchEventOptions = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
    const res = await fetchEvents(q)
    return (res.data || []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      label: e.name as string,
      sublabel: [e.year, e.series].filter(Boolean).join(' · ') || undefined,
    }))
  }, [])

  const handleCreateArtist = useCallback((_name: string) => {
    setShowArtistModal(true)
  }, [])

  const handleArtistCreated = useCallback((id: string, name: string) => {
    setArtistId(id)
    setArtist(name)
    setShowArtistModal(false)
    if (pendingCreateRef.current) {
      pendingCreateRef.current = false
      setTimeout(() => doCreate(id), 50)
    }
  }, [])

  const handleAddCoArtist = () => {
    if (!coArtistId || !coArtistValue.trim()) return
    if (additionalArtists.find(a => a.id === coArtistId)) return
    setAdditionalArtists(prev => [...prev, { id: coArtistId, name: coArtistValue }])
    setCoArtistValue('')
    setCoArtistId(null)
  }

  const handleRemoveCoArtist = (id: string) => {
    setAdditionalArtists(prev => prev.filter(a => a.id !== id))
  }

  const handleParse = () => {
    if (!tracklistHtml.trim()) return

    setIsParsing(true)
    setParseError(null)
    setSuccess(null)
    try {
      const tracks = parse1001TracklistFromHtml(tracklistHtml)
      if (tracks.length === 0) {
        setParseError('No tracks found. Make sure you pasted the full page source (Ctrl+U), not just the visible text.')
        return
      }
      setParsedTracks(tracks as Track1001Preview[])

      const meta = parse1001TracklistMetadata(tracklistHtml)

      if (meta.title && !title) setTitle(meta.title)
      if (meta.artist && !artist) setArtist(meta.artist)
      if (meta.date && !recordedDate) setRecordedDate(meta.date)
      if (meta.genre && !genre) setGenre(meta.genre)
      if (meta.venue && !venue) setVenue(meta.venue)
      if (meta.duration_seconds && !durationMinutes) {
        setDurationMinutes(Math.round(meta.duration_seconds / 60).toString())
      }
      if (meta.youtube_video_id && !videoId) {
        setVideoId(meta.youtube_video_id)
        // Auto-set source to youtube if we got a video ID
        if (streamSource === 'none') setStreamSource('youtube')
      }
      if (meta.tracklist_id && !tracklistUrl) {
        setTracklistUrl(`https://www.1001tracklists.com/tracklist/${meta.tracklist_id}/`)
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse HTML')
    } finally {
      setIsParsing(false)
    }
  }

  const handleCreate = async () => {
    const missing: string[] = []
    if (!title.trim()) missing.push('title')
    if (!artist.trim()) missing.push('artist')
    if (!durationMinutes) missing.push('duration')

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`)
      return
    }

    // Validate source URL if external type
    if ((streamSource === 'soundcloud' || streamSource === 'hearthis') && !sourceUrl.trim()) {
      setError(`Please provide a ${streamSource === 'soundcloud' ? 'SoundCloud' : 'HearThis'} URL`)
      return
    }

    if (!artistId && artist.trim()) {
      setError(null)
      try {
        const searchRes = await fetchArtists(artist.trim())
        const exactMatch = (searchRes.data || []).find(
          (a: Record<string, unknown>) => (a.name as string).toLowerCase() === artist.trim().toLowerCase()
        )
        if (exactMatch) {
          setArtistId(exactMatch.id as string)
          await doCreate(exactMatch.id as string)
          return
        }
      } catch {}
      pendingCreateRef.current = true
      setShowArtistModal(true)
      return
    }

    await doCreate(artistId)
  }

  const doCreate = async (resolvedArtistId: string | null) => {
    setIsCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const durationSeconds = (parseInt(durationMinutes) || 60) * 60

      // Build artist_ids list
      const artistIds: string[] = []
      if (resolvedArtistId) artistIds.push(resolvedArtistId)
      additionalArtists.forEach(a => {
        if (!artistIds.includes(a.id)) artistIds.push(a.id)
      })

      // Build artist display string (for the sets.artist text field)
      const allArtistNames = [artist.trim(), ...additionalArtists.map(a => a.name)].filter(Boolean)
      const artistDisplayName = allArtistNames.length > 1 ? allArtistNames.join(' & ') : artist.trim()

      setSuccess('Creating set...')
      const res = await adminCreateSet({
        title: title.trim(),
        artist: artistDisplayName,
        description: description.trim() || undefined,
        genre: genre || undefined,
        subgenre: subgenre.trim() || undefined,
        venue: venue.trim() || undefined,
        event: event.trim() || undefined,
        recorded_date: recordedDate || undefined,
        duration_seconds: durationSeconds,
        thumbnail_url: thumbnailUrl || undefined,
        // Source type
        stream_type: streamSource === 'none' ? undefined : streamSource,
        source_url: (streamSource === 'soundcloud' || streamSource === 'hearthis') ? sourceUrl.trim() : undefined,
        // YouTube specific
        youtube_video_id: (streamSource === 'youtube' && videoId) ? videoId : undefined,
        tracklist_1001_url: tracklistUrl.trim() || undefined,
        // Artist IDs
        artist_id: resolvedArtistId || undefined,
        artist_ids: artistIds.length > 0 ? artistIds : undefined,
        event_id: eventId || undefined,
      })

      const id = res.data.id

      if (parsedTracks.length > 0) {
        setSuccess(`Set created. Importing ${parsedTracks.length} tracks...`)
        try {
          const importRes = await import1001Tracklists(id, parsedTracks)
          setSuccess(`Set created. Imported ${importRes.data.imported} tracks from 1001Tracklists.`)
          setParsedTracks([])
          setTracklistHtml('')
        } catch {
          setSuccess(`Set created (${id}), but track import failed. You can re-import from the Edit panel.`)
        }
      } else {
        setSuccess(`Set created (${id}). You can add a tracklist via Edit or trigger ML detection.`)
      }

      // Reset form
      setTitle(''); setArtist(''); setDescription(''); setGenre(''); setSubgenre('')
      setVenue(''); setEvent(''); setRecordedDate(''); setDurationMinutes('')
      setThumbnailUrl(''); setVideoId(''); setTracklistUrl(''); setTracklistHtml('')
      setArtistId(null); setEventId(null)
      setStreamSource('youtube'); setSourceUrl('')
      setAdditionalArtists([]); setCoArtistValue(''); setCoArtistId(null)
      onSetCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create set')
    } finally {
      setIsCreating(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors'

  const identifiedCount = parsedTracks.filter(t => t.is_identified || (t.artist !== 'ID' && t.title !== 'ID')).length
  const idCount = parsedTracks.filter(t => !t.is_identified && t.artist === 'ID' && t.title === 'ID').length

  return (
    <div className="flex flex-col gap-0">
      <div className="flex gap-5" style={{ minHeight: '420px' }}>
        {/* ═══ LEFT COLUMN: 1001TL source + tracklist ═══ */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-sm font-medium" style={{ color: 'hsl(var(--c2))' }}>
              1001Tracklists source
            </label>
          </div>

          {/* URL */}
          <Input
            value={tracklistUrl}
            onChange={(e) => setTracklistUrl(e.target.value)}
            placeholder="https://www.1001tracklists.com/tracklist/..."
            className="w-full mb-2"
          />

          {/* HTML paste */}
          <div
            className="rounded-xl p-3 mb-2"
            style={{ background: 'hsl(var(--b5) / 0.5)', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.3)' }}
          >
            <div className="flex items-start gap-2 mb-2">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'hsl(var(--h3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="text-[11px]" style={{ color: 'hsl(var(--c3))' }}>
                Open the 1001tracklists page, press{' '}
                <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'hsl(var(--b3))', color: 'hsl(var(--c2))' }}>Ctrl+U</kbd>
                {' '}to view source, select all, copy, and paste below.
              </p>
            </div>

            <textarea
              value={tracklistHtml}
              onChange={(e) => setTracklistHtml(e.target.value)}
              placeholder="Paste the full page source HTML here..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono placeholder:text-text-muted focus:outline-none resize-none"
              style={{
                background: 'hsl(var(--b6))',
                color: 'hsl(var(--c2))',
                boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)',
              }}
            />

            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                onClick={handleParse}
                disabled={isParsing || !tracklistHtml.trim()}
              >
                {isParsing ? 'Parsing...' : parsedTracks.length > 0 ? 'Re-parse' : 'Parse'}
              </Button>
              {tracklistHtml.trim() && (
                <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--c3))' }}>
                  {(tracklistHtml.length / 1024).toFixed(0)} KB
                </span>
              )}
              {parsedTracks.length > 0 && (
                <button
                  className="text-[10px] ml-auto transition-colors"
                  style={{ color: 'hsl(var(--c3))' }}
                  onClick={() => { setParsedTracks([]); setTracklistHtml(''); setParseError(null) }}
                >
                  Clear
                </button>
              )}
            </div>
            {parseError && <p className="text-[10px] mt-1.5" style={{ color: 'hsl(0, 60%, 55%)' }}>{parseError}</p>}
          </div>

          {/* Parsed tracks preview */}
          {parsedTracks.length > 0 && (
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}>
              <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ background: 'hsl(var(--b5) / 0.5)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--h3))' }}>
                    {parsedTracks.filter(t => !t.is_continuation).length} tracks
                  </span>
                  {identifiedCount > 0 && (
                    <span className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>
                      {identifiedCount} ID'd
                    </span>
                  )}
                  {idCount > 0 && (
                    <span className="text-[10px]" style={{ color: 'hsl(0, 50%, 55%)' }}>
                      {idCount} unknown
                    </span>
                  )}
                </div>
                <Badge variant="accent">1001Tracklists</Badge>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: '340px' }}>
                {parsedTracks.map((t, i) => {
                  const isId = !t.is_identified && t.artist === 'ID' && t.title === 'ID'
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs"
                      style={{
                        background: i % 2 === 0 ? 'transparent' : 'hsl(var(--b5) / 0.2)',
                        borderBottom: '1px solid hsl(var(--b4) / 0.1)',
                      }}
                    >
                      {t.artwork_url ? (
                        <img src={t.artwork_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center" style={{
                          background: isId ? 'hsl(0, 30%, 20%)' : 'hsl(var(--b4) / 0.5)',
                        }}>
                          {isId && <span className="text-[8px]" style={{ color: 'hsl(0, 50%, 55%)' }}>?</span>}
                        </div>
                      )}
                      <span className="w-5 text-right font-mono tabular-nums shrink-0 text-[10px]" style={{
                        color: t.is_continuation ? 'hsl(var(--h3) / 0.5)' : isId ? 'hsl(0, 40%, 50%)' : 'hsl(var(--c3))',
                      }}>
                        {t.is_continuation ? 'w/' : String(t.position).padStart(2, '0')}
                      </span>
                      {t.cue_time && (
                        <span className="font-mono tabular-nums shrink-0 text-[10px]" style={{ color: 'hsl(var(--c3))' }}>
                          {t.cue_time}
                        </span>
                      )}
                      <div className="flex-1 min-w-0 truncate">
                        {isId ? (
                          <span className="italic" style={{ color: 'hsl(0, 40%, 50%)' }}>ID - ID</span>
                        ) : (
                          <>
                            <span style={{ color: 'hsl(var(--c2))' }}>{t.artist}</span>
                            <span style={{ color: 'hsl(var(--c3))' }}> — </span>
                            <span style={{ color: 'hsl(var(--c1))' }}>{t.title}</span>
                            {t.is_mashup && (
                              <span className="ml-1 text-[9px] px-1 py-0.5 rounded font-mono" style={{
                                background: 'hsl(var(--b4) / 0.4)',
                                color: 'hsl(var(--c3))',
                              }}>mashup</span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {t.spotify_url && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#1DB954' }} />}
                        {t.apple_music_url && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FA243C' }} />}
                        {t.soundcloud_url && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF6100' }} />}
                        {t.beatport_url && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#94D500' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT COLUMN: Set metadata + actions ═══ */}
        <div className="w-72 shrink-0 flex flex-col">
          <label className="text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--c2))' }}>
            Set metadata
          </label>

          <div className="space-y-3 flex-1">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Set title" className={inputClass} />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Artist / DJ *</label>
              <AutocompleteInput
                value={artist}
                onChange={setArtist}
                onSelect={(opt) => setArtistId(opt.id)}
                onClear={() => setArtistId(null)}
                selectedId={artistId}
                fetchOptions={fetchArtistOptions}
                placeholder="DJ name"
                onCreateNew={handleCreateArtist}
                createNewLabel="Create artist"
              />
              {/* Co-artists */}
              {additionalArtists.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {additionalArtists.map(a => (
                    <span key={a.id} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
                      style={{ background: 'hsl(var(--h3) / 0.12)', color: 'hsl(var(--h3))' }}>
                      {a.name}
                      <button onClick={() => handleRemoveCoArtist(a.id)} className="opacity-60 hover:opacity-100 ml-0.5 leading-none">×</button>
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
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Venue</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Club / Festival stage" className={inputClass} />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Event</label>
              <AutocompleteInput
                value={event}
                onChange={setEvent}
                onSelect={(opt) => setEventId(opt.id)}
                onClear={() => setEventId(null)}
                selectedId={eventId}
                fetchOptions={fetchEventOptions}
                placeholder="Boiler Room Berlin"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Genre</label>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Subgenre</label>
                <input value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="Dark Techno" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Date</label>
                <input type="date" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Duration *</label>
                <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="90 min" className={inputClass} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--c2))' }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Set description..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* ─── Source section ─── */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Stream source</label>
              <div className="flex gap-1.5 mb-2">
                {(['youtube', 'soundcloud', 'hearthis', 'none'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setStreamSource(type)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                    style={{
                      background: streamSource === type ? 'hsl(var(--h3))' : 'hsl(var(--b4) / 0.5)',
                      color: streamSource === type ? 'white' : 'hsl(var(--c3))',
                    }}
                  >
                    {type === 'youtube' ? 'YouTube' : type === 'soundcloud' ? 'SoundCloud' : type === 'hearthis' ? 'HearThis' : 'None'}
                  </button>
                ))}
              </div>

              {/* YouTube: show video ID (manual or parsed) */}
              {streamSource === 'youtube' && (
                <div>
                  <input
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                    placeholder="YouTube video ID (optional)"
                    className={`${inputClass} font-mono text-xs`}
                  />
                  {videoId && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg mt-1.5" style={{ background: 'hsl(var(--b4) / 0.3)' }}>
                      <svg className="w-3 h-3 shrink-0" style={{ color: 'hsl(0, 70%, 55%)' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                      </svg>
                      <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--c3))' }}>{videoId}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SoundCloud / HearThis: URL input */}
              {(streamSource === 'soundcloud' || streamSource === 'hearthis') && (
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={streamSource === 'soundcloud' ? 'https://soundcloud.com/...' : 'https://hearthis.at/...'}
                  className={inputClass}
                />
              )}

              {/* None: just a note */}
              {streamSource === 'none' && (
                <p className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>
                  Set will be added without a stream source. Users can suggest sources later.
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-xs mt-2" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p>}
          {success && <p className="text-xs mt-2" style={{ color: 'hsl(var(--h3))' }}>{success}</p>}

          <div className="flex gap-3 pt-3 mt-auto">
            {onClose && (
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={isCreating || !title.trim() || !artist.trim() || !durationMinutes}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create DJ Set'}
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ Requests panel ═══ */}
      <RequestsPanel />

      {/* Import Artist modal */}
      {showArtistModal && (
        <ImportArtistModal
          onClose={() => { setShowArtistModal(false); pendingCreateRef.current = false }}
          onCreated={handleArtistCreated}
        />
      )}
    </div>
  )
}
