import { useEffect, useCallback, useRef, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { StoryboardScrubber } from './StoryboardScrubber'
import { formatTime } from '../../lib/formatTime'
import { getCoverUrl, fetchStoryboard, type StoryboardData } from '../../lib/api'

export function FullScreenPlayer() {
  const {
    currentSet, isPlaying, currentTime, duration, volume, isMuted,
    currentDetection, detections, isFullScreen,
    togglePlay, seek, setVolume, toggleMute, playNext, playPrevious, toggleFullScreen,
  } = usePlayerStore()

  const activeTrackRef = useRef<HTMLButtonElement>(null)
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null)

  // Fetch storyboard data when opening fullscreen
  useEffect(() => {
    if (!isFullScreen || !currentSet) {
      setStoryboard(null)
      return
    }

    // Only fetch for Invidious sets
    if (currentSet.stream_type === 'invidious' || currentSet.youtube_video_id) {
      fetchStoryboard(currentSet.id)
        .then(setStoryboard)
        .catch(() => setStoryboard(null))
    }
  }, [isFullScreen, currentSet?.id])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isFullScreen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleFullScreen()
      if (e.key === ' ') { e.preventDefault(); togglePlay() }
      if (e.key === 'ArrowRight') seek(Math.min(currentTime + 10, duration))
      if (e.key === 'ArrowLeft') seek(Math.max(currentTime - 10, 0))
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isFullScreen, toggleFullScreen, togglePlay, seek, currentTime, duration])

  // Auto-scroll to active track
  useEffect(() => {
    if (activeTrackRef.current) {
      activeTrackRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentDetection?.id])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }, [duration, seek])

  if (!isFullScreen || !currentSet) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'hsl(var(--b6))' }}>
      {/* Ambient background */}
      {currentSet.cover_image_r2_key ? (
        <div className="absolute inset-0 pointer-events-none">
          <img src={getCoverUrl(currentSet.id)} alt="" className="w-full h-full object-cover scale-125 blur-[80px] opacity-[0.12]" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, hsl(var(--b6) / 0.4), hsl(var(--b6) / 0.7), hsl(var(--b6)))' }} />
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: 'hsl(var(--h3) / 0.06)' }} />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 shrink-0">
          <span className="text-[10px] font-mono tracking-wider" style={{ color: 'hsl(var(--c3))' }}>NOW PLAYING</span>
          <button
            onClick={toggleFullScreen}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'hsl(var(--c3))' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--b3) / 0.5)'; e.currentTarget.style.color = 'hsl(var(--c1))' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'hsl(var(--c3))' }}
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 px-6 pb-6 gap-6">

          {/* LEFT: cover + info + controls */}
          <div className="lg:w-[440px] xl:w-[500px] flex flex-col items-center lg:items-start shrink-0 overflow-y-auto">

            {/* Cover art */}
            <div
              className="w-52 h-52 sm:w-64 sm:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 overflow-hidden mb-6 shrink-0"
              style={{ borderRadius: 'var(--card-radius)', boxShadow: '0 20px 60px hsl(var(--b7) / 0.5)' }}
            >
              {currentSet.cover_image_r2_key ? (
                <img src={getCoverUrl(currentSet.id)} alt={currentSet.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--h3) / 0.2), hsl(var(--b4)))' }}>
                  <svg className="w-16 h-16" style={{ color: 'hsl(var(--c3) / 0.3)' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title + artist */}
            <div className="text-center lg:text-left w-full mb-5">
              <h1 className="text-xl sm:text-2xl font-[var(--font-weight-bold)] truncate" style={{ color: 'hsl(var(--c1))' }}>{currentSet.title}</h1>
              <p className="text-base mt-1" style={{ color: 'hsl(var(--c2))' }}>{currentSet.artist}</p>
              {currentSet.genre && <p className="text-xs font-mono mt-1.5" style={{ color: 'hsl(var(--h3))' }}>{currentSet.genre}</p>}
            </div>

            {/* Progress bar with storyboard scrubber */}
            <div className="w-full mb-5">
              <div className="relative h-[6px] rounded-full cursor-pointer group" style={{ background: 'hsl(var(--b3))' }} onClick={handleSeek}>
                <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${progress}%`, background: 'hsl(var(--h3))', transition: 'width 0.1s linear' }} />
                <div
                  className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                />
                {/* Storyboard hover overlay */}
                <StoryboardScrubber storyboard={storyboard} duration={duration} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] font-mono tabular-nums" style={{ color: 'hsl(var(--c3))' }}>{formatTime(currentTime)}</span>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: 'hsl(var(--c3))' }}>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center lg:justify-start gap-5 w-full mb-5">
              <button onClick={playPrevious} className="transition-colors" style={{ color: 'hsl(var(--c3))' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(var(--c1))'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(var(--c3))'}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
              </button>
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                style={{ background: 'hsl(var(--h3))', boxShadow: '0 4px 20px hsl(var(--h4) / 0.35)' }}
              >
                {isPlaying
                  ? <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  : <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button onClick={playNext} className="transition-colors" style={{ color: 'hsl(var(--c3))' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(var(--c1))'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(var(--c3))'}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 justify-center lg:justify-start w-full">
              <button onClick={toggleMute} className="transition-colors" style={{ color: 'hsl(var(--c3))' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(var(--c1))'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(var(--c3))'}>
                {isMuted || volume === 0
                  ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                  : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>}
              </button>
              <input
                type="range" min={0} max={1} step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-28 h-[6px] rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, hsl(var(--h3)) 0%, hsl(var(--h3)) ${(isMuted ? 0 : volume) * 100}%, hsl(var(--b3)) ${(isMuted ? 0 : volume) * 100}%, hsl(var(--b3)) 100%)` }}
              />
            </div>
          </div>

          {/* RIGHT: tracklist */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div>
                <h2 className="text-sm font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>Tracklist</h2>
                <p className="text-[10px] font-mono" style={{ color: 'hsl(var(--c3))' }}>{detections.length} tracks</p>
              </div>
              {currentDetection && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-[2px] items-end h-3">
                    <div className="w-[3px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-1 0.8s ease-in-out infinite' }} />
                    <div className="w-[3px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-2 0.6s ease-in-out infinite' }} />
                    <div className="w-[3px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-3 0.7s ease-in-out infinite' }} />
                  </div>
                  <span className="text-xs font-medium truncate max-w-[200px]" style={{ color: 'hsl(var(--h3))' }}>{currentDetection.track_title}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 card !p-0 overflow-hidden">
              {detections.map((detection, i) => {
                const endTime = detection.end_time_seconds
                  ?? (i + 1 < detections.length ? detections[i + 1].start_time_seconds : duration)
                const isActive = currentTime >= detection.start_time_seconds && currentTime < endTime

                return (
                  <button
                    key={detection.id}
                    ref={isActive ? activeTrackRef : undefined}
                    onClick={() => seek(detection.start_time_seconds)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left transition-all"
                    style={{
                      background: isActive ? 'hsl(var(--h3) / 0.08)' : undefined,
                      borderLeft: isActive ? '2px solid hsl(var(--h3))' : '2px solid transparent',
                      transitionDuration: 'var(--trans)',
                      transitionTimingFunction: 'var(--ease-out-custom)',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'hsl(var(--b3) / 0.4)' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '' }}
                  >
                    <span className="text-xs font-mono w-12 tabular-nums shrink-0" style={{ color: isActive ? 'hsl(var(--h3))' : 'hsl(var(--c3))' }}>
                      {formatTime(detection.start_time_seconds)}
                    </span>
                    {isActive && (
                      <div className="flex gap-[2px] items-end h-3 shrink-0">
                        <div className="w-[3px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-1 0.8s ease-in-out infinite' }} />
                        <div className="w-[3px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-2 0.6s ease-in-out infinite' }} />
                        <div className="w-[3px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-3 0.7s ease-in-out infinite' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: isActive ? 'hsl(var(--h3))' : 'hsl(var(--c1))', fontWeight: isActive ? 'var(--font-weight-medium)' : 'var(--font-weight)' }}>
                        {detection.track_title}
                      </p>
                      {detection.track_artist && (
                        <p className="text-xs truncate" style={{ color: 'hsl(var(--c3))' }}>{detection.track_artist}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono shrink-0" style={{
                      color: detection.confidence >= 0.8 ? 'hsl(145, 60%, 55%)' : detection.confidence >= 0.5 ? 'hsl(40, 80%, 55%)' : 'hsl(var(--c3))'
                    }}>
                      {Math.round(detection.confidence * 100)}%
                    </span>
                  </button>
                )
              })}
              {detections.length === 0 && (
                <div className="flex items-center justify-center h-full py-16" style={{ color: 'hsl(var(--c3))' }}>
                  <p className="text-sm">No tracks detected yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
