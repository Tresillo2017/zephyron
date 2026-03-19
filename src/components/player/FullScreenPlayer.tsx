import { useEffect, useCallback } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { Waveform } from './Waveform'
import { formatTime } from '../../lib/formatTime'
import { getCoverUrl } from '../../lib/api'

export function FullScreenPlayer() {
  const {
    currentSet, isPlaying, currentTime, duration, volume, isMuted,
    currentDetection, detections, isFullScreen,
    togglePlay, seek, setVolume, toggleMute, playNext, playPrevious, toggleFullScreen,
  } = usePlayerStore()

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

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }, [duration, seek])

  if (!isFullScreen || !currentSet) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const fakePeaks = Array.from({ length: 300 }, (_, i) => {
    const s = Math.sin(i * 0.3 + (currentSet.id.charCodeAt(0) || 0)) * 0.5 + 0.5
    return s * 0.8 + 0.1
  })

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col">
      {/* Blurred cover background */}
      {currentSet.cover_image_r2_key && (
        <div className="absolute inset-0 pointer-events-none">
          <img src={getCoverUrl(currentSet.id)} alt="" className="w-full h-full object-cover scale-125 blur-[80px] opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/30 via-surface/60 to-surface" />
        </div>
      )}
      {!currentSet.cover_image_r2_key && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-accent/8 rounded-full blur-[150px]" />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <span className="text-[10px] font-mono text-text-muted tracking-wider">NOW PLAYING</span>
          <button onClick={toggleFullScreen} className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface-hover" title="Close (Esc)">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Two-column content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 px-6 pb-6 gap-8">

          {/* LEFT: cover + info + controls */}
          <div className="lg:w-[420px] xl:w-[480px] flex flex-col items-center lg:items-start shrink-0 overflow-y-auto">
            {/* Cover */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-72 lg:h-72 xl:w-80 xl:h-80 bg-surface-overlay rounded-lg overflow-hidden shadow-2xl mb-6 shrink-0">
              {currentSet.cover_image_r2_key ? (
                <img src={getCoverUrl(currentSet.id)} alt={currentSet.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-surface-overlay">
                  <svg className="w-16 h-16 text-text-muted/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center lg:text-left w-full mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 truncate">{currentSet.title}</h1>
              <p className="text-base text-text-secondary">{currentSet.artist}</p>
              {currentSet.genre && <p className="text-xs font-mono text-accent mt-1">{currentSet.genre}</p>}
            </div>

            {/* Waveform */}
            <div className="w-full mb-5">
              <Waveform peaks={fakePeaks} duration={duration} detections={detections} height={48} />
            </div>

            {/* Progress bar */}
            <div className="w-full mb-5">
              <div className="relative h-1.5 bg-border rounded-full cursor-pointer group" onClick={handleSeek}>
                <div className="absolute top-0 left-0 h-full bg-accent rounded-full transition-[width] duration-100" style={{ width: `${progress}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs font-mono text-text-muted tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-xs font-mono text-text-muted tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center lg:justify-start gap-6 w-full mb-5">
              <button onClick={playPrevious} className="text-text-muted hover:text-text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
              </button>
              <button onClick={togglePlay} className="w-14 h-14 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/30">
                {isPlaying
                  ? <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  : <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button onClick={playNext} className="text-text-muted hover:text-text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 justify-center lg:justify-start w-full">
              <button onClick={toggleMute} className="text-text-muted hover:text-text-primary transition-colors">
                {isMuted || volume === 0
                  ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                  : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-28 h-1 bg-border rounded-full appearance-none cursor-pointer accent-accent" />
            </div>
          </div>

          {/* RIGHT: syncing tracklist */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Tracklist</h2>
                <p className="text-[10px] text-text-muted font-mono">{detections.length} tracks</p>
              </div>
              {currentDetection && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-[2px] items-end h-3">
                    <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-1 0.8s ease-in-out infinite' }} />
                    <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-2 0.6s ease-in-out infinite' }} />
                    <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-3 0.7s ease-in-out infinite' }} />
                  </div>
                  <span className="text-xs text-accent font-medium truncate max-w-[200px]">{currentDetection.track_title}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border border-border bg-surface-raised/50">
              {detections.map((detection, i) => {
                const endTime = detection.end_time_seconds
                  ?? (i + 1 < detections.length ? detections[i + 1].start_time_seconds : duration)
                const isActive = currentTime >= detection.start_time_seconds && currentTime < endTime

                return (
                  <button
                    key={detection.id}
                    onClick={() => seek(detection.start_time_seconds)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
                      isActive ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-surface-hover border-l-2 border-l-transparent'
                    } ${i > 0 ? 'border-t border-border' : ''}`}
                  >
                    <span className={`text-xs font-mono w-12 tabular-nums shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`}>
                      {formatTime(detection.start_time_seconds)}
                    </span>
                    {isActive && (
                      <div className="flex gap-[2px] items-end h-3 shrink-0">
                        <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-1 0.8s ease-in-out infinite' }} />
                        <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-2 0.6s ease-in-out infinite' }} />
                        <div className="w-[3px] bg-accent rounded-sm" style={{ animation: 'eq-bar-3 0.7s ease-in-out infinite' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isActive ? 'text-accent font-medium' : 'text-text-primary'}`}>
                        {detection.track_title}
                      </p>
                      {detection.track_artist && (
                        <p className="text-xs text-text-muted truncate">{detection.track_artist}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono shrink-0 ${
                      detection.confidence >= 0.8 ? 'text-success' : detection.confidence >= 0.5 ? 'text-warning' : 'text-text-muted'
                    }`}>
                      {Math.round(detection.confidence * 100)}%
                    </span>
                  </button>
                )
              })}
              {detections.length === 0 && (
                <div className="flex items-center justify-center h-full text-text-muted text-sm py-12">
                  No tracks detected yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
