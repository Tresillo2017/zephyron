import { useState, useEffect } from 'react'
import { fetchPendingAnnotations, moderateAnnotation } from '../../lib/api'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatTime, formatRelativeTime } from '../../lib/formatTime'

interface PendingAnnotation {
  id: string
  set_id: string
  detection_id: string | null
  track_title: string
  track_artist: string | null
  start_time_seconds: number
  annotation_type: string
  status: string
  created_at: string
  set_title: string
  set_artist: string
  original_track_title: string | null
  original_track_artist: string | null
  original_confidence: number | null
}

export function ModerationTab() {
  const [annotations, setAnnotations] = useState<PendingAnnotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [moderating, setModerating] = useState<string | null>(null)

  const loadAnnotations = () => {
    setIsLoading(true)
    fetchPendingAnnotations()
      .then((res) => setAnnotations(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadAnnotations() }, [])

  const handleModerate = async (id: string, action: 'approve' | 'reject') => {
    setModerating(id)
    try {
      await moderateAnnotation(id, action)
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
    } catch {
      // silent
    } finally {
      setModerating(null)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">Loading...</p>
  }

  if (annotations.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-text-muted/30 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
        <p className="text-text-muted text-sm">No pending annotations to review.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-text-muted mb-4">{annotations.length} pending annotation{annotations.length !== 1 ? 's' : ''}</p>

      <div className="space-y-3">
        {annotations.map((ann) => (
          <div key={ann.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge
                  variant={
                    ann.annotation_type === 'correction' ? 'default'
                      : ann.annotation_type === 'new_track' ? 'accent'
                      : 'default'
                  }
                >
                  {ann.annotation_type === 'correction' ? 'Correction'
                    : ann.annotation_type === 'new_track' ? 'New Track'
                    : 'Flag as False'}
                </Badge>
                <span className="text-xs text-text-muted ml-2">{formatRelativeTime(ann.created_at)}</span>
              </div>
              <span className="text-xs text-text-muted">
                in {ann.set_title} by {ann.set_artist}
              </span>
            </div>

            {/* Original vs proposed */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              {ann.original_track_title && (
                <div className="bg-surface-overlay rounded p-2">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Original Detection</p>
                  <p className="text-sm text-text-secondary">
                    {ann.original_track_title}
                    {ann.original_track_artist && <span className="text-text-muted"> - {ann.original_track_artist}</span>}
                  </p>
                  {ann.original_confidence != null && (
                    <p className="text-xs text-text-muted mt-0.5">{Math.round(ann.original_confidence * 100)}% confidence</p>
                  )}
                </div>
              )}
              <div className="bg-surface-overlay rounded p-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Proposed</p>
                <p className="text-sm text-text-primary">
                  {ann.track_title}
                  {ann.track_artist && <span className="text-text-secondary"> - {ann.track_artist}</span>}
                </p>
                <p className="text-xs text-text-muted mt-0.5">at {formatTime(ann.start_time_seconds)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleModerate(ann.id, 'approve')}
                disabled={moderating === ann.id}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleModerate(ann.id, 'reject')}
                disabled={moderating === ann.id}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
