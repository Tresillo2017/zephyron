import { useState, type FormEvent } from 'react'
import { CheckFilled } from '@mingcute/react/core-filled'
import { Button, ContentCard, EmptyState, FilterChip, Input, InlineAlert, Section, Select, Textarea, Toolbar } from '../components/bleh'
import { PageFrame } from '../components/shell'
import { submitSetRequest } from '../lib/api'
import { GENRES } from '../lib/constants'
import './library.css'

type SourceType = 'youtube' | 'soundcloud' | 'hearthis' | ''

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: '', label: 'Unknown' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'hearthis', label: 'HearThis.at' },
]

const URL_PLACEHOLDERS: Record<Exclude<SourceType, ''>, string> = {
  youtube: 'https://youtube.com/watch?v=...',
  soundcloud: 'https://soundcloud.com/...',
  hearthis: 'https://hearthis.at/...',
}

const GENRE_CHOICES = [
  { value: '', label: 'Select...' },
  ...GENRES.map((g) => ({ value: g, label: g })),
]

export function RequestSetPage() {
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [event, setEvent] = useState('')
  const [genre, setGenre] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
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
    <PageFrame>
      <ContentCard
        toolbar={
          <Toolbar>
            <h1 className="zl-toolbar-title">Request a set</h1>
            <span className="zl-toolbar-meta">Know a DJ set that should be on Zephyron?</span>
          </Toolbar>
        }
        main={
          <Section>
            {submittedId ? (
              <EmptyState
                icon={<CheckFilled />}
                title="Request submitted"
                description="Thanks! Our team will review your set request."
                action={<Button appearance="primary" label="Submit another" onClick={() => setSubmittedId(null)} />}
              />
            ) : (
              <form onSubmit={handleSubmit} className="zl-form zl-request" noValidate>
                <div className="zl-form-row">
                  <Input
                    label="Set name *"
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

                <div className="zl-form-field">
                  <span className="ui-field-label" id="zl-source-label">
                    Source <span className="zl-form-hint">(optional)</span>
                  </span>
                  <div className="zl-source-row" role="group" aria-labelledby="zl-source-label">
                    {SOURCE_OPTIONS.map((opt) => (
                      <FilterChip
                        key={opt.value || 'none'}
                        label={opt.label}
                        active={sourceType === opt.value}
                        onClick={() => { setSourceType(opt.value); if (!opt.value) setSourceUrl('') }}
                      />
                    ))}
                  </div>
                  {sourceType && (
                    <Input
                      aria-label="Source URL"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder={URL_PLACEHOLDERS[sourceType]}
                    />
                  )}
                </div>

                <div className="zl-form-row">
                  <Input
                    label="Event / Venue"
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    placeholder="e.g. Berghain"
                  />
                  <div className="zl-form-field">
                    <span className="ui-field-label" id="zl-genre-label">Genre</span>
                    <Select label="Genre" value={genre} options={GENRE_CHOICES} onChange={setGenre} />
                  </div>
                </div>

                <Textarea
                  label="Additional notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any extra info about the set (year, special occasion, tracklist link, etc.)"
                />

                {error && <InlineAlert tone="error">{error}</InlineAlert>}

                <div className="zl-form-actions">
                  <span className="zl-form-hint">Requests are reviewed by the Zephyron team.</span>
                  <Button
                    appearance="primary"
                    htmlButtonType="submit"
                    label={isSubmitting ? 'Submitting...' : 'Submit request'}
                    disabled={isSubmitting || !name.trim() || !artist.trim()}
                  />
                </div>
              </form>
            )}
          </Section>
        }
      />
    </PageFrame>
  )
}
