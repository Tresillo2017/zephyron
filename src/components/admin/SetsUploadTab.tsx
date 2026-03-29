import { useState } from 'react'
import { fetchYoutubeMetadata, adminCreateSet } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
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

  // Invidious-specific metadata (stored for set creation)
  const [videoId, setVideoId] = useState('')
  const [channelId, setChannelId] = useState('')
  const [channelName, setChannelName] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [viewCount, setViewCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [storyboardData, setStoryboardData] = useState<string | null>(null)
  const [musicTracks, setMusicTracks] = useState<{ song: string; artist: string; album: string }[]>([])

  const handleFetchYoutube = async () => {
    if (!youtubeUrl.trim()) return
    setIsFetching(true)
    setError(null)
    try {
      const res = await fetchYoutubeMetadata(youtubeUrl.trim())
      const d = res.data
      const filled = new Set<string>()

      // Fill all available fields
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
        // Match to our genre list (case-insensitive)
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

      // Store Invidious metadata for set creation
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
        // Invidious metadata
        youtube_video_id: videoId || undefined,
        youtube_channel_id: channelId || undefined,
        youtube_channel_name: channelName || undefined,
        youtube_published_at: publishedAt || undefined,
        youtube_view_count: viewCount || undefined,
        youtube_like_count: likeCount || undefined,
        storyboard_data: storyboardData || undefined,
        keywords: rawKeywords.length > 0 ? rawKeywords : undefined,
        youtube_music_tracks: musicTracks.length > 0 ? JSON.stringify(musicTracks) : undefined,
      })

      const createdId = res.data.id
      setSuccess(`Set created (ID: ${createdId}). Audio will stream from YouTube via Invidious. You can now trigger ML detection from the ML Pipeline tab.`)

      // Reset form
      setTitle(''); setArtist(''); setDescription(''); setGenre(''); setSubgenre('')
      setVenue(''); setEvent(''); setRecordedDate(''); setDurationMinutes('')
      setYoutubeUrl(''); setThumbnailUrl('')
      setAiFields(new Set()); setDataSource(null); setHasTracklist(false); setRawKeywords([])
      setVideoId(''); setChannelId(''); setChannelName(''); setPublishedAt('')
      setViewCount(0); setLikeCount(0); setStoryboardData(null); setMusicTracks([])
      onSetCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create set')
    } finally {
      setIsCreating(false)
    }
  }

  /** Small badge showing a field was auto-filled by AI */
  const AiBadge = ({ field }: { field: string }) =>
    aiFields.has(field) ? (
      <span className="ml-1.5 inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium bg-accent/10 text-accent">
        AI
      </span>
    ) : null

  return (
    <div className="max-w-2xl">
      {/* YouTube fetch */}
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

      {/* Source indicator */}
      {dataSource && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge variant="accent">Invidious API</Badge>
          {aiFields.size > 0 && (
            <Badge variant="accent">{aiFields.size} fields auto-detected by AI</Badge>
          )}
          {hasTracklist && (
            <Badge variant="default">Tracklist found in description</Badge>
          )}
          {viewCount > 0 && (
            <span className="text-[10px] text-text-muted">
              {viewCount.toLocaleString()} views
            </span>
          )}
          {likeCount > 0 && (
            <span className="text-[10px] text-text-muted">
              {likeCount.toLocaleString()} likes
            </span>
          )}
          {rawKeywords.length > 0 && (
            <span className="text-[10px] text-text-muted">
              Tags: {rawKeywords.slice(0, 5).join(', ')}{rawKeywords.length > 5 ? ` +${rawKeywords.length - 5}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Music tracks from YouTube auto-detection */}
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

      <div className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Title<AiBadge field="title" />
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Set title" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Artist / DJ<AiBadge field="artist" />
            </label>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="DJ name" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Venue<AiBadge field="venue" />
            </label>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Berghain" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Event<AiBadge field="event" />
            </label>
            <input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="Boiler Room Berlin" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Genre<AiBadge field="genre" />
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary focus:outline-none"
            >
              <option value="">Select...</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Subgenre<AiBadge field="subgenre" />
            </label>
            <input value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g. Dark Techno" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Recorded Date<AiBadge field="recorded_date" />
            </label>
            <input type="date" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Duration (min)<AiBadge field="duration" />
            </label>
            <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="90" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors" />
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
            className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
          />
        </div>

        {/* Streaming info */}
        {videoId && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'hsl(var(--b4) / 0.3)' }}>
            <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788" />
            </svg>
            <span className="text-xs text-text-muted">
              Audio will stream directly from YouTube via Invidious — no file upload needed
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
