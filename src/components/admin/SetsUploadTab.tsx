import { useState } from 'react'
import { fetchYoutubeMetadata, getSetUploadUrl, adminCreateSet } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { GENRES } from '../../lib/constants'

export function SetsUploadTab() {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
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

  // Upload state
  const [uploadSetId, setUploadSetId] = useState('')
  const [uploadR2Key, setUploadR2Key] = useState('')
  const [audioFormat, setAudioFormat] = useState('mp3')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)

  // AI metadata state
  const [aiFields, setAiFields] = useState<Set<string>>(new Set())
  const [youtubeSource, setYoutubeSource] = useState<string | null>(null)
  const [hasTracklist, setHasTracklist] = useState(false)
  const [rawTags, setRawTags] = useState<string[]>([])
  const [thumbnailUrl, setThumbnailUrl] = useState('')
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
      setYoutubeSource(d.youtube_source)
      setHasTracklist(d.has_tracklist)
      setRawTags(d.raw_youtube_tags || [])
      if (d.thumbnail_url) setThumbnailUrl(d.thumbnail_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch YouTube data')
    } finally {
      setIsFetching(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    try {
      const res = await getSetUploadUrl(file.name, file.type)
      setUploadSetId(res.data.set_id)
      setUploadR2Key(res.data.r2_key)
      setAudioFormat(res.data.audio_format)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get upload URL')
    }
  }

  const handleUploadAndCreate = async () => {
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
      // Step 1: Create the set record FIRST (so upload can UPDATE it)
      setUploadProgress('Creating set record...')
      const durationSeconds = (parseInt(durationMinutes) || 60) * 60
      const setId = uploadSetId || undefined
      const placeholderKey = uploadR2Key || `sets/${setId || 'pending'}/audio.mp3`

      const res = await adminCreateSet({
        id: setId,
        title: title.trim(),
        artist: artist.trim(),
        description: description.trim() || undefined,
        genre: genre || undefined,
        subgenre: subgenre.trim() || undefined,
        venue: venue.trim() || undefined,
        event: event.trim() || undefined,
        recorded_date: recordedDate || undefined,
        duration_seconds: durationSeconds,
        r2_key: placeholderKey,
        audio_format: audioFormat,
        thumbnail_url: thumbnailUrl || undefined,
        source_url: youtubeUrl.trim() || undefined,
      })

      const createdId = res.data.id

      // Step 2: Upload file AFTER the record exists (so the backend UPDATE works)
      if (selectedFile) {
        setUploadProgress('Starting upload...')
        setUploadPercent(0)
        setIsUploading(true)

        // Upload via fetch and read SSE progress events from the response stream
        const uploadResp = await fetch(`/api/admin/sets/${createdId}/upload`, {
          method: 'PUT',
          headers: { 'Content-Type': selectedFile.type || 'audio/mpeg' },
          body: selectedFile,
        })

        if (!uploadResp.ok || !uploadResp.body) {
          const errText = await uploadResp.text()
          setError(`Audio upload failed: ${errText}`)
          setIsUploading(false)
          setUploadPercent(null)
          setUploadProgress(null)
          return
        }

        // Read the SSE stream for real-time progress
        const reader = uploadResp.body.getReader()
        const decoder = new TextDecoder()
        let sseBuffer = ''
        let uploadOk = false
        const fileSizeMB = (selectedFile.size / 1048576).toFixed(1)

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          sseBuffer += decoder.decode(value, { stream: true })

          // Parse SSE events (format: "data: {...}\n\n")
          const events = sseBuffer.split('\n\n')
          sseBuffer = events.pop() || '' // Keep incomplete event in buffer

          for (const eventStr of events) {
            const dataMatch = eventStr.match(/^data:\s*(.+)$/m)
            if (!dataMatch) continue

            try {
              const data = JSON.parse(dataMatch[1])

              switch (data.type) {
                case 'receiving': {
                  const receivedMB = (data.received / 1048576).toFixed(1)
                  setUploadProgress(`Receiving: ${receivedMB} / ${fileSizeMB} MB`)
                  setUploadPercent(data.percent)
                  break
                }
                case 'uploading_part':
                  setUploadProgress(`Storing part ${data.part} to cloud storage...`)
                  setUploadPercent(data.percent)
                  break
                case 'finalizing':
                  setUploadProgress('Finalizing upload...')
                  setUploadPercent(95)
                  break
                case 'complete':
                  setUploadPercent(100)
                  setUploadProgress('Upload complete!')
                  uploadOk = true
                  break
                case 'error':
                  setError(`Upload failed: ${data.message}`)
                  break
              }
            } catch {
              // Ignore unparseable SSE events
            }
          }
        }

        setIsUploading(false)

        if (!uploadOk) {
          if (!error) setError('Upload stream ended without completion')
          setUploadPercent(null)
          setUploadProgress(null)
          return
        }

        // Brief pause to show 100% before clearing
        await new Promise((r) => setTimeout(r, 500))
        setUploadPercent(null)
      }

      setSuccess(`Set created (ID: ${createdId}).${selectedFile ? ' Audio uploaded.' : ' No audio file — upload later from the Sets tab.'} You can now trigger ML detection.`)
      setUploadProgress(null)

      // Reset form
      setTitle(''); setArtist(''); setDescription(''); setGenre(''); setSubgenre('')
      setVenue(''); setEvent(''); setRecordedDate(''); setDurationMinutes('')
      setYoutubeUrl(''); setSelectedFile(null); setUploadSetId(''); setUploadR2Key('')
      setAiFields(new Set()); setYoutubeSource(null); setHasTracklist(false); setRawTags([])
      setUploadPercent(null); setThumbnailUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create set')
      setUploadProgress(null)
    } finally {
      setIsCreating(false)
      setIsUploading(false)
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
          Auto-fill from YouTube URL
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
            Fetching YouTube data and running AI analysis...
          </p>
        )}
      </div>

      {/* Source indicator */}
      {youtubeSource && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge variant={youtubeSource === 'youtube_api' ? 'accent' : 'muted'}>
            {youtubeSource === 'youtube_api' ? 'YouTube API' : 'oEmbed fallback'}
          </Badge>
          {aiFields.size > 0 && (
            <Badge variant="accent">{aiFields.size} fields auto-detected by AI</Badge>
          )}
          {hasTracklist && (
            <Badge variant="default">Tracklist found in description</Badge>
          )}
          {rawTags.length > 0 && (
            <span className="text-[10px] text-text-muted">
              Tags: {rawTags.slice(0, 5).join(', ')}{rawTags.length > 5 ? ` +${rawTags.length - 5}` : ''}
            </span>
          )}
        </div>
      )}

      <div className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Title<AiBadge field="title" />
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Set title" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Artist / DJ<AiBadge field="artist" />
            </label>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="DJ name" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:outline-none transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Venue<AiBadge field="venue" />
            </label>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Berghain" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Event<AiBadge field="event" />
            </label>
            <input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="Boiler Room Berlin" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:outline-none transition-colors" />
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
              className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary focus:outline-none focus:outline-none"
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
            <input value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g. Dark Techno" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Recorded Date<AiBadge field="recorded_date" />
            </label>
            <input type="date" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary focus:outline-none focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Duration (min)<AiBadge field="duration" />
            </label>
            <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="90" className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:outline-none transition-colors" />
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
            className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:outline-none resize-none"
          />
        </div>

        {/* File upload */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1.5">Audio File (MP3 / FLAC)</label>
          <input
            type="file"
            accept="audio/mpeg,audio/flac,audio/wav,.mp3,.flac,.wav"
            onChange={handleFileSelect}
            className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
          />
          {selectedFile && (
            <p className="text-xs text-text-muted mt-1">
              {selectedFile.name} ({(selectedFile.size / 1048576).toFixed(1)} MB)
            </p>
          )}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
        {success && <p className="text-xs text-accent">{success}</p>}

        {/* Upload progress bar */}
        {uploadPercent !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{uploadProgress}</span>
              <span className="text-accent font-medium tabular-nums">{uploadPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
            {/* Phase indicator */}
            <div className="flex justify-between text-[10px] text-text-muted">
              <span className={uploadPercent < 50 ? 'text-accent font-medium' : ''}>Receiving</span>
              <span className={uploadPercent >= 50 && uploadPercent < 95 ? 'text-accent font-medium' : ''}>Storing to R2</span>
              <span className={uploadPercent >= 95 ? 'text-accent font-medium' : ''}>Finalizing</span>
            </div>
          </div>
        )}

        {/* Non-upload progress messages (creating record, etc.) */}
        {uploadProgress && uploadPercent === null && (
          <p className="text-xs text-text-muted animate-pulse">{uploadProgress}</p>
        )}

        <Button
          variant="primary"
          onClick={handleUploadAndCreate}
          disabled={isCreating || isUploading || !title.trim() || !artist.trim()}
          className="w-full"
        >
          {isCreating ? 'Creating...' : 'Create DJ Set'}
        </Button>
      </div>
    </div>
  )
}
