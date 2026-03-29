import { useState, useCallback } from 'react'
import { fetchYoutubeMetadata, adminCreateSet, fetchArtists, fetchEvents, import1001Tracklists, type Track1001Preview } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { AutocompleteInput, type AutocompleteOption } from '../ui/AutocompleteInput'
import { parse1001TracklistFromHtml } from '../../lib/parse-1001tracklists'
import { GENRES } from '../../lib/constants'

export function SetsUploadTab({ onSetCreated }: { onSetCreated?: () => void } = {}) {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isFetching, setIsFetching] = useState(false)
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

  // AI metadata state
  const [aiFields, setAiFields] = useState<Set<string>>(new Set())
  const [dataSource, setDataSource] = useState<string | null>(null)
  const [hasTracklist, setHasTracklist] = useState(false)
  const [rawKeywords, setRawKeywords] = useState<string[]>([])
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  // Invidious-specific metadata
  const [videoId, setVideoId] = useState('')
  const [channelId, setChannelId] = useState('')
  const [channelName, setChannelName] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [viewCount, setViewCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [storyboardData, setStoryboardData] = useState<string | null>(null)
  const [musicTracks, setMusicTracks] = useState<{ song: string; artist: string; album: string }[]>([])

  // 1001Tracklists
  const [tracklistUrl, setTracklistUrl] = useState('')
  const [tracklistHtml, setTracklistHtml] = useState('')
  const [isParsing1001, setIsParsing1001] = useState(false)
  const [isImporting1001, setIsImporting1001] = useState(false)
  const [parsedTracks, setParsedTracks] = useState<Track1001Preview[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  // Linked artist/event IDs
  const [artistId, setArtistId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)

  // Created set ID (for post-creation 1001tl paste)
  const [createdSetId, setCreatedSetId] = useState<string | null>(null)

  // Autocomplete fetch functions
  const fetchArtistOptions = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
    const res = await fetchArtists(q)
    return (res.data || []).map((a: any) => ({
      id: a.id,
      label: a.name,
      sublabel: a.set_count ? `${a.set_count} sets` : undefined,
    }))
  }, [])

  const fetchEventOptions = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
    const res = await fetchEvents(q)
    return (res.data || []).map((e: any) => ({
      id: e.id,
      label: e.name,
      sublabel: e.series || undefined,
    }))
  }, [])

  const handleFetchYoutube = async () => {
    if (!youtubeUrl.trim()) return
    setIsFetching(true)
    setError(null)
    try {
      const res = await fetchYoutubeMetadata(youtubeUrl.trim())
      const d = res.data
      const filled = new Set<string>()

      if (d.title) { setTitle(d.title); filled.add('title') }
      if (d.artist) { setArtist(d.artist); filled.add('artist') }
      if (d.description) { setDescription(d.description); filled.add('description') }
      if (d.venue) { setVenue(d.venue); filled.add('venue') }
      if (d.event) { setEvent(d.event); filled.add('event') }
      if (d.recorded_date) { setRecordedDate(d.recorded_date); filled.add('recorded_date') }
      if (d.duration_seconds > 0) {
        setDurationMinutes(Math.round(d.duration_seconds / 60).toString())
        filled.add('duration')
      }
      if (d.genre) {
        const matched = GENRES.find((g) => g.toLowerCase() === d.genre.toLowerCase())
        if (matched) { setGenre(matched); filled.add('genre') }
        else { setGenre(d.genre); filled.add('genre') }
      }
      if (d.subgenre) { setSubgenre(d.subgenre); filled.add('subgenre') }

      setAiFields(filled)
      setDataSource(d.data_source)
      setHasTracklist(d.has_tracklist)
      setRawKeywords(d.raw_keywords || [])
      if (d.thumbnail_url) setThumbnailUrl(d.thumbnail_url)

      setVideoId(d.youtube_video_id || '')
      setChannelId(d.youtube_channel_id || '')
      setChannelName(d.youtube_channel_name || '')
      setPublishedAt(d.youtube_published_at || '')
      setViewCount(d.youtube_view_count || 0)
      setLikeCount(d.youtube_like_count || 0)
      setStoryboardData(d.storyboard_data || null)
      setMusicTracks(d.music_tracks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch video data')
    } finally {
      setIsFetching(false)
    }
  }

  const handleParse1001Html = () => {
    if (!tracklistHtml.trim()) return

    setIsParsing1001(true)
    setParseError(null)
    setImportSuccess(null)
    try {
      const tracks = parse1001TracklistFromHtml(tracklistHtml)
      if (tracks.length === 0) {
        setParseError('No tracks found. Make sure you pasted the full page source (Ctrl+U), not just the visible text.')
      } else {
        setParsedTracks(tracks as Track1001Preview[])
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse HTML')
    } finally {
      setIsParsing1001(false)
    }
  }

  const handleImport1001Tracks = async () => {
    if (!createdSetId || parsedTracks.length === 0) return

    setIsImporting1001(true)
    setImportSuccess(null)
    setParseError(null)
    try {
      const res = await import1001Tracklists(createdSetId, parsedTracks)
      setImportSuccess(`Imported ${res.data.imported} tracks as detections. The tracklist is now live.`)
      setParsedTracks([])
      setTracklistHtml('')
      onSetCreated?.()
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to import tracks')
    } finally {
      setIsImporting1001(false)
    }
  }

  const handleCreate = async () => {
    const errors: string[] = []
    if (!title.trim()) errors.push('title')
    if (!artist.trim()) errors.push('artist')
    if (!durationMinutes) errors.push('duration')

    if (errors.length > 0) {
      setError(`Please fill in: ${errors.join(', ')}`)
      return
    }

    setIsCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const durationSeconds = (parseInt(durationMinutes) || 60) * 60

      const res = await adminCreateSet({
        title: title.trim(),
        artist: artist.trim(),
        description: description.trim() || undefined,
        genre: genre || undefined,
        subgenre: subgenre.trim() || undefined,
        venue: venue.trim() || undefined,
        event: event.trim() || undefined,
        recorded_date: recordedDate || undefined,
        duration_seconds: durationSeconds,
        thumbnail_url: thumbnailUrl || undefined,
        source_url: youtubeUrl.trim() || undefined,
        youtube_video_id: videoId || undefined,
        youtube_channel_id: channelId || undefined,
        youtube_channel_name: channelName || undefined,
        youtube_published_at: publishedAt || undefined,
        youtube_view_count: viewCount || undefined,
        youtube_like_count: likeCount || undefined,
        storyboard_data: storyboardData || undefined,
        keywords: rawKeywords.length > 0 ? rawKeywords : undefined,
        youtube_music_tracks: musicTracks.length > 0 ? JSON.stringify(musicTracks) : undefined,
        tracklist_1001_url: tracklistUrl.trim() || undefined,
        artist_id: artistId || undefined,
        event_id: eventId || undefined,
      })

      const id = res.data.id
      setCreatedSetId(id)

      // If tracks were already parsed from 1001tracklists, import them immediately
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
        setSuccess(`Set created (${id}). Open Edit to import a tracklist from 1001Tracklists, or trigger ML detection.`)
      }

      // Reset form (keep 1001tl parsed state if import failed)
      setTitle(''); setArtist(''); setDescription(''); setGenre(''); setSubgenre('')
      setVenue(''); setEvent(''); setRecordedDate(''); setDurationMinutes('')
      setYoutubeUrl(''); setThumbnailUrl('')
      setAiFields(new Set()); setDataSource(null); setHasTracklist(false); setRawKeywords([])
      setVideoId(''); setChannelId(''); setChannelName(''); setPublishedAt('')
      setViewCount(0); setLikeCount(0); setStoryboardData(null); setMusicTracks([])
      setTracklistUrl('')
      setArtistId(null); setEventId(null)
      onSetCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create set')
    } finally {
      setIsCreating(false)
    }
  }

  const AiBadge = ({ field }: { field: string }) =>
    aiFields.has(field) ? (
      <span className="ml-1.5 inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium bg-accent/10 text-accent">
        AI
      </span>
    ) : null

  const inputClass = 'w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors'

  return (
    <div className="max-w-2xl">
      {/* ═══ STEP 1: YouTube Import ═══ */}
      <div className="mb-6">
        <label className="text-sm font-medium text-text-secondary block mb-2">
          Import from YouTube URL
        </label>
        <div className="flex gap-2">
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleFetchYoutube()}
          />
          <Button onClick={handleFetchYoutube} disabled={isFetching || !youtubeUrl.trim()}>
            {isFetching ? 'Analyzing...' : 'Fetch & Analyze'}
          </Button>
        </div>
        {isFetching && (
          <p className="text-xs text-text-muted mt-2 animate-pulse">
            Fetching video data via Invidious and running AI analysis...
          </p>
        )}
      </div>

      {/* Source indicator badges */}
      {dataSource && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge variant="accent">Invidious API</Badge>
          {aiFields.size > 0 && <Badge variant="accent">{aiFields.size} fields auto-detected</Badge>}
          {hasTracklist && <Badge variant="default">Tracklist in description</Badge>}
          {viewCount > 0 && <span className="text-[10px] text-text-muted">{viewCount.toLocaleString()} views</span>}
          {likeCount > 0 && <span className="text-[10px] text-text-muted">{likeCount.toLocaleString()} likes</span>}
          {rawKeywords.length > 0 && (
            <span className="text-[10px] text-text-muted">
              Tags: {rawKeywords.slice(0, 5).join(', ')}{rawKeywords.length > 5 ? ` +${rawKeywords.length - 5}` : ''}
            </span>
          )}
        </div>
      )}

      {/* YouTube music tracks preview */}
      {musicTracks.length > 0 && (
        <div className="mb-4 card !p-3">
          <p className="text-xs font-medium text-text-secondary mb-2">
            YouTube Music Tracks ({musicTracks.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {musicTracks.map((t, i) => (
              <p key={i} className="text-xs text-text-muted font-mono truncate">
                {t.artist} — {t.song}{t.album ? ` [${t.album}]` : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP 2: 1001Tracklists ═══ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-text-secondary">
            1001Tracklists
          </label>
          <span className="text-[10px] text-text-muted">(optional — rich track metadata with artwork + service links)</span>
        </div>

        {/* URL input */}
        <Input
          value={tracklistUrl}
          onChange={(e) => setTracklistUrl(e.target.value)}
          placeholder="https://www.1001tracklists.com/tracklist/..."
          className="w-full mb-3"
        />

        {/* Manual HTML paste */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'hsl(var(--b5) / 0.5)', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.3)' }}
        >
          <div className="flex items-start gap-2 mb-3">
            <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'hsl(var(--h3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--c1))' }}>Paste page source</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
                Open the 1001tracklists page in your browser, press <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'hsl(var(--b3))', color: 'hsl(var(--c2))' }}>Ctrl+U</kbd> to view source, select all (<kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'hsl(var(--b3))', color: 'hsl(var(--c2))' }}>Ctrl+A</kbd>), copy, and paste below.
              </p>
            </div>
          </div>

          <textarea
            value={tracklistHtml}
            onChange={(e) => setTracklistHtml(e.target.value)}
            placeholder="Paste the full page source HTML here..."
            rows={4}
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
              onClick={handleParse1001Html}
              disabled={isParsing1001 || !tracklistHtml.trim()}
            >
              {isParsing1001 ? 'Parsing...' : 'Parse Tracklist'}
            </Button>
            {tracklistHtml.trim() && (
              <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--c3))' }}>
                {(tracklistHtml.length / 1024).toFixed(0)} KB pasted
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
          {parseError && <p className="text-[10px] mt-2" style={{ color: 'hsl(0, 60%, 55%)' }}>{parseError}</p>}
          {importSuccess && <p className="text-[10px] mt-2" style={{ color: 'hsl(var(--h3))' }}>{importSuccess}</p>}
        </div>

        {/* Parsed tracks preview */}
        {parsedTracks.length > 0 && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ background: 'hsl(var(--b5) / 0.5)' }}>
              <span className="text-xs font-medium" style={{ color: 'hsl(var(--h3))' }}>
                {parsedTracks.length} tracks parsed
              </span>
              <Badge variant="accent">1001Tracklists</Badge>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: 'hsl(var(--b4) / 0.15)' }}>
              {parsedTracks.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs"
                  style={{ background: i % 2 === 0 ? 'transparent' : 'hsl(var(--b5) / 0.2)' }}
                >
                  {/* Artwork */}
                  {t.artwork_url ? (
                    <img src={t.artwork_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ background: 'hsl(var(--b4) / 0.5)' }}>
                      <svg className="w-3 h-3" style={{ color: 'hsl(var(--c3) / 0.4)' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}

                  {/* Position */}
                  <span className="w-6 text-right font-mono tabular-nums shrink-0" style={{ color: t.is_continuation ? 'hsl(var(--h3) / 0.5)' : 'hsl(var(--c3))' }}>
                    {t.is_continuation ? 'w/' : String(t.position).padStart(2, '0')}
                  </span>

                  {/* Cue time */}
                  {t.cue_time && (
                    <span className="font-mono tabular-nums shrink-0" style={{ color: 'hsl(var(--c3))' }}>
                      {t.cue_time}
                    </span>
                  )}

                  {/* Artist + Title */}
                  <div className="flex-1 min-w-0">
                    <span style={{ color: 'hsl(var(--c2))' }}>{t.artist}</span>
                    <span style={{ color: 'hsl(var(--c3))' }}> — </span>
                    <span style={{ color: 'hsl(var(--c1))' }}>{t.title}</span>
                  </div>

                  {/* Label */}
                  {t.label && (
                    <span className="font-mono shrink-0 truncate max-w-24" style={{ color: 'hsl(var(--c3))' }}>
                      [{t.label}]
                    </span>
                  )}

                  {/* Service dots */}
                  <div className="flex gap-1 shrink-0">
                    {t.spotify_url && <div className="w-2 h-2 rounded-full" style={{ background: '#1DB954' }} title="Spotify" />}
                    {t.apple_music_url && <div className="w-2 h-2 rounded-full" style={{ background: '#FA243C' }} title="Apple Music" />}
                    {t.soundcloud_url && <div className="w-2 h-2 rounded-full" style={{ background: '#FF6100' }} title="SoundCloud" />}
                    {t.beatport_url && <div className="w-2 h-2 rounded-full" style={{ background: '#94D500' }} title="Beatport" />}
                  </div>
                </div>
              ))}
            </div>
            {/* Import button — show if set exists and tracks weren't auto-imported */}
            {createdSetId ? (
              <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'hsl(var(--b5) / 0.5)', borderTop: '1px solid hsl(var(--b4) / 0.15)' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImport1001Tracks}
                  disabled={isImporting1001}
                >
                  {isImporting1001 ? 'Importing...' : `Import ${parsedTracks.length} tracks`}
                </Button>
                <span className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>
                  into set {createdSetId.slice(0, 8)}...
                </span>
              </div>
            ) : (
              <div className="px-3 py-2" style={{ background: 'hsl(var(--b5) / 0.3)', borderTop: '1px solid hsl(var(--b4) / 0.15)' }}>
                <p className="text-[10px]" style={{ color: 'hsl(var(--c3))' }}>
                  Tracks will be imported automatically when you create the set.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ STEP 3: Set Metadata ═══ */}
      <div className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Title<AiBadge field="title" />
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Set title" className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Artist / DJ<AiBadge field="artist" />
            </label>
            <AutocompleteInput
              value={artist}
              onChange={setArtist}
              onSelect={(opt) => setArtistId(opt.id)}
              onClear={() => setArtistId(null)}
              selectedId={artistId}
              fetchOptions={fetchArtistOptions}
              placeholder="DJ name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Venue<AiBadge field="venue" />
            </label>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Berghain" className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Event<AiBadge field="event" />
            </label>
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
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Genre<AiBadge field="genre" />
            </label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Subgenre<AiBadge field="subgenre" />
            </label>
            <input value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g. Dark Techno" className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Recorded Date<AiBadge field="recorded_date" />
            </label>
            <input type="date" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Duration (min)<AiBadge field="duration" />
            </label>
            <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="90" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1.5">
            Description<AiBadge field="description" />
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Set description..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Streaming info */}
        {videoId && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'hsl(var(--b4) / 0.3)' }}>
            <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788" />
            </svg>
            <span className="text-xs text-text-muted">
              Audio streams from YouTube via Invidious — no file upload needed
            </span>
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}
        {success && <p className="text-xs text-accent">{success}</p>}

        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={isCreating || !title.trim() || !artist.trim()}
          className="w-full"
        >
          {isCreating ? 'Creating...' : 'Create DJ Set'}
        </Button>
      </div>
    </div>
  )
}
