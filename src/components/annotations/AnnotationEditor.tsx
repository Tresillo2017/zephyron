import { useState, useCallback } from 'react'
import { createAnnotation } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { formatTime } from '../../lib/formatTime'
import type { Detection } from '../../lib/types'

interface AnnotationEditorProps {
  setId: string
  duration: number
  /** If provided, this is a correction to an existing detection */
  detection?: Detection
  /** Pre-fill timestamp (e.g. from current playback position) */
  initialTime?: number
  isOpen: boolean
  onClose: () => void
  onSubmitted?: () => void
}

type AnnotationType = 'correction' | 'new_track' | 'delete'

export function AnnotationEditor({
  setId,
  duration,
  detection,
  initialTime,
  isOpen,
  onClose,
  onSubmitted,
}: AnnotationEditorProps) {
  const [annotationType, setAnnotationType] = useState<AnnotationType>(
    detection ? 'correction' : 'new_track'
  )
  const [trackTitle, setTrackTitle] = useState(detection?.track_title || '')
  const [trackArtist, setTrackArtist] = useState(detection?.track_artist || '')
  const [startMinutes, setStartMinutes] = useState(
    Math.floor((detection?.start_time_seconds ?? initialTime ?? 0) / 60).toString()
  )
  const [startSeconds, setStartSeconds] = useState(
    Math.floor(((detection?.start_time_seconds ?? initialTime ?? 0) % 60)).toString()
  )
  const [endMinutes, setEndMinutes] = useState(
    detection?.end_time_seconds ? Math.floor(detection.end_time_seconds / 60).toString() : ''
  )
  const [endSeconds, setEndSeconds] = useState(
    detection?.end_time_seconds ? Math.floor(detection.end_time_seconds % 60).toString() : ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const startTimeSeconds = (parseInt(startMinutes) || 0) * 60 + (parseInt(startSeconds) || 0)
  const endTimeSeconds = endMinutes
    ? (parseInt(endMinutes) || 0) * 60 + (parseInt(endSeconds) || 0)
    : undefined

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return

    // Validation
    if (annotationType !== 'delete' && !trackTitle.trim()) {
      setError('Track title is required')
      return
    }
    if (startTimeSeconds < 0 || startTimeSeconds > duration) {
      setError('Start time is out of range')
      return
    }
    if (endTimeSeconds !== undefined && (endTimeSeconds <= startTimeSeconds || endTimeSeconds > duration)) {
      setError('End time must be after start time and within set duration')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createAnnotation({
        detection_id: detection?.id,
        set_id: setId,
        track_title: annotationType === 'delete' ? (detection?.track_title || 'Deleted') : trackTitle.trim(),
        track_artist: trackArtist.trim() || undefined,
        start_time_seconds: startTimeSeconds,
        end_time_seconds: endTimeSeconds,
        annotation_type: annotationType,
      })

      setSuccess(true)
      setTimeout(() => {
        onSubmitted?.()
        onClose()
        // Reset state
        setSuccess(false)
        setTrackTitle('')
        setTrackArtist('')
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    annotationType, trackTitle, trackArtist, startTimeSeconds, endTimeSeconds,
    duration, setId, detection, isSubmitting, onClose, onSubmitted,
  ])

  const title = detection
    ? annotationType === 'delete' ? 'Remove Detection' : 'Correct Detection'
    : 'Add New Track'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {success ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-accent mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <p className="text-text-primary font-medium">Annotation submitted</p>
          <p className="text-xs text-text-muted mt-1">Thank you for improving our tracklist</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Type selector (only when correcting an existing detection) */}
          {detection && (
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">Action</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAnnotationType('correction')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    annotationType === 'correction'
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-surface-overlay text-text-secondary border border-border hover:border-border-light'
                  }`}
                >
                  Correct Track
                </button>
                <button
                  onClick={() => setAnnotationType('delete')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    annotationType === 'delete'
                      ? 'bg-danger/15 text-danger border border-danger/30'
                      : 'bg-surface-overlay text-text-secondary border border-border hover:border-border-light'
                  }`}
                >
                  Not a Real Track
                </button>
              </div>
            </div>
          )}

          {/* Original detection info */}
          {detection && annotationType === 'correction' && (
            <div className="bg-surface-overlay rounded-lg p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Original detection:</p>
              <p className="text-sm text-text-secondary">
                {detection.track_title}
                {detection.track_artist && ` - ${detection.track_artist}`}
                <span className="text-text-muted ml-2">at {formatTime(detection.start_time_seconds)}</span>
              </p>
            </div>
          )}

          {/* Track info fields (hidden for delete) */}
          {annotationType !== 'delete' && (
            <>
              <Input
                label="Track Title"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                placeholder="e.g. Strobe"
              />
              <Input
                label="Artist (optional)"
                value={trackArtist}
                onChange={(e) => setTrackArtist(e.target.value)}
                placeholder="e.g. Deadmau5"
              />
            </>
          )}

          {/* Time inputs */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Start Time {duration > 0 && <span className="text-text-muted font-normal">(max {formatTime(duration)})</span>}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={Math.floor(duration / 60)}
                value={startMinutes}
                onChange={(e) => setStartMinutes(e.target.value)}
                placeholder="min"
                className="w-20 text-center"
              />
              <span className="text-text-muted">:</span>
              <Input
                type="number"
                min={0}
                max={59}
                value={startSeconds}
                onChange={(e) => setStartSeconds(e.target.value)}
                placeholder="sec"
                className="w-20 text-center"
              />
              <span className="text-xs text-text-muted ml-2">
                = {formatTime(startTimeSeconds)}
              </span>
            </div>
          </div>

          {annotationType !== 'delete' && (
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">
                End Time <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={Math.floor(duration / 60)}
                  value={endMinutes}
                  onChange={(e) => setEndMinutes(e.target.value)}
                  placeholder="min"
                  className="w-20 text-center"
                />
                <span className="text-text-muted">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={endSeconds}
                  onChange={(e) => setEndSeconds(e.target.value)}
                  placeholder="sec"
                  className="w-20 text-center"
                />
                {endTimeSeconds !== undefined && (
                  <span className="text-xs text-text-muted ml-2">
                    = {formatTime(endTimeSeconds)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Delete confirmation */}
          {annotationType === 'delete' && detection && (
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
              <p className="text-sm text-danger">
                This will flag "{detection.track_title}" as a false detection. Other users will be able to see this correction.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant={annotationType === 'delete' ? 'danger' : 'primary'}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting
                ? 'Submitting...'
                : annotationType === 'delete'
                ? 'Flag as False'
                : 'Submit'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
