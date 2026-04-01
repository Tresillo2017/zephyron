import { useEffect, useCallback, useState, useRef } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { CoverFlowView } from './CoverFlowView'
import { useCurrentTrackCover } from '../../hooks/useCurrentTrackCover'
import { useAlbumColors } from '../../hooks/useAlbumColors'
import { VolumeSlider } from '../ui/VolumeSlider'
import { formatTime } from '../../lib/formatTime'
import { getSongCoverUrl } from '../../lib/api'
import { getAvailableServices, ServiceIconLink } from '../../lib/services'

type AnimState = 'hidden' | 'entering' | 'visible' | 'exiting'

export function FullScreenPlayer() {
  const {
    currentSet, isPlaying, currentTime, duration, volume, isMuted,
    currentDetection, detections, isFullScreen,
    isVideoMode, videoStreamUrl, isLoadingVideo,
    togglePlay, seek, setVolume, toggleMute,
    playNext, playPrevious, toggleFullScreen,
    setVideoMode, loadVideoStream, setVideoElement,
  } = usePlayerStore()

  const [animState, setAnimState] = useState<AnimState>('hidden')
  const [showTracklist, setShowTracklist] = useState(false)
  const tracklistRef = useRef<HTMLDivElement>(null)
  const activeTrackRef = useRef<HTMLButtonElement>(null)
  const coverUrl = useCurrentTrackCover()
  const { colors: albumColors } = useAlbumColors(coverUrl)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ambilightRef = useRef<HTMLCanvasElement>(null)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Ambilight — draws video frames to the canvas at 60fps
  useEffect(() => {
    const video = videoRef.current
    const canvas = ambilightRef.current
    if (!video || !canvas || !isVideoMode || !isPlaying) return

    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    if (!ctx) return

    let raf = 0
    const draw = () => {
      if (video.readyState >= 2 && !video.paused) {
        try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height) } catch { /* skip */ }
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [isVideoMode, isPlaying])

  // Auto-scroll tracklist to active track
  useEffect(() => {
    if (showTracklist && activeTrackRef.current) {
      activeTrackRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentDetection?.id, showTracklist])

  // Check if video is available for this set
  const hasVideo = !!currentSet?.youtube_video_id

  // Animation state machine
  useEffect(() => {
    if (isFullScreen) {
      const t1 = setTimeout(() => setAnimState('entering'), 0)
      const t2 = setTimeout(() => setAnimState('visible'), 50)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    } else {
      if (animState === 'visible' || animState === 'entering') {
        const t1 = setTimeout(() => setAnimState('exiting'), 0)
        const t2 = setTimeout(() => setAnimState('hidden'), 350)
        return () => { clearTimeout(t1); clearTimeout(t2) }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullScreen])

  // Register video element with store
  useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current)
    }
    return () => setVideoElement(null)
  }, [setVideoElement])

  // Load video stream when entering video mode
  useEffect(() => {
    if (isVideoMode && !videoStreamUrl && !isLoadingVideo) {
      loadVideoStream()
    }
  }, [isVideoMode, videoStreamUrl, isLoadingVideo, loadVideoStream])

  // Set video src when stream URL is resolved — wait for loadeddata before syncing time
  useEffect(() => {
    if (isVideoMode && videoStreamUrl && videoRef.current) {
      const video = videoRef.current

      const onReady = () => {
        const audio = usePlayerStore.getState().audioElement
        if (audio) {
          video.currentTime = audio.currentTime
        }
        if (usePlayerStore.getState().isPlaying) {
          video.play().catch(() => {})
        }
        video.removeEventListener('loadeddata', onReady)
      }

      video.addEventListener('loadeddata', onReady)
      video.src = videoStreamUrl
      video.load()

      return () => video.removeEventListener('loadeddata', onReady)
    }
  }, [videoStreamUrl, isVideoMode])

  // Sync video play/pause state + periodic drift correction
  useEffect(() => {
    if (isVideoMode) {
      const video = videoRef.current
      if (video) {
        if (isPlaying) {
          // Sync time before playing
          const audio = usePlayerStore.getState().audioElement
          if (audio && Math.abs(video.currentTime - audio.currentTime) > 0.15) {
            video.currentTime = audio.currentTime
          }
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      }

      // Periodic drift correction — 200ms interval, 150ms tolerance
      if (isPlaying) {
        syncIntervalRef.current = setInterval(() => {
          const audio = usePlayerStore.getState().audioElement
          const vid = videoRef.current
          if (audio && vid && Math.abs(vid.currentTime - audio.currentTime) > 0.15) {
            vid.currentTime = audio.currentTime
          }
        }, 200)
      }
    } else {
      // Not in video mode — ensure video is paused
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause()
      }
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [isVideoMode, isPlaying])

  // Keyboard shortcuts
  useEffect(() => {
    if (animState === 'hidden') return
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
  }, [animState, toggleFullScreen, togglePlay, seek, currentTime, duration])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }, [duration, seek])

  const handleToggleVideoMode = useCallback((enabled: boolean) => {
    setVideoMode(enabled)
    if (enabled && !videoStreamUrl) {
      loadVideoStream()
    }
    if (!enabled) {
      setShowTracklist(false)
    }
  }, [setVideoMode, videoStreamUrl, loadVideoStream])

  if (animState === 'hidden' || !currentSet) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const isVisible = animState === 'visible'
  const isEntering = animState === 'entering' || animState === 'visible'

  // Current track info for the bottom bar
  const song = currentDetection?.song
  const songCover = song?.cover_art_r2_key ? getSongCoverUrl(song.id) : song?.cover_art_url || song?.lastfm_album_art || null
  const serviceLinks = song ? getAvailableServices(song as unknown as Record<string, unknown>) : []

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: '#050507',
        transform: isEntering ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
      }}
    >
      {/* Layer 1: Blurred album art (audio mode only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {coverUrl && (
          <img
            key={coverUrl}
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scale(1.5)', filter: 'blur(80px) saturate(1.6)', opacity: isVideoMode ? 0 : 0.25, transition: 'opacity 0.6s ease' }}
          />
        )}
      </div>

      {/* Layer 2: Gradient mesh from album colors (audio mode only) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 15% 15%, ${albumColors.vibrant}40 0%, transparent 55%),
            radial-gradient(ellipse at 85% 20%, ${albumColors.darkVibrant}35 0%, transparent 55%),
            radial-gradient(ellipse at 50% 85%, ${albumColors.muted}30 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, ${albumColors.darkMuted}45 0%, transparent 55%)
          `,
          animation: 'gradientDrift 20s ease-in-out infinite alternate',
          transition: 'opacity 0.6s ease',
          opacity: isVideoMode ? 0 : 1,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }}
      />

      {/* ═══ CONTENT ═══ */}
      <div
        className="relative z-10 flex flex-col h-full"
        style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.3s ease 0.1s' }}
      >
        {/* Top bar — toggle + close */}
        <div className="flex items-center justify-between px-6 h-12 shrink-0">
          <span className="text-[10px] font-mono tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>NOW PLAYING</span>
          <div className="flex items-center gap-3">
            {/* Audio / Video pill toggle */}
            {hasVideo && (
              <div
                className="flex items-center rounded-[var(--button-radius)] overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
              >
                <button
                  onClick={() => handleToggleVideoMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wide transition-all"
                  style={{
                    background: !isVideoMode ? 'hsl(var(--h3) / 0.2)' : 'transparent',
                    color: !isVideoMode ? 'hsl(var(--h3))' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                  AUDIO
                </button>
                <button
                  onClick={() => handleToggleVideoMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wide transition-all"
                  style={{
                    background: isVideoMode ? 'hsl(var(--h3) / 0.2)' : 'transparent',
                    color: isVideoMode ? 'hsl(var(--h3))' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                  VIDEO
                </button>
              </div>
            )}

            {/* Close */}
            <button
              onClick={toggleFullScreen}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = '' }}
              title="Close (Esc)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main area — CoverFlow or Video with crossfade */}
        <div className="flex-1 min-h-0 relative">
          {/* CoverFlow (audio mode) */}
          <div
            className="absolute inset-0"
            style={{
              opacity: isVideoMode ? 0 : 1,
              transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isVideoMode ? 'none' : 'auto',
            }}
          >
            <CoverFlowView />
          </div>

          {/* Video (video mode) */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: isVideoMode ? 1 : 0,
              transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
              pointerEvents: isVideoMode ? 'auto' : 'none',
            }}
          >
            {/* Ambilight canvas */}
            <canvas
              ref={ambilightRef}
              width={64}
              height={36}
              className="absolute pointer-events-none"
              style={{
                width: '100%',
                height: '100%',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(1.15)',
                filter: 'blur(60px) saturate(2)',
                opacity: isVideoMode && isPlaying ? 0.55 : 0,
                transition: 'opacity 0.6s ease',
              }}
            />

            {/* Video + Tracklist */}
            <div
              className="relative flex items-center w-full h-full justify-center px-8"
              style={{ zIndex: 1 }}
            >
              {/* Centering wrapper — shifts left when tracklist opens */}
              <div
                style={{
                  maxWidth: '960px',
                  width: '100%',
                  position: 'relative',
                  transform: showTracklist ? 'translateX(-150px)' : 'translateX(0)',
                  transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Video */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{
                    aspectRatio: '16 / 9',
                    borderRadius: showTracklist
                      ? 'var(--card-radius) 0 0 var(--card-radius)'
                      : 'var(--card-radius)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    background: '#000',
                    transition: 'border-radius 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    playsInline
                    muted
                  />
                  {isLoadingVideo && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'hsl(var(--h3))' }} />
                    </div>
                  )}
                </div>

                {/* Toggle + Tracklist — anchored to video right edge, grows outward */}
                <div
                  className="absolute top-0 bottom-0 flex"
                  style={{ left: '100%' }}
                >
                  {/* Tracklist panel — expands first (button moves with it) */}
                  <div
                    ref={tracklistRef}
                    className="overflow-hidden"
                    style={{
                      width: showTracklist ? 300 : 0,
                      opacity: showTracklist ? 1 : 0,
                      background: 'rgba(0, 0, 0, 0.5)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      boxShadow: showTracklist ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'none',
                      transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div className="flex flex-col h-full" style={{ width: 300 }}>
                      <div className="px-4 pt-3 pb-2 shrink-0">
                        <p className="text-[11px] font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>TRACKLIST</p>
                        <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{detections.length} tracks</p>
                      </div>
                      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
                        {detections.map((detection) => {
                          const isActive = currentDetection?.id === detection.id
                          const song = detection.song
                          const cover = song?.cover_art_r2_key
                            ? getSongCoverUrl(song.id)
                            : song?.cover_art_url || song?.lastfm_album_art || null
                          return (
                            <button
                              key={detection.id}
                              ref={isActive ? activeTrackRef : undefined}
                              onClick={() => seek(detection.start_time_seconds)}
                              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors"
                              style={{ background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                            >
                              <span className="text-[10px] font-mono tabular-nums w-9 text-center shrink-0" style={{ color: isActive ? 'hsl(var(--h3))' : 'rgba(255,255,255,0.3)' }}>
                                {isActive && isPlaying ? (
                                  <span className="flex items-center justify-center">
                                    <span className="flex gap-[2px] items-end h-2.5">
                                      <span className="w-[2px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-1 0.8s ease-in-out infinite' }} />
                                      <span className="w-[2px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-2 0.6s ease-in-out infinite' }} />
                                      <span className="w-[2px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-3 0.7s ease-in-out infinite' }} />
                                    </span>
                                  </span>
                                ) : formatTime(detection.start_time_seconds)}
                              </span>
                              {cover ? (
                                <img src={cover} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }} />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] truncate leading-tight" style={{ color: isActive ? 'hsl(var(--h3))' : 'rgba(255,255,255,0.75)' }}>
                                  {detection.track_title}
                                </p>
                                {detection.track_artist && (
                                  <p className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{detection.track_artist}</p>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Toggle button — after the panel, so it's pushed right as panel grows */}
                  <button
                    onClick={() => setShowTracklist((v) => !v)}
                    className="flex items-center justify-center shrink-0 self-center"
                    style={{
                      width: 20,
                      height: 40,
                      borderRadius: '0 6px 6px 0',
                      background: 'rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                      color: showTracklist ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = showTracklist ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                    title={showTracklist ? 'Hide tracklist' : 'Show tracklist'}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      style={{
                        transform: showTracklist ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div
          className="shrink-0 px-6 pb-5 pt-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
        >
          <div className="max-w-2xl mx-auto">

            {/* Track info row (always visible in video mode, hidden in audio since CoverFlow shows it) */}
            <div
              className="flex items-center gap-3 mb-3"
              style={{
                opacity: isVideoMode ? 1 : 0,
                maxHeight: isVideoMode ? 60 : 0,
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Mini cover */}
              {songCover ? (
                <img src={songCover} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }} />
              ) : (
                <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}

              {/* Title + artist */}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {currentDetection?.track_title || currentSet.title}
                </p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {currentDetection?.track_artist || currentSet.artist}
                </p>
              </div>

              {/* Service links */}
              {serviceLinks.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {serviceLinks.slice(0, 4).map(({ url, service }) => (
                    <ServiceIconLink key={service.key} url={url} service={service} size={14} />
                  ))}
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="relative h-[5px] rounded-full cursor-pointer group" style={{ background: 'rgba(255,255,255,0.15)' }} onClick={handleSeek}>
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ width: `${progress}%`, background: 'hsl(var(--h3))', transition: 'width 0.1s linear' }}
              />
              <div
                className="absolute top-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>

            {/* Time */}
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatTime(currentTime)}</span>
              <span className="text-[10px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatTime(duration)}</span>
            </div>

            {/* Transport + Volume */}
            <div className="flex items-center justify-between mt-2">
              {/* Left spacer */}
              <div className="w-28" />

              {/* Center: transport controls */}
              <div className="flex items-center gap-6">
                <button
                  onClick={playPrevious}
                  className="transition-all"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                </button>

                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                  style={{ background: 'hsl(var(--h3))', boxShadow: '0 4px 20px hsl(var(--h4) / 0.35)' }}
                >
                  {isPlaying
                    ? <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    : <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                </button>

                <button
                  onClick={playNext}
                  className="transition-all"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                </button>
              </div>

              {/* Right: volume */}
              <VolumeSlider
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
                variant="fullscreen"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes gradientDrift {
          0% { background-position: 0% 0%, 100% 0%, 50% 100%, 100% 100%; }
          25% { background-position: 30% 10%, 70% 30%, 20% 80%, 80% 60%; }
          50% { background-position: 50% 20%, 50% 50%, 80% 50%, 20% 80%; }
          75% { background-position: 20% 30%, 80% 10%, 40% 70%, 60% 90%; }
          100% { background-position: 0% 0%, 100% 0%, 50% 100%, 100% 100%; }
        }
        @keyframes stackReveal {
          from { opacity: 0; transform: translateY(-15px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
