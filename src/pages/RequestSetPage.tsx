import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { submitSetRequest } from '../lib/api'
import { GENRES } from '../lib/constants'

declare const __TURNSTILE_SITE_KEY__: string

export function RequestSetPage() {
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [event, setEvent] = useState('')
  const [genre, setGenre] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ issue_url: string; issue_number: number } | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const renderTurnstile = useCallback(() => {
    if (!turnstileRef.current) return
    if (typeof __TURNSTILE_SITE_KEY__ === 'undefined' || !__TURNSTILE_SITE_KEY__) return
    const turnstile = (window as any).turnstile
    if (!turnstile) return

    // Clean up existing widget
    if (widgetIdRef.current) {
      try { turnstile.remove(widgetIdRef.current) } catch { /* ok */ }
    }

    widgetIdRef.current = turnstile.render(turnstileRef.current, {
      sitekey: __TURNSTILE_SITE_KEY__,
      theme: 'dark',
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(null),
      'error-callback': () => setTurnstileToken(null),
    })
  }, [])

  useEffect(() => {
    // Load Turnstile script if not already present
    if (typeof __TURNSTILE_SITE_KEY__ === 'undefined' || !__TURNSTILE_SITE_KEY__) return

    const existingScript = document.querySelector('script[src*="turnstile"]')
    if (existingScript) {
      renderTurnstile()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => renderTurnstile()
    document.head.appendChild(script)

    return () => {
      if (widgetIdRef.current) {
        try { (window as any).turnstile?.remove(widgetIdRef.current) } catch { /* ok */ }
      }
    }
  }, [renderTurnstile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !artist.trim() || !youtubeUrl.trim()) {
      setError('Please fill in all required fields')
      return
    }

    if (!turnstileToken) {
      setError('Please complete the verification challenge')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitSetRequest({
        name: name.trim(),
        artist: artist.trim(),
        youtube_url: youtubeUrl.trim(),
        event: event.trim() || undefined,
        genre: genre || undefined,
        notes: notes.trim() || undefined,
        turnstile_token: turnstileToken,
      })
      setSuccess(res.data)
      // Reset form
      setName(''); setArtist(''); setYoutubeUrl(''); setEvent(''); setGenre(''); setNotes('')
      setTurnstileToken(null)
      // Reset turnstile widget
      if (widgetIdRef.current) {
        try { (window as any).turnstile?.reset(widgetIdRef.current) } catch { /* ok */ }
      }
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
          Know a DJ set that should be on Zephyron? Submit a request and we'll review it.
        </p>
      </div>

      {success ? (
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
          <p className="text-sm mb-4" style={{ color: 'hsl(var(--c3))' }}>
            Your set request has been submitted as issue #{success.issue_number}.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href={success.issue_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-4 py-2 rounded-lg text-sm no-underline transition-colors"
              style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c2))' }}
            >
              View on GitHub
            </a>
            <Button variant="primary" size="sm" onClick={() => setSuccess(null)}>
              Submit Another
            </Button>
          </div>
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

          <Input
            label="YouTube URL *"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />

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

          {/* Turnstile widget */}
          <div ref={turnstileRef} className="flex justify-center" />

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'hsl(0 60% 50% / 0.1)', color: 'hsl(0 60% 55%)' }}>
              {error}
            </p>
          )}

          <Button
            variant="primary"
            className="w-full"
            disabled={isSubmitting || !name.trim() || !artist.trim() || !youtubeUrl.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>

          <p className="text-xs text-center" style={{ color: 'hsl(var(--c3))' }}>
            Requests are reviewed by the team. You can track the status on{' '}
            <a
              href="https://github.com/Tresillo2017/zephyron/issues?q=label%3Aset-request"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline no-underline"
            >
              GitHub
            </a>.
          </p>
        </form>
      )}
    </div>
  )
}
