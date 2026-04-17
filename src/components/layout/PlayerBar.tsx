import { useRef, useEffect, useCallback, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { formatTime } from '../../lib/formatTime'
import { getCoverUrl, fetchStoryboard, type StoryboardData } from '../../lib/api'
import { Logo } from '../ui/Logo'
import { FullScreenPlayer } from '../player/FullScreenPlayer'
import type { Detection } from '../../lib/types'

// ─── Storyboard helpers (inlined from StoryboardScrubber) ───────────────────

interface ThumbnailInfo {
  spriteUrl: string
  bgPositionX: number
  bgPositionY: number
  thumbWidth: number
  thumbHeight: number
}

function getThumbnailPosition(sb: StoryboardData, time: number): ThumbnailInfo | null {
  if ((!sb.templateUrl && !sb.url) || sb.count === 0 || sb.interval === 0) return null
  const frameIndex = Math.max(0, Math.min(sb.count - 1, Math.floor(time / (sb.interval / 1000))))
  const framesPerSheet = sb.storyboardWidth * sb.storyboardHeight
  const sheetIndex = Math.floor(frameIndex / framesPerSheet)
  const frameInSheet = frameIndex % framesPerSheet
  const col = frameInSheet % sb.storyboardWidth
  const row = Math.floor(frameInSheet / sb.storyboardWidth)
  const spriteUrl = sb.templateUrl ? sb.templateUrl.replace('$M', String(sheetIndex)) : sb.url
  return {
    spriteUrl,
    bgPositionX: col * sb.width,
    bgPositionY: row * sb.height,
    thumbWidth: sb.width,
    thumbHeight: sb.height,
  }
}

// ─── Volume icon component ──────────────────────────────────────────────────

function VolumeButton({ volume, isMuted, onVolumeChange, onToggleMute }: {
  volume: number
  isMuted: boolean
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
}) {
  const effective = isMuted ? 0 : volume

  return (
    <div className="flex items-center gap-1.5">
      {/* Icon — mute toggle on click */}
      <button
        onClick={onToggleMute}
        className="text-text-muted hover:text-text-primary transition-colors shrink-0"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        ) : volume < 0.5 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        )}
      </button>

      {/* Slider — always visible */}
      <div
        className="relative rounded-full cursor-pointer"
        style={{ width: 64, height: 4, background: 'rgba(255,255,255,0.12)' }}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
          style={{ width: `${effective * 100}%`, background: 'hsl(var(--h3))', transition: 'width 0.1s linear' }}
        />
        <input
          type="range" min={0} max={1} step={0.01}
          value={effective}
          onChange={e => onVolumeChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}

// ─── Main PlayerBar ─────────────────────────────────────────────────────────

export function PlayerBar() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const {
    currentSet, isPlaying, isLoadingStream, currentTime, duration, volume, isMuted,
    currentDetection, detections, isTheaterMode,
    setAudioElement, togglePlay, seek,
    setCurrentTime, setDuration, setVolume, toggleMute, playNext, playPrevious,
  } = usePlayerStore()

  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)

  // Audio element registration
  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current)
      audioRef.current.volume = volume
    }
  }, [setAudioElement, volume])

  // Storyboard fetch
  useEffect(() => {
    if (!currentSet) { setStoryboard(null); return }
    if (currentSet.stream_type === 'invidious' || currentSet.youtube_video_id) {
      fetchStoryboard(currentSet.id).then(setStoryboard).catch(() => setStoryboard(null))
    } else {
      setStoryboard(null)
    }
  }, [currentSet?.id])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }, [setCurrentTime])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }, [setDuration])

  const handleEnded = useCallback(() => { playNext() }, [playNext])

  const handleError = useCallback(() => {
    if (audioRef.current) {
      const err = audioRef.current.error
      console.error('[PlayerBar] Audio error:', err?.code, err?.message)
    }
  }, [])

  // Progress bar interactions
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return
    const rect = progressRef.current.getBoundingClientRect()
    seek(Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration)))
  }, [duration, seek])

  const handleProgressMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHoverX(x)
    setHoverTime(Math.max(0, Math.min(duration, (x / rect.width) * duration)))
  }, [duration])

  const handleProgressMouseLeave = useCallback(() => setHoverTime(null), [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const thumbnailInfo = storyboard && hoverTime !== null
    ? getThumbnailPosition(storyboard, hoverTime)
    : null

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
      />

      {currentSet && !isTheaterMode && (
        <div className="shrink-0 relative" style={{ height: 62 }}>
          {/* Playing glow */}
          {isPlaying && (
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent, hsl(var(--h3) / 0.5), transparent)' }}
            />
          )}

          {/* Main content row — stops 5px before the bottom (progress bar lives there) */}
          <div
            className="absolute left-0 right-0 top-0 flex items-center px-5 gap-4"
            style={{
              bottom: 5,
              background: 'hsl(var(--b5) / 0.92)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            }}
          >
            {/* Left: cover + set / track info */}
            <div className="flex items-center gap-3 shrink-0" style={{ width: 220 }}>
              <div
                className="w-10 h-10 rounded-[10px] overflow-hidden shrink-0"
                style={{ boxShadow: 'var(--card-border)', background: 'hsl(var(--b4))' }}
              >
                {currentSet.cover_image_r2_key ? (
                  <img src={getCoverUrl(currentSet.id)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="opacity-30">
                      <Logo size={16} alt="" />
                    </div>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-text-primary truncate leading-tight">{currentSet.title}</p>
                <p className="text-[11px] text-text-muted truncate font-mono leading-tight mt-0.5">
                  {isLoadingStream
                    ? 'Loading...'
                    : currentDetection
                    ? `${currentDetection.track_title}${currentDetection.track_artist ? ` — ${currentDetection.track_artist}` : ''}`
                    : currentSet.artist}
                </p>
              </div>
            </div>

            {/* Center: time — prev — [play slot] — next — time */}
            <div className="flex-1 flex items-center justify-center gap-5">
              <span className="text-[11px] font-mono tabular-nums text-text-muted hidden sm:block w-11 text-right">
                {formatTime(currentTime)}
              </span>
              <button
                onClick={playPrevious}
                className="hidden sm:block text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Spacer matching the play button width so layout doesn't collapse */}
              <div style={{ width: 36, height: 36, flexShrink: 0 }} />

              <button
                onClick={playNext}
                className="hidden sm:block text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
              <span className="text-[11px] font-mono tabular-nums text-text-muted hidden sm:block w-11">
                {formatTime(duration)}
              </span>
            </div>

            {/* Right: volume icon + expand */}
            <div className="hidden sm:flex items-center gap-3 shrink-0 justify-end" style={{ width: 220 }}>
              <VolumeButton
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
              />
              <button
                onClick={usePlayerStore.getState().toggleFullScreen}
                className="text-text-muted hover:text-text-primary transition-colors"
                title="Full screen player"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>

            {/* Mobile: compact time */}
            <span className="sm:hidden text-[10px] text-text-muted tabular-nums font-mono shrink-0">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Play / pause button — absolute, centered vertically in content row, touching progress bar */}
          <button
            onClick={togglePlay}
            disabled={isLoadingStream}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 5,
              width: 36,
              height: 36,
              margin: 'auto',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'hsl(var(--h3))',
              boxShadow: '0 2px 12px hsl(var(--h4) / 0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              zIndex: 10,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.08)'
              e.currentTarget.style.boxShadow = '0 4px 18px hsl(var(--h4) / 0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = '0 2px 12px hsl(var(--h4) / 0.35)'
            }}
          >
            {isLoadingStream ? (
              <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isPlaying ? (
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-white" style={{ marginLeft: 1 }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Progress bar — full width, absolute bottom, integrates storyboard */}
          <div
            ref={progressRef}
            className="absolute left-0 right-0 bottom-0 cursor-pointer group"
            style={{ height: 5 }}
            onClick={handleProgressClick}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
          >
            {/* Track */}
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />

            {/* Detection chapter markers */}
            {detections.map((d: Detection) => {
              if (duration <= 0) return null
              const pos = (d.start_time_seconds / duration) * 100
              return (
                <div
                  key={d.id}
                  className="absolute top-0 h-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `${pos}%`, width: 1.5, background: 'rgba(255,255,255,0.35)' }}
                  title={d.track_title}
                />
              )
            })}

            {/* Fill */}
            <div
              className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
              style={{ width: `${progress}%`, background: 'hsl(var(--h3))', transition: 'width 0.1s linear' }}
            />

            {/* Playhead thumb on hover */}
            {hoverTime !== null && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${(hoverTime / duration) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
                  transition: 'opacity 0.1s',
                }}
              />
            )}

            {/* Hover time indicator */}
            {hoverTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-px pointer-events-none opacity-40"
                style={{ left: `${(hoverTime / duration) * 100}%`, background: 'hsl(var(--c2))' }}
              />
            )}

            {/* Storyboard thumbnail popup */}
            {hoverTime !== null && thumbnailInfo && (
              <div
                className="absolute pointer-events-none z-20"
                style={{
                  bottom: '100%',
                  left: Math.max(
                    0,
                    Math.min(
                      (progressRef.current?.offsetWidth ?? 0) - thumbnailInfo.thumbWidth,
                      hoverX - thumbnailInfo.thumbWidth / 2,
                    ),
                  ),
                  marginBottom: 10,
                }}
              >
                <div
                  className="overflow-hidden rounded-lg"
                  style={{
                    width: thumbnailInfo.thumbWidth,
                    height: thumbnailInfo.thumbHeight,
                    boxShadow: '0 8px 25px rgba(0,0,0,0.55)',
                    border: '1px solid hsl(var(--b3) / 0.5)',
                  }}
                >
                  <div
                    style={{
                      width: thumbnailInfo.thumbWidth,
                      height: thumbnailInfo.thumbHeight,
                      backgroundImage: `url(${thumbnailInfo.spriteUrl})`,
                      backgroundPosition: `-${thumbnailInfo.bgPositionX}px -${thumbnailInfo.bgPositionY}px`,
                      backgroundSize: storyboard
                        ? `${storyboard.storyboardWidth * thumbnailInfo.thumbWidth}px ${storyboard.storyboardHeight * thumbnailInfo.thumbHeight}px`
                        : undefined,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                </div>
                <p
                  className="mt-1 text-center text-[10px] font-mono tabular-nums"
                  style={{ color: 'hsl(var(--c2))' }}
                >
                  {formatTime(hoverTime)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <FullScreenPlayer />
    </>
  )
}
