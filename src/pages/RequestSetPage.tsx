import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { submitSetRequest } from '../lib/api'
import { GENRES } from '../lib/constants'

export function RequestSetPage() {
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [sourceType, setSourceType] = useState<'youtube' | 'soundcloud' | 'hearthis' | ''>('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [event, setEvent] = useState('')
  const [genre, setGenre] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !artist.trim()) {
      setError('Set name and DJ/Artist are required')
      return
    }

    // Require URL if source type is selected
    if (sourceType && !sourceUrl.trim()) {
      setError('Please provide a URL for the selected source type')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitSetRequest({
        name: name.trim(),
        artist: artist.trim(),
        source_type: sourceType || undefined,
        source_url: sourceUrl.trim() || undefined,
        event: event.trim() || undefined,
        genre: genre || undefined,
        notes: notes.trim() || undefined,
      })
      setSubmittedId(res.data.id)
      setName(''); setArtist(''); setSourceType(''); setSourceUrl('')
      setEvent(''); setGenre(''); setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>Request a Set</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--c3))' }}>
          Know a DJ set that should be on Zephyron? Submit a request and our team will review it.
        </p>
      </div>

      {submittedId ? (
        <div className="card text-center py-10">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'hsl(var(--h3) / 0.1)' }}
          >
            <svg className="w-7 h-7" style={{ color: 'hsl(var(--h3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-base font-[var(--font-weight-bold)] mb-2" style={{ color: 'hsl(var(--c1))' }}>Request Submitted</h2>
          <p className="text-sm mb-6" style={{ color: 'hsl(var(--c3))' }}>
            Thanks! Our team will review your set request.
          </p>
          <Button variant="primary" size="sm" onClick={() => setSubmittedId(null)}>
            Submit Another
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Set Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boiler Room Berlin"
            />
            <Input
              label="DJ / Artist *"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. Ben Klock"
            />
          </div>

          {/* Source type (optional) */}
          <div>
            <label className="text-sm font-[var(--font-weight-medium)] block mb-2" style={{ color: 'hsl(var(--c2))' }}>
              Source <span style={{ color: 'hsl(var(--c3))' }}>(optional)</span>
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {(['', 'youtube', 'soundcloud', 'hearthis'] as const).map((type) => (
                <button
                  type="button"
                  key={type || 'none'}
                  onClick={() => { setSourceType(type); if (!type) setSourceUrl('') }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: sourceType === type ? 'hsl(var(--h3))' : 'hsl(var(--b4) / 0.4)',
                    color: sourceType === type ? 'white' : 'hsl(var(--c3))',
                  }}
                >
                  {type === '' ? 'Unknown' : type === 'youtube' ? 'YouTube' : type === 'soundcloud' ? 'SoundCloud' : 'HearThis.at'}
                </button>
              ))}
            </div>
            {sourceType && (
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={
                  sourceType === 'youtube'
                    ? 'https://youtube.com/watch?v=...'
                    : sourceType === 'soundcloud'
                      ? 'https://soundcloud.com/...'
                      : 'https://hearthis.at/...'
                }
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Event / Venue"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="e.g. Berghain"
            />
            <div>
              <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
              >
                <option value="">Select...</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any extra info about the set (year, special occasion, tracklist link, etc.)"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none placeholder:text-text-muted focus:outline-none"
              style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
            />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'hsl(0 60% 50% / 0.1)', color: 'hsl(0 60% 55%)' }}>
              {error}
            </p>
          )}

          <Button
            variant="primary"
            className="w-full"
            disabled={isSubmitting || !name.trim() || !artist.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>

          <p className="text-xs text-center" style={{ color: 'hsl(var(--c3))' }}>
            Requests are reviewed by the Zephyron team.
          </p>
        </form>
      )}
    </div>
  )
}
