import { useCallback } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import type { Detection } from '../../lib/types'

interface ProgressBarProps {
  currentTime: number
  duration: number
  detections: Detection[]
}

export function ProgressBar({ currentTime, duration, detections }: ProgressBarProps) {
  const seek = usePlayerStore((s) => s.seek)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (duration <= 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = x / rect.width
      seek(percent * duration)
    },
    [duration, seek]
  )

  return (
    <div
      className="relative flex-1 h-1 bg-border rounded-full cursor-pointer group"
      onClick={handleClick}
    >
      {/* Detection chapter markers */}
      {detections.map((detection) => {
        if (duration <= 0) return null
        const position = (detection.start_time_seconds / duration) * 100
        return (
          <div
            key={detection.id}
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-text-muted/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${position}%` }}
            title={`${detection.track_title} (${Math.round(detection.confidence * 100)}%)`}
          />
        )
      })}

      {/* Progress fill */}
      <div
        className="absolute top-0 left-0 h-full bg-accent rounded-full transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />

      {/* Hover indicator */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
      />
    </div>
  )
}
