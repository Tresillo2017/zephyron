import { useState } from 'react'
import { VoteButtons } from './VoteButtons'
import { AnnotationEditor } from './AnnotationEditor'
import { formatTime, formatConfidence } from '../../lib/formatTime'
import { Badge } from '../ui/Badge'
import type { Detection } from '../../lib/types'

interface DetectionRowProps {
  detection: Detection
  index: number
  setId: string
  duration: number
  onClick: () => void
  isActive?: boolean
}

export function DetectionRow({
  detection,
  index,
  setId,
  duration,
  onClick,
  isActive,
}: DetectionRowProps) {
  const [showEditor, setShowEditor] = useState(false)

  return (
    <>
      <div
        className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
          isActive ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-surface-hover border-l-2 border-l-transparent'
        } ${index > 0 ? 'border-t border-border' : ''}`}
      >
        {/* Clickable area for seeking */}
        <button
          onClick={onClick}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {/* Timestamp */}
          <span className={`text-xs font-mono w-14 flex-shrink-0 tabular-nums ${isActive ? 'text-accent' : 'text-text-muted'}`}>
            {formatTime(detection.start_time_seconds)}
          </span>

          {/* Now playing indicator — real equalizer animation */}
          {isActive && (
            <div className="w-3 flex-shrink-0 flex items-center">
              <div className="flex gap-[2px] items-end h-3.5">
                <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-1 0.8s ease-in-out infinite' }} />
                <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-2 0.6s ease-in-out infinite' }} />
                <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-3 0.7s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm truncate ${isActive ? 'text-accent font-medium' : 'text-text-primary'}`}>
              {detection.track_title}
            </p>
            {detection.track_artist && (
              <p className="text-xs text-text-secondary truncate">{detection.track_artist}</p>
            )}
          </div>
        </button>

        {/* Confidence */}
        <span
          className={`text-[10px] font-medium flex-shrink-0 px-1.5 py-0.5 rounded ${
            detection.confidence >= 0.8
              ? 'text-success bg-success/10'
              : detection.confidence >= 0.5
              ? 'text-warning bg-warning/10'
              : 'text-text-muted bg-surface-overlay'
          }`}
        >
          {formatConfidence(detection.confidence)}
        </span>

        {/* Verified badge */}
        {detection.is_verified === 1 && (
          <Badge variant="accent">Verified</Badge>
        )}

        {/* Vote buttons */}
        <VoteButtons detection={detection} />

        {/* Edit/Correct button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowEditor(true)
          }}
          className="text-text-muted hover:text-text-primary transition-colors p-1 flex-shrink-0"
          title="Correct this detection"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* Annotation editor modal */}
      <AnnotationEditor
        setId={setId}
        duration={duration}
        detection={detection}
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
      />
    </>
  )
}
