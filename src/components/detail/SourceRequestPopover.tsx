import { useState } from 'react'
import { CheckFilled, CloseFilled } from '@mingcute/react/core-filled'
import { Button } from '../bleh'
import { submitSourceRequest } from '../../lib/api'

type SourceType = 'youtube' | 'soundcloud' | 'hearthis'

const SOURCE_TYPES: readonly SourceType[] = ['youtube', 'soundcloud', 'hearthis']

const SOURCE_LABELS: Record<SourceType, string> = {
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  hearthis: 'HearThis',
}

const SOURCE_PLACEHOLDERS: Record<SourceType, string> = {
  youtube: 'https://youtube.com/watch?v=...',
  soundcloud: 'https://soundcloud.com/...',
  hearthis: 'https://hearthis.at/...',
}

/** "Suggest a source" card shown on sets without a playable source. */
export function SourceRequestPopover({
  setId,
  onDismiss,
}: {
  setId: string
  onDismiss: () => void
}) {
  const [sourceType, setSourceType] = useState<SourceType>('youtube')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!sourceUrl.trim()) {
      setError('Please provide a URL')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await submitSourceRequest(setId, {
        source_type: sourceType,
        source_url: sourceUrl,
        notes: notes || undefined,
      })
      setSubmitted(true)
    } catch (e: unknown) {
      setError((e as { message?: string } | null)?.message || 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const dismissButton = (
    <button type="button" className="dt-icon-btn" onClick={onDismiss} aria-label="Dismiss source suggestion">
      <CloseFilled />
    </button>
  )

  if (submitted) {
    return (
      <div className="dt-popover">
        <div className="dt-popover-head">
          <div className="dt-popover-success">
            <CheckFilled />
            <div>
              <p className="dt-popover-title">Source suggestion submitted</p>
              <p className="dt-popover-sub">Thanks! An admin will review your suggestion.</p>
            </div>
          </div>
          {dismissButton}
        </div>
      </div>
    )
  }

  return (
    <div className="dt-popover">
      <div className="dt-popover-head">
        <div>
          <h2 className="dt-popover-title">Suggest a source</h2>
          <p className="dt-popover-sub">Know where to find this set? Help the community.</p>
        </div>
        {dismissButton}
      </div>

      {error && <p role="alert" className="dt-popover-error">{error}</p>}

      <div className="dt-popover-types" role="group" aria-label="Source platform">
        {SOURCE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className="dt-seg"
            aria-pressed={sourceType === type}
            onClick={() => setSourceType(type)}
          >
            {SOURCE_LABELS[type]}
          </button>
        ))}
      </div>

      <input
        type="url"
        aria-label="Source URL"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder={SOURCE_PLACEHOLDERS[sourceType]}
        className="dt-input"
      />

      <input
        type="text"
        aria-label="Optional note"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note..."
        className="dt-input"
        style={{ marginBottom: 12 }}
      />

      <Button
        appearance="primary"
        label={isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
        onClick={handleSubmit}
        disabled={isSubmitting || !sourceUrl.trim()}
        style={{ width: '100%' }}
      />
    </div>
  )
}
