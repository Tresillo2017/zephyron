import { useState, useRef, useCallback } from 'react'
import type { StoryboardData } from '../../lib/api'
import { usePlayerStore } from '../../stores/playerStore'

interface StoryboardScrubberProps {
  storyboard: StoryboardData | null
  duration: number
}

/**
 * Thumbnail-on-hover preview scrubber using YouTube storyboard sprite sheets.
 * Shows a popup with the corresponding video thumbnail when hovering over the progress bar.
 */
export function StoryboardScrubber({ storyboard, duration }: StoryboardScrubberProps) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const barRef = useRef<HTMLDivElement>(null)
  const seek = usePlayerStore((s) => s.seek)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || duration <= 0) return
      const rect = barRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = Math.max(0, Math.min(1, x / rect.width))
      setHoverTime(percent * duration)
      setHoverX(x)
    },
    [duration]
  )

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || duration <= 0) return
      const rect = barRef.current.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      seek(Math.max(0, Math.min(duration, percent * duration)))
    },
    [duration, seek]
  )

  // Storyboard thumbnail calculation
  const thumbnailInfo = storyboard && hoverTime !== null
    ? getThumbnailPosition(storyboard, hoverTime, duration)
    : null

  return (
    <div
      ref={barRef}
      className="relative w-full cursor-pointer group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Invisible hit area (taller than the visible bar) */}
      <div className="absolute inset-0 -top-2 -bottom-2" />

      {/* Hover thumbnail popup */}
      {storyboard && hoverTime !== null && thumbnailInfo && (
        <ThumbnailPopup
          storyboard={storyboard}
          thumbnailInfo={thumbnailInfo}
          hoverX={hoverX}
          hoverTime={hoverTime}
          containerRef={barRef}
        />
      )}

      {/* Hover time indicator line */}
      {hoverTime !== null && (
        <div
          className="absolute top-0 bottom-0 w-px opacity-50 pointer-events-none"
          style={{
            left: `${(hoverTime / duration) * 100}%`,
            background: 'hsl(var(--c2))',
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// Thumbnail popup component
// ═══════════════════════════════════════════

interface ThumbnailInfo {
  spriteUrl: string
  bgPositionX: number
  bgPositionY: number
  thumbWidth: number
  thumbHeight: number
}

function ThumbnailPopup({
  storyboard,
  thumbnailInfo,
  hoverX,
  hoverTime,
  containerRef,
}: {
  storyboard: StoryboardData
  thumbnailInfo: ThumbnailInfo
  hoverX: number
  hoverTime: number
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const popupWidth = thumbnailInfo.thumbWidth
  const popupHeight = thumbnailInfo.thumbHeight

  // Clamp popup position to stay within the container
  const containerWidth = containerRef.current?.offsetWidth || 0
  let popupLeft = hoverX - popupWidth / 2
  popupLeft = Math.max(0, Math.min(containerWidth - popupWidth, popupLeft))

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        bottom: '100%',
        left: `${popupLeft}px`,
        marginBottom: '8px',
      }}
    >
      {/* Thumbnail */}
      <div
        className="overflow-hidden rounded-lg"
        style={{
          width: `${popupWidth}px`,
          height: `${popupHeight}px`,
          boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
          border: '1px solid hsl(var(--b3) / 0.5)',
        }}
      >
        <div
          style={{
            width: `${popupWidth}px`,
            height: `${popupHeight}px`,
            backgroundImage: `url(${thumbnailInfo.spriteUrl})`,
            backgroundPosition: `-${thumbnailInfo.bgPositionX}px -${thumbnailInfo.bgPositionY}px`,
            backgroundSize: `${storyboard.storyboardWidth * thumbnailInfo.thumbWidth}px ${storyboard.storyboardHeight * thumbnailInfo.thumbHeight}px`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      </div>

      {/* Time label */}
      <div
        className="mt-1 text-center text-[10px] font-mono tabular-nums"
        style={{ color: 'hsl(var(--c2))' }}
      >
        {formatTime(hoverTime)}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

/**
 * Calculate which thumbnail to show from the sprite sheet based on the hover time.
 *
 * Storyboard sprite sheets are organized as a grid:
 * - Each sheet has storyboardWidth x storyboardHeight thumbnails
 * - Each thumbnail is `width` x `height` pixels
 * - Thumbnails are spaced at `interval` milliseconds
 * - There are `storyboardCount` total sheets, `count` total frames
 */
function getThumbnailPosition(
  sb: StoryboardData,
  time: number,
  _duration: number
): ThumbnailInfo | null {
  if (!sb.templateUrl && !sb.url) return null
  if (sb.count === 0 || sb.interval === 0) return null

  // Calculate which frame corresponds to the hover time
  const intervalSec = sb.interval / 1000 // interval is in milliseconds
  const frameIndex = Math.floor(time / intervalSec)
  const clampedFrame = Math.max(0, Math.min(sb.count - 1, frameIndex))

  // How many thumbnails per sprite sheet
  const framesPerSheet = sb.storyboardWidth * sb.storyboardHeight

  // Which sprite sheet does this frame belong to
  const sheetIndex = Math.floor(clampedFrame / framesPerSheet)

  // Position within the sheet
  const frameInSheet = clampedFrame % framesPerSheet
  const col = frameInSheet % sb.storyboardWidth
  const row = Math.floor(frameInSheet / sb.storyboardWidth)

  // Resolve sprite sheet URL (templateUrl uses $M placeholder for sheet index)
  let spriteUrl: string
  if (sb.templateUrl) {
    spriteUrl = sb.templateUrl.replace('$M', String(sheetIndex))
  } else {
    spriteUrl = sb.url
  }

  return {
    spriteUrl,
    bgPositionX: col * sb.width,
    bgPositionY: row * sb.height,
    thumbWidth: sb.width,
    thumbHeight: sb.height,
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
