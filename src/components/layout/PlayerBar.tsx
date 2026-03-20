import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { formatTime } from '../../lib/formatTime'
import { getCoverUrl } from '../../lib/api'
import { ProgressBar } from '../player/ProgressBar'
import { FullScreenPlayer } from '../player/FullScreenPlayer'

export function PlayerBar() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    currentSet, isPlaying, currentTime, duration, volume, isMuted,
    currentDetection, detections, setAudioElement, togglePlay,
    setCurrentTime, setDuration, setVolume, toggleMute, playNext, playPrevious,
  } = usePlayerStore()

  // CRITICAL: Always register the audio element, even when no set is playing.
  // This solves the chicken-and-egg problem where play() needs the element
  // but PlayerBar previously didn't render it until a set was loaded.
  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current)
      audioRef.current.volume = volume
    }
  }, [setAudioElement, volume])

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
      {/* Audio element is ALWAYS mounted so play() can access it */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
      />

      {/* Player UI only shows when a set is loaded */}
      {currentSet && (
        <div className="shrink-0 relative">
          {/* Playing glow — thin gradient line at top */}
          {isPlaying && (
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          )}

          <div className="bg-[hsl(var(--b5)/0.85)] backdrop-blur-xl border-t border-[hsl(var(--br1)/0.5)]">
          {/* Mobile: full-width thin progress bar on top */}
          <div className="sm:hidden"><ProgressBar currentTime={currentTime} duration={duration} detections={detections} /></div>

          <div className="flex items-center h-16 sm:h-20 px-3 sm:px-4 gap-2 sm:gap-4">
            {/* Set info — left section */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-[120px] sm:w-[220px]">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-overlay rounded flex-shrink-0 overflow-hidden">
              {currentSet.cover_image_r2_key ? (
                <img src={getCoverUrl(currentSet.id)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                  </svg>
                </div>
              )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{currentSet.title}</p>
                <p className="text-[10px] sm:text-xs text-text-secondary truncate font-mono">
                  {currentDetection ? `${currentDetection.track_title}${currentDetection.track_artist ? ` — ${currentDetection.track_artist}` : ''}` : currentSet.artist}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 flex flex-col items-center gap-0.5 sm:gap-1 max-w-[600px]">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={playPrevious} className="hidden sm:block text-text-muted hover:text-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                </button>
                <button onClick={togglePlay} className="w-10 h-10 sm:w-9 sm:h-9 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20">
                  {isPlaying
                    ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    : <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                </button>
                <button onClick={playNext} className="hidden sm:block text-text-muted hover:text-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                </button>
              </div>
              <div className="hidden sm:flex w-full items-center gap-2">
                <span className="text-xs text-text-muted w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
                <ProgressBar currentTime={currentTime} duration={duration} detections={detections} />
                <span className="text-xs text-text-muted w-10 tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Mobile time */}
            <span className="sm:hidden text-[10px] text-text-muted tabular-nums flex-shrink-0">{formatTime(currentTime)}</span>

            {/* Volume + expand — right section (matches left width for centering) */}
            <div className="hidden sm:flex items-center gap-2 w-[220px] justify-end">
              <button onClick={toggleMute} className="text-text-secondary hover:text-text-primary transition-colors">
                {isMuted || volume === 0
                  ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                  : volume < 0.5
                  ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
                  : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-16 h-1 bg-border rounded-full appearance-none cursor-pointer accent-accent" />

              {/* Expand to full screen */}
              <button
                onClick={usePlayerStore.getState().toggleFullScreen}
                className="text-text-muted hover:text-text-primary transition-colors ml-1"
                title="Full screen player"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Full screen player overlay */}
      <FullScreenPlayer />
    </>
  )
}
