import { useRef, useEffect, useCallback, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { formatTime } from '../../lib/formatTime'
import { getCoverUrl, fetchStoryboard, type StoryboardData } from '../../lib/api'
import { ProgressBar } from '../player/ProgressBar'
import { StoryboardScrubber } from '../player/StoryboardScrubber'
import { FullScreenPlayer } from '../player/FullScreenPlayer'

import { VolumeSlider } from '../ui/VolumeSlider'

export function PlayerBar() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    currentSet, isPlaying, isLoadingStream, currentTime, duration, volume, isMuted,
    currentDetection, detections, setAudioElement, togglePlay,
    setCurrentTime, setDuration, setVolume, toggleMute, playNext, playPrevious,
  } = usePlayerStore()

  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current)
      audioRef.current.volume = volume
    }
  }, [setAudioElement, volume])

  // Fetch storyboard for the current set
  useEffect(() => {
    if (!currentSet) {
      setStoryboard(null)
      return
    }
    if (currentSet.stream_type === 'invidious' || currentSet.youtube_video_id) {
      fetchStoryboard(currentSet.id)
        .then(setStoryboard)
        .catch(() => setStoryboard(null))
    } else {
      setStoryboard(null)
    }
  }, [currentSet?.id])

  const handleTimeUpdate = useCallback(() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime) }, [setCurrentTime])
  const handleLoadedMetadata = useCallback(() => { if (audioRef.current) setDuration(audioRef.current.duration) }, [setDuration])
  const handleEnded = useCallback(() => { playNext() }, [playNext])
  const handleError = useCallback(() => {
    if (audioRef.current) {
      const err = audioRef.current.error
      console.error('[PlayerBar] Audio error:', err?.code, err?.message, 'src:', audioRef.current.src)
    }
  }, [])

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

      {currentSet && (
        <div className="shrink-0 relative">
          {/* Playing glow line */}
          {isPlaying && (
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          )}

          <div
            className="h-[72px] flex items-center px-5 gap-4"
            style={{
              background: 'hsl(var(--b5) / 0.9)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            }}
          >
            {/* Left: set info */}
            <div className="flex items-center gap-3 min-w-0 w-[240px] shrink-0">
              <div className="w-11 h-11 rounded-[var(--card-radius)] overflow-hidden flex-shrink-0 bg-surface-overlay"
                style={{ boxShadow: 'var(--card-border)' }}>
                {currentSet.cover_image_r2_key ? (
                  <img src={getCoverUrl(currentSet.id)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-text-primary truncate">{currentSet.title}</p>
                <p className="text-xs text-text-muted truncate font-mono">
                  {isLoadingStream
                    ? 'Loading stream...'
                    : currentDetection
                    ? `${currentDetection.track_title}${currentDetection.track_artist ? ` — ${currentDetection.track_artist}` : ''}`
                    : currentSet.artist}
                </p>
              </div>
            </div>

            {/* Center: controls + progress */}
            <div className="flex-1 flex flex-col items-center gap-1 max-w-[640px] mx-auto">
              <div className="flex items-center gap-4">
                <button onClick={playPrevious} className="hidden sm:block text-text-muted hover:text-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                </button>
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover transition-all"
                  style={{ boxShadow: '0 2px 8px hsl(var(--h4) / 0.3)' }}
                  disabled={isLoadingStream}
                >
                  {isLoadingStream ? (
                    <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : isPlaying
                    ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    : <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                </button>
                <button onClick={playNext} className="hidden sm:block text-text-muted hover:text-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                </button>
              </div>
              <div className="hidden sm:flex w-full items-center gap-2 relative">
                <span className="text-[11px] font-mono text-text-muted w-12 text-right tabular-nums">{formatTime(currentTime)}</span>
                <div className="relative flex-1">
                  <ProgressBar currentTime={currentTime} duration={duration} detections={detections} />
                  {/* Storyboard overlay on progress bar */}
                  {storyboard && (
                    <div className="absolute inset-0">
                      <StoryboardScrubber storyboard={storyboard} duration={duration} />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-mono text-text-muted w-12 tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Mobile: compact time */}
            <span className="sm:hidden text-[10px] text-text-muted tabular-nums font-mono flex-shrink-0">{formatTime(currentTime)}</span>

            {/* Right: volume + expand */}
            <div className="hidden sm:flex items-center gap-3 w-[240px] justify-end shrink-0">
              <VolumeSlider
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
                variant="bar"
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
          </div>
        </div>
      )}

      <FullScreenPlayer />
    </>
  )
}
