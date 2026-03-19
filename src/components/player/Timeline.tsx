import { usePlayerStore } from '../../stores/playerStore'
import { formatTime, formatConfidence } from '../../lib/formatTime'
import type { Detection } from '../../lib/types'

interface TimelineProps {
  detections: Detection[]
  duration: number
  className?: string
}

export function Timeline({ detections, duration, className = '' }: TimelineProps) {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const seek = usePlayerStore((s) => s.seek)

  if (detections.length === 0 || duration <= 0) return null

  const handleChapterClick = (detection: Detection) => {
    const state = usePlayerStore.getState()
    if (!state.currentSet || state.currentSet.id !== detections[0]?.set_id) {
      // Need to start playing this set first - handled by parent
    }
    seek(detection.start_time_seconds)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Visual timeline bar */}
      <div className="relative h-8 bg-surface-overlay rounded-lg overflow-hidden mb-3">
        {detections.map((detection, i) => {
          const startPct = (detection.start_time_seconds / duration) * 100
          const endTime = detection.end_time_seconds
            ?? (i + 1 < detections.length ? detections[i + 1].start_time_seconds : duration)
          const widthPct = ((endTime - detection.start_time_seconds) / duration) * 100
          const isActive =
            currentTime >= detection.start_time_seconds &&
            currentTime < endTime

          return (
            <button
              key={detection.id}
              onClick={() => handleChapterClick(detection)}
              className={`absolute top-0 h-full border-r border-surface transition-colors ${
                isActive ? 'bg-accent/20' : 'hover:bg-surface-hover'
              }`}
              style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              title={`${detection.track_title} (${formatConfidence(detection.confidence)})`}
            >
              {widthPct > 8 && (
                <span className="absolute inset-0 flex items-center px-1.5 text-[10px] text-text-secondary truncate">
                  {detection.track_title}
                </span>
              )}
            </button>
          )
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/80 pointer-events-none z-10"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      {/* Chapter list (compact) */}
      <div className="space-y-0.5">
        {detections.map((detection, i) => {
          const endTime = detection.end_time_seconds
            ?? (i + 1 < detections.length ? detections[i + 1].start_time_seconds : duration)
          const isActive =
            currentTime >= detection.start_time_seconds &&
            currentTime < endTime

          return (
            <button
              key={detection.id}
              onClick={() => handleChapterClick(detection)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'hover:bg-surface-hover text-text-primary'
              }`}
            >
              <span className="text-xs font-mono w-12 text-text-muted flex-shrink-0">
                {formatTime(detection.start_time_seconds)}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`text-sm truncate block ${isActive ? 'font-medium' : ''}`}>
                  {detection.track_title}
                </span>
                {detection.track_artist && (
                  <span className="text-xs text-text-muted truncate block">
                    {detection.track_artist}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium flex-shrink-0 ${
                  detection.confidence >= 0.8
                    ? 'text-success'
                    : detection.confidence >= 0.5
                    ? 'text-warning'
                    : 'text-text-muted'
                }`}
              >
                {formatConfidence(detection.confidence)}
              </span>
              {isActive && (
                <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
