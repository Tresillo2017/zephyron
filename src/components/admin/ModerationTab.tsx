import { useState, useEffect } from 'react'
import { fetchPendingAnnotations, moderateAnnotation } from '../../lib/api'
import { Card } from '../bleh'
import { formatTime, formatRelativeTime } from '../../lib/formatTime'
import { AdminBadge, AdminButton, cellMuted } from './adminUi'

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

const TYPE_LABEL: Record<string, string> = {
  correction: 'Correction',
  new_track: 'New Track',
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
    return <p className={cellMuted}>Loading...</p>
  }

  if (annotations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <svg className="h-10 w-10 text-muted/40" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
        <p className="text-[13px] text-muted">No pending annotations to review.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">
        {annotations.length} pending annotation{annotations.length !== 1 ? 's' : ''}
      </p>

      {annotations.map((ann) => (
        <Card key={ann.id} className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <AdminBadge variant={ann.annotation_type === 'new_track' ? 'accent' : 'default'}>
                {TYPE_LABEL[ann.annotation_type] ?? 'Flag as False'}
              </AdminBadge>
              <span className="text-[12px] text-muted">{formatRelativeTime(ann.created_at)}</span>
            </div>
            <span className="min-w-0 truncate text-[12px] text-muted">
              in {ann.set_title} by {ann.set_artist}
            </span>
          </div>

          {/* Original vs proposed */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ann.original_track_title && (
              <div className="rounded-item bg-b4/40 p-3 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--b4),transparent_75%)]">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Original Detection</p>
                <p className="text-[13px] text-text">
                  {ann.original_track_title}
                  {ann.original_track_artist && <span className="text-muted"> - {ann.original_track_artist}</span>}
                </p>
                {ann.original_confidence != null && (
                  <p className="mt-0.5 text-[12px] text-muted">{Math.round(ann.original_confidence * 100)}% confidence</p>
                )}
              </div>
            )}
            <div className="rounded-item bg-b4/40 p-3 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--b4),transparent_75%)]">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Proposed</p>
              <p className="text-[13px] text-heading">
                {ann.track_title}
                {ann.track_artist && <span className="text-text"> - {ann.track_artist}</span>}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">at {formatTime(ann.start_time_seconds)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <AdminButton
              variant="primary"
              size="sm"
              onClick={() => handleModerate(ann.id, 'approve')}
              disabled={moderating === ann.id}
            >
              Approve
            </AdminButton>
            <AdminButton
              variant="danger"
              size="sm"
              onClick={() => handleModerate(ann.id, 'reject')}
              disabled={moderating === ann.id}
            >
              Reject
            </AdminButton>
          </div>
        </Card>
      ))}
    </div>
  )
}
