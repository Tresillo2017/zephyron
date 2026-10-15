import { useState, useCallback } from 'react'
import { createAnnotation } from '../../lib/api'
import { Button } from '../bleh/Button'
import { Input } from '../bleh/ui/Input'
import { Modal, ModalFooter, FooterFill } from '../bleh/ui/Modal'
import { Badge } from '../bleh/ui/Badge'
import { CheckFilled } from '@mingcute/react/core-filled'
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

  if (!isOpen) return null

  return (
    <Modal
      title={title}
      onClose={onClose}
      width={460}
      footer={success ? undefined : (
        <ModalFooter end>
          <FooterFill />
          <Button label="Cancel" appearance="ghost" onClick={onClose} />
          <Button
            label={isSubmitting ? 'Submitting...' : annotationType === 'delete' ? 'Flag as False' : 'Submit'}
            appearance={annotationType === 'delete' ? 'danger-primary' : 'primary'}
            onClick={handleSubmit}
            disabled={isSubmitting}
          />
        </ModalFooter>
      )}
    >
      {success ? (
        <div className="text-center py-8">
          <CheckFilled size={48} className="text-accent mx-auto mb-3" />
          <p className="text-text-primary font-medium">Annotation submitted</p>
          <p className="text-xs text-text-muted mt-1">Thank you for improving our tracklist</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Type selector (only when correcting an existing detection) */}
          {detection && (
            <div>
              <span className="ui-field-label block mb-2">Action</span>
              <div className="flex gap-2" role="group" aria-label="Action">
                <Button
                  label="Correct Track"
                  appearance={annotationType === 'correction' ? 'primary' : 'default'}
                  aria-pressed={annotationType === 'correction'}
                  onClick={() => setAnnotationType('correction')}
                  className="flex-1"
                />
                <Button
                  label="Not a Real Track"
                  appearance={annotationType === 'delete' ? 'danger' : 'default'}
                  aria-pressed={annotationType === 'delete'}
                  onClick={() => setAnnotationType('delete')}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* Original detection info */}
          {detection && annotationType === 'correction' && (
            <div className="rounded-[12px] p-3" style={{ boxShadow: 'var(--card-border)', background: 'oklch(var(--b5))' }}>
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
            <span className="ui-field-label block mb-2">
              Start Time {duration > 0 && <span className="text-text-muted font-normal">(max {formatTime(duration)})</span>}
            </span>
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
              <span className="ui-field-label block mb-2">
                End Time <span className="text-text-muted font-normal">(optional)</span>
              </span>
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
            <div className="rounded-[12px] p-3 bg-danger/5" style={{ boxShadow: 'var(--card-border)' }}>
              <p className="text-sm text-danger">
                This will flag "{detection.track_title}" as a false detection. Other users will be able to see this correction.
              </p>
            </div>
          )}

          {error && <Badge tone="error">{error}</Badge>}
        </div>
      )}
    </Modal>
  )
}
