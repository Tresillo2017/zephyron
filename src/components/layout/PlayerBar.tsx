import { useRef, useEffect, useCallback, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { formatTime } from '../../lib/formatTime'
import { getCoverUrl, fetchStoryboard, type StoryboardData } from '../../lib/api'
import { Logo } from '../ui/Logo'
import { VolumeSlider } from '../ui/VolumeSlider'
import { Tooltip } from '../bleh/ui/Tooltip'
import {
  PlayFilled,
  PauseFilled,
  SkipPreviousFilled,
  SkipForwardFilled,
  FullscreenFilled,
  LoadingFilled,
} from '@mingcute/react/core-filled'
import './PlayerBar.css'
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

  // Browser tab title + Media Session API metadata
  useEffect(() => {
    if (!currentSet) {
      document.title = 'Zephyron'
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
      return
    }
    document.title = `${currentSet.title} — ${currentSet.artist} · Zephyron`
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSet.title,
        artist: currentSet.artist,
        artwork: currentSet.cover_image_r2_key
          ? [{ src: getCoverUrl(currentSet.id), sizes: '512x512', type: 'image/jpeg' }]
          : [],
      })
    }
  }, [currentSet?.id, currentSet?.title, currentSet?.artist, currentSet?.cover_image_r2_key])

  // Media Session playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // Media Session action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => togglePlay())
    navigator.mediaSession.setActionHandler('pause', () => togglePlay())
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious())
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
    }
  }, [togglePlay, playPrevious, playNext])

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
        <div className="player-bar">
          {/* Playing glow */}
          {isPlaying && <div className="player-bar__playing" />}

          {/* Main content row — stops 5px before the bottom (progress rail lives there) */}
          <div className="player-bar__panel glass-nav">
            {/* Left: cover + set / track info */}
            <div className="player-bar__now">
              <div className="player-bar__cover">
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

            {/* Center: time — prev — play — next — time */}
            <div className="player-bar__center">
              <span className="player-bar__time player-bar__time--start hidden sm:block">
                {formatTime(currentTime)}
              </span>
              <Tooltip content="Previous">
                <button
                  type="button"
                  onClick={playPrevious}
                  className="player-bar__ghost hidden sm:inline-flex"
                  aria-label="Previous track"
                >
                  <SkipPreviousFilled size={18} />
                </button>
              </Tooltip>

              <button
                type="button"
                onClick={togglePlay}
                disabled={isLoadingStream}
                className="player-bar__play"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoadingStream ? (
                  <LoadingFilled size={18} className="animate-spin" />
                ) : isPlaying ? (
                  <PauseFilled size={18} />
                ) : (
                  <PlayFilled size={18} style={{ marginLeft: 2 }} />
                )}
              </button>

              <Tooltip content="Next">
                <button
                  type="button"
                  onClick={playNext}
                  className="player-bar__ghost hidden sm:inline-flex"
                  aria-label="Next track"
                >
                  <SkipForwardFilled size={18} />
                </button>
              </Tooltip>
              <span className="player-bar__time player-bar__time--end hidden sm:block">
                {formatTime(duration)}
              </span>
            </div>

            {/* Right: volume + expand */}
            <div className="player-bar__right hidden sm:flex">
              <VolumeSlider
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
              />
              <Tooltip content="Full screen player">
                <button
                  type="button"
                  onClick={usePlayerStore.getState().toggleFullScreen}
                  className="player-bar__icon"
                  aria-label="Full screen player"
                >
                  <FullscreenFilled size={18} />
                </button>
              </Tooltip>
            </div>

            {/* Mobile: compact time */}
            <span className="sm:hidden player-bar__time player-bar__time--start">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Progress rail — full width, absolute bottom, integrates storyboard */}
          <div
            ref={progressRef}
            className="player-bar__rail"
            onClick={handleProgressClick}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration) || 0}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={formatTime(currentTime)}
            onKeyDown={e => {
              if (duration <= 0) return
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const delta = e.key === 'ArrowRight' ? 5 : -5
                seek(Math.max(0, Math.min(duration, currentTime + delta)))
              }
            }}
          >
            <div className="player-bar__rail-track" />

            {/* Detection chapter markers */}
            {detections.map((d: Detection) => {
              if (duration <= 0) return null
              const pos = (d.start_time_seconds / duration) * 100
              return (
                <div
                  key={d.id}
                  className="player-bar__tick"
                  style={{ left: `${pos}%` }}
                  title={d.track_title}
                />
              )
            })}

            {/* Fill */}
            <div
              className="player-bar__rail-fill"
              style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
            />

            {/* Playhead thumb + hover line on hover */}
            {hoverTime !== null && (
              <>
                <div className="player-bar__hover-line" style={{ left: `${(hoverTime / duration) * 100}%` }} />
                <div className="player-bar__nub" style={{ left: `${(hoverTime / duration) * 100}%` }} />
              </>
            )}

            {/* Storyboard thumbnail popup */}
            {hoverTime !== null && thumbnailInfo && (
              <div
                className="player-bar__thumb"
                style={{
                  left: Math.max(
                    0,
                    Math.min(
                      (progressRef.current?.offsetWidth ?? 0) - thumbnailInfo.thumbWidth,
                      hoverX - thumbnailInfo.thumbWidth / 2,
                    ),
                  ),
                }}
              >
                <div
                  className="player-bar__thumb-frame"
                  style={{
                    width: thumbnailInfo.thumbWidth,
                    height: thumbnailInfo.thumbHeight,
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
                <p className="player-bar__thumb-time">{formatTime(hoverTime)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <FullScreenPlayer />
    </>
  )
}
