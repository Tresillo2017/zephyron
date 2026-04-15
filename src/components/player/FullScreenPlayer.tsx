import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { CoverFlowView } from './CoverFlowView'
import { useCurrentTrackCover } from '../../hooks/useCurrentTrackCover'
import { useAlbumColors } from '../../hooks/useAlbumColors'
import { VolumeSlider } from '../ui/VolumeSlider'
import { LikeButton } from '../ui/LikeButton'
import { formatTime } from '../../lib/formatTime'
import { getSongCoverUrl, fetchStoryboard, type StoryboardData } from '../../lib/api'
import { getAvailableServices, ServiceIconLink } from '../../lib/services'
import type { Detection } from '../../lib/types'

type AnimState = 'hidden' | 'entering' | 'visible' | 'exiting'

// ─── Storyboard helpers ──────────────────────────────────────────────────────

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

export function FullScreenPlayer() {
  const {
    currentSet, isPlaying, currentTime, duration, volume, isMuted,
    currentDetection, currentDetections, detections, isFullScreen,
    isVideoMode, videoStreamUrl, isLoadingVideo,
    isTheaterMode, setTheaterMode,
    togglePlay, seek, setVolume, toggleMute,
    playNext, playPrevious, toggleFullScreen,
    setVideoMode, loadVideoStream, setVideoElement,
  } = usePlayerStore()

  const [animState, setAnimState] = useState<AnimState>('hidden')
  const [showTracklist, setShowTracklist] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [upNextDetection, setUpNextDetection] = useState<Detection | null>(null)
  const [showUpNext, setShowUpNext] = useState(false)
  const [nowPlayingFlash, setNowPlayingFlash] = useState(false)
  const [upNextExiting, setUpNextExiting] = useState(false)
  const [theaterEntering, setTheaterEntering] = useState(false)
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [hoverBarWidth, setHoverBarWidth] = useState(0)
  const tracklistRef = useRef<HTMLDivElement>(null)
  const activeTrackRef = useRef<HTMLButtonElement>(null)
  const coverUrl = useCurrentTrackCover()
  const { colors: albumColors } = useAlbumColors(coverUrl)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ambilightRef = useRef<HTMLCanvasElement>(null)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const upNextShownForRef = useRef<string | null>(null)

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

  // Pre-compute static concurrent groups by start_time_seconds proximity (≤2s = same group)
  // This mirrors the CoverFlow grouping so secondary tracks always appear indented,
  // not just at runtime when currentDetections has multiple entries.
  const detectionGroups = useMemo(() => {
    interface Group {
      primary: Detection
      secondaries: Detection[]
    }
    const groups: Group[] = []
    for (const d of detections) {
      const last = groups[groups.length - 1]
      if (last && Math.abs(d.start_time_seconds - last.primary.start_time_seconds) <= 2) {
        last.secondaries.push(d)
      } else {
        groups.push({ primary: d, secondaries: [] })
      }
    }
    return groups
  }, [detections])

  // Storyboard fetch
  useEffect(() => {
    if (!currentSet) { setStoryboard(null); return }
    if (currentSet.stream_type === 'invidious' || currentSet.youtube_video_id) {
      fetchStoryboard(currentSet.id).then(setStoryboard).catch(() => setStoryboard(null))
    } else {
      setStoryboard(null)
    }
  }, [currentSet?.id])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }, [duration, seek])

  const handleProgressMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHoverX(x)
    setHoverBarWidth(rect.width)
    setHoverTime(Math.max(0, Math.min(duration, (x / rect.width) * duration)))
  }, [duration])

  const handleProgressMouseLeave = useCallback(() => setHoverTime(null), [])

  const handleToggleVideoMode = useCallback((enabled: boolean) => {
    setVideoMode(enabled)
    if (enabled && !videoStreamUrl) {
      loadVideoStream()
    }
    if (!enabled) {
      setShowTracklist(false)
      if (isTheaterMode) {
        setTheaterMode(false)
        setShowControls(true)
        // Exit browser fullscreen when switching to audio with theater mode
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
      }
    }
  }, [setVideoMode, videoStreamUrl, loadVideoStream, isTheaterMode, setTheaterMode])

  // Fire theaterEntering animation whenever theater mode turns on
  useEffect(() => {
    if (!isTheaterMode) return
    setTheaterEntering(true)
    const t = setTimeout(() => setTheaterEntering(false), 400)
    return () => clearTimeout(t)
  }, [isTheaterMode])

  // Theater mode toggle — also requests/exits browser fullscreen on the FullScreenPlayer root
  const fullscreenTargetRef = useRef<HTMLDivElement>(null)

  const handleToggleTheater = useCallback(() => {
    const next = !isTheaterMode
    setTheaterMode(next)
    if (next) {
      // Enter browser fullscreen
      const el = fullscreenTargetRef.current
      if (el && !document.fullscreenElement) {
        el.requestFullscreen().catch(() => {})
      }
      setShowControls(true)
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
    } else {
      // Exit browser fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      setShowControls(true)
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  }, [isTheaterMode, setTheaterMode])

  // If user presses the browser's native Esc/exit-fullscreen, also clear theater mode
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && isTheaterMode) {
        setTheaterMode(false)
        setShowControls(true)
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [isTheaterMode, setTheaterMode])

  // Show controls on mouse move anywhere in theater mode, hide after 3s of inactivity
  const handleTheaterMouseMove = useCallback(() => {
    if (!isTheaterMode) return
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [isTheaterMode])

  // "Up Next" notification — appear 15s before next track, stay until it starts
  useEffect(() => {
    if (!isTheaterMode || detections.length === 0) return
    const nextDetection = detections.find(d => d.start_time_seconds > currentTime)
    if (!nextDetection) return
    const timeUntilNext = nextDetection.start_time_seconds - currentTime
    if (timeUntilNext <= 15 && timeUntilNext > 0 && upNextShownForRef.current !== nextDetection.id) {
      upNextShownForRef.current = nextDetection.id
      setUpNextDetection(nextDetection)
      setShowUpNext(true)
      // No auto-dismiss — it stays until the track starts (see effect below)
    }
  }, [currentTime, detections, isTheaterMode])

  // When the up-next track becomes current: exit animation → collapse → promote flash
  useEffect(() => {
    if (!upNextDetection || !currentDetection) return
    if (currentDetection.id === upNextDetection.id && showUpNext) {
      // Phase 1: up-next row flies upward (300ms)
      setUpNextExiting(true)
      const t1 = setTimeout(() => {
        // Phase 2: collapse max-height, trigger now-playing flash
        setShowUpNext(false)
        setUpNextExiting(false)
        setNowPlayingFlash(true)
        const t2 = setTimeout(() => setNowPlayingFlash(false), 1100)
        return () => clearTimeout(t2)
      }, 280)
      return () => clearTimeout(t1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDetection?.id])

  if (animState === 'hidden' || !currentSet) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const thumbnailInfo = storyboard && hoverTime !== null ? getThumbnailPosition(storyboard, hoverTime) : null
  const isVisible = animState === 'visible'
  const isEntering = animState === 'entering' || animState === 'visible'

  // Current track info for the bottom bar
  const song = currentDetection?.song
  const songCover = song?.cover_art_r2_key ? getSongCoverUrl(song.id) : song?.cover_art_url || song?.lastfm_album_art || null
  const serviceLinks = song ? getAvailableServices(song as unknown as Record<string, unknown>) : []

  // Concurrent tracks playing alongside the up-next detection (within 2s)
  const upNextConcurrent = upNextDetection
    ? detections.filter(d => d.id !== upNextDetection.id && Math.abs(d.start_time_seconds - upNextDetection.start_time_seconds) <= 2)
    : []

  return (
    <div
      ref={fullscreenTargetRef}
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
        onMouseMove={handleTheaterMouseMove}
      >
        {/* Top bar — toggle + close */}
        <div
          className="flex items-center justify-between px-6 h-12 shrink-0"
          style={isTheaterMode ? {
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
            opacity: showControls ? 1 : 0,
            transform: showControls ? 'translateY(0)' : 'translateY(-100%)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            pointerEvents: showControls ? 'auto' : 'none',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
          } : undefined}
        >
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

            {/* Experimental video warning */}
            {hasVideo && isVideoMode && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wide"
                style={{
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  color: 'rgba(251, 191, 36, 0.8)',
                }}
              >
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                EXPERIMENTAL
              </div>
            )}

            {/* Theater mode button — only in video mode */}
            {hasVideo && isVideoMode && (
              <button
                onClick={handleToggleTheater}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  color: isTheaterMode ? 'hsl(var(--h3))' : 'rgba(255,255,255,0.4)',
                  background: isTheaterMode ? 'hsl(var(--h3) / 0.12)' : 'transparent',
                  boxShadow: isTheaterMode ? 'inset 0 0 0 1px hsl(var(--h3) / 0.3)' : 'none',
                }}
                onMouseEnter={(e) => { if (!isTheaterMode) { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' } }}
                onMouseLeave={(e) => { if (!isTheaterMode) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = '' } }}
                title={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
              >
                {isTheaterMode ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
              </button>
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
        <div className={isTheaterMode ? 'absolute inset-0' : 'flex-1 min-h-0 relative'}>
          {/* CoverFlow (audio mode) */}
          <div
            className="absolute inset-0"
            style={{
              opacity: isVideoMode ? 0 : 1,
              transform: isVideoMode ? 'scale(0.97)' : 'scale(1)',
              filter: isVideoMode ? 'blur(4px)' : 'blur(0)',
              transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
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
              transform: isVideoMode ? 'scale(1)' : 'scale(0.97)',
              filter: isVideoMode ? 'blur(0)' : 'blur(4px)',
              transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s, filter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s',
              pointerEvents: isVideoMode ? 'auto' : 'none',
              background: isTheaterMode ? '#000' : 'transparent',
              cursor: isTheaterMode && !showControls ? 'none' : undefined,
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
              className="relative flex items-center w-full h-full justify-center"
              style={{ zIndex: 1, padding: isTheaterMode ? 0 : '0 32px' }}
            >
              {/* Centering wrapper — shifts left when tracklist opens */}
              <div
                style={{
                  maxWidth: isTheaterMode ? 'none' : '960px',
                  width: '100%',
                  height: isTheaterMode ? '100%' : undefined,
                  position: 'relative',
                  transform: !isTheaterMode && showTracklist ? 'translateX(-150px)' : 'translateX(0)',
                  transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Video */}
                <div
                  className="relative w-full overflow-hidden"
                  style={isTheaterMode ? {
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 0,
                    boxShadow: 'none',
                    background: '#000',
                    animation: theaterEntering ? 'theaterExpand 0.55s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                  } : {
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

                {/* Toggle + Tracklist — anchored to right edge (fixed overlay in theater mode) */}
                <div
                  className="absolute flex"
                  style={isTheaterMode
                    ? { top: '50%', transform: 'translateY(-50%)', right: 0, left: 'auto', flexDirection: 'row-reverse', maxHeight: 'min(480px, calc(100% - 200px))' }
                    : { top: 0, bottom: 0, left: '100%' }
                  }
                >
                  {/* Tracklist panel — expands first (button moves with it) */}
                  <div
                    ref={tracklistRef}
                    className="overflow-hidden"
                    style={{
                      width: showTracklist ? 300 : 0,
                      opacity: showTracklist ? 1 : 0,
                      maxHeight: isTheaterMode ? '100%' : undefined,
                      background: 'rgba(0, 0, 0, 0.5)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      borderRadius: isTheaterMode ? '12px 0 0 12px' : '0 12px 12px 0',
                      boxShadow: showTracklist ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'none',
                      transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div className="flex flex-col" style={{ width: 300, height: isTheaterMode ? undefined : '100%', maxHeight: isTheaterMode ? '100%' : undefined }}>
                      <div className="px-4 pt-3 pb-2 shrink-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>TRACKLIST</p>
                          {currentDetections.length > 1 && (
                            <span
                              className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                background: 'hsl(var(--h3) / 0.15)',
                                color: 'hsl(var(--h3))',
                                border: '1px solid hsl(var(--h3) / 0.25)',
                              }}
                            >
                              {currentDetections.length} PLAYING
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{detections.length} tracks</p>
                      </div>
                      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
                        {detectionGroups.map((group) => {
                          const primaryDetection = group.primary
                          const isPrimaryActive = currentDetections.some((d) => d.id === primaryDetection.id) || currentDetection?.id === primaryDetection.id
                          const isPrimaryPlaying = currentDetection?.id === primaryDetection.id
                          const hasSecondaries = group.secondaries.length > 0
                          const primarySong = primaryDetection.song
                          const primaryCover = primarySong?.cover_art_r2_key
                            ? getSongCoverUrl(primarySong.id)
                            : primarySong?.cover_art_url || primarySong?.lastfm_album_art || null

                          return (
                            <div key={primaryDetection.id}>
                              {/* Primary track row */}
                              <button
                                ref={isPrimaryPlaying ? activeTrackRef : undefined}
                                onClick={() => seek(primaryDetection.start_time_seconds)}
                                className="w-full flex items-center text-left relative"
                                style={{
                                  paddingLeft: 8,
                                  paddingRight: 8,
                                  paddingTop: 6,
                                  paddingBottom: 6,
                                  gap: 10,
                                  borderRadius: '8px',
                                  background: isPrimaryPlaying
                                    ? 'hsl(var(--h3) / 0.12)'
                                    : isPrimaryActive
                                    ? 'hsl(var(--h3) / 0.07)'
                                    : 'transparent',
                                  boxShadow: isPrimaryPlaying
                                    ? 'inset 1px 1px 0 hsl(var(--h3) / 0.25), inset -1px 0 0 hsl(var(--h3) / 0.25), inset 0 -1px 0 hsl(var(--h3) / 0.1)'
                                    : isPrimaryActive
                                    ? 'inset 0 0 0 1px hsl(var(--h3) / 0.15)'
                                    : 'none',
                                  transition: 'background 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isPrimaryActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                                }}
                                onMouseLeave={(e) => {
                                  if (!isPrimaryActive) e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                {/* Left accent bar */}
                                {isPrimaryPlaying && (
                                  <span
                                    className="absolute left-0 top-1 bottom-1 rounded-full"
                                    style={{ width: 2, background: 'hsl(var(--h3))' }}
                                  />
                                )}

                                {/* Timestamp / EQ indicator */}
                                <span
                                  className="text-[10px] font-mono tabular-nums w-9 text-center shrink-0 pl-1"
                                  style={{ color: isPrimaryActive ? 'hsl(var(--h3))' : 'rgba(255,255,255,0.3)' }}
                                >
                                  {isPrimaryPlaying && isPlaying ? (
                                    <span className="flex items-center justify-center">
                                      <span className="flex gap-[2px] items-end h-2.5">
                                        <span className="w-[2px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-1 0.8s ease-in-out infinite' }} />
                                        <span className="w-[2px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-2 0.6s ease-in-out infinite' }} />
                                        <span className="w-[2px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-3 0.7s ease-in-out infinite' }} />
                                      </span>
                                    </span>
                                  ) : (
                                    formatTime(primaryDetection.start_time_seconds)
                                  )}
                                </span>

                                {/* Cover art */}
                                {primaryCover ? (
                                  <img
                                    src={primaryCover}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover shrink-0"
                                    style={{
                                      boxShadow: isPrimaryPlaying ? '0 0 0 1.5px hsl(var(--h3) / 0.6)' : 'none',
                                      opacity: isPrimaryActive ? 1 : 0.7,
                                      transition: 'box-shadow 0.2s ease, opacity 0.2s ease',
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="w-8 h-8 rounded shrink-0"
                                    style={{
                                      background: isPrimaryActive ? 'hsl(var(--h3) / 0.1)' : 'rgba(255,255,255,0.04)',
                                      boxShadow: isPrimaryPlaying ? 'inset 0 0 0 1px hsl(var(--h3) / 0.4)' : 'none',
                                    }}
                                  />
                                )}

                                {/* Track info */}
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="text-[11px] truncate leading-tight"
                                    style={{ color: isPrimaryActive ? 'hsl(var(--h3))' : 'rgba(255,255,255,0.75)' }}
                                  >
                                    {primaryDetection.track_title}
                                  </p>
                                  {primaryDetection.track_artist && (
                                    <p
                                      className="text-[9px] truncate"
                                      style={{ color: isPrimaryActive ? 'hsl(var(--h3) / 0.6)' : 'rgba(255,255,255,0.3)' }}
                                    >
                                      {primaryDetection.track_artist}
                                    </p>
                                  )}
                                </div>

                                {/* Like button */}
                                {primarySong && (
                                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                    <LikeButton songId={primarySong.id} size={12} />
                                  </div>
                                )}
                              </button>

                              {/* Secondary (w/) tracks — SetPage-style indented layout */}
                              {hasSecondaries && (
                                <div style={{ marginLeft: 48, marginRight: 8, marginBottom: 2 }}>
                                  {group.secondaries.map((secondary) => {
                                    const isSecActive = currentDetections.some((d) => d.id === secondary.id)
                                    const secondarySong = secondary.song
                                    const secondaryCover = secondarySong?.cover_art_r2_key
                                      ? getSongCoverUrl(secondarySong.id)
                                      : secondarySong?.cover_art_url || secondarySong?.lastfm_album_art || null

                                    return (
                                      <button
                                        key={secondary.id}
                                        onClick={() => seek(secondary.start_time_seconds)}
                                        className="w-full flex items-center text-left rounded-lg transition-colors"
                                        style={{
                                          padding: '4px 6px',
                                          gap: 8,
                                          background: isSecActive ? 'hsl(var(--h3) / 0.06)' : 'transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isSecActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = isSecActive ? 'hsl(var(--h3) / 0.06)' : 'transparent'
                                        }}
                                      >
                                        {/* w/ label — matches SetPage DetectionRow */}
                                        <span
                                          className="text-[8px] font-mono shrink-0 w-5 text-center"
                                          style={{ color: isSecActive ? 'hsl(var(--h3) / 0.5)' : 'rgba(255,255,255,0.2)' }}
                                        >
                                          w/
                                        </span>

                                        {/* Small cover art */}
                                        {secondaryCover ? (
                                          <img
                                            src={secondaryCover}
                                            alt=""
                                            className="rounded object-cover shrink-0"
                                            style={{
                                              width: 24, height: 24,
                                              opacity: isSecActive ? 0.9 : 0.55,
                                              transition: 'opacity 0.2s ease',
                                            }}
                                          />
                                        ) : (
                                          <div
                                            className="rounded shrink-0 flex items-center justify-center"
                                            style={{
                                              width: 24, height: 24,
                                              background: isSecActive ? 'hsl(var(--h3) / 0.08)' : 'rgba(255,255,255,0.03)',
                                            }}
                                          >
                                            <svg className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.15)' }} fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                            </svg>
                                          </div>
                                        )}

                                        {/* Track info */}
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className="text-[10px] truncate leading-tight"
                                            style={{ color: isSecActive ? 'hsl(var(--h3) / 0.8)' : 'rgba(255,255,255,0.45)' }}
                                          >
                                            {secondary.track_title}
                                          </p>
                                          {secondary.track_artist && (
                                            <p className="text-[8px] truncate" style={{ color: isSecActive ? 'hsl(var(--h3) / 0.45)' : 'rgba(255,255,255,0.2)' }}>
                                              {secondary.track_artist}
                                            </p>
                                          )}
                                        </div>

                                        {/* Like button */}
                                        {secondarySong && (
                                          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                            <LikeButton songId={secondarySong.id} size={10} />
                                          </div>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
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
                      borderRadius: isTheaterMode ? '6px 0 0 6px' : '0 6px 6px 0',
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
                        transform: isTheaterMode
                          ? (showTracklist ? 'rotate(0deg)' : 'rotate(180deg)')
                          : (showTracklist ? 'rotate(180deg)' : 'rotate(0deg)'),
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

          {/* ── THEATER MODE OVERLAYS ── */}

          {/* Now Playing card — slides up when controls hide, Up Next expands below */}
          {isTheaterMode && (
            <div
              style={{
                position: 'absolute',
                // when controls are hidden, slide up to top-right corner (16px from edge)
                top: showControls ? 68 : 16,
                right: 16,
                zIndex: 110,
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                background: 'rgba(0,0,0,0.6)',
                boxShadow: nowPlayingFlash
                  ? 'inset 0 0 0 1.5px hsl(var(--h3) / 0.6), 0 8px 32px hsl(var(--h4) / 0.4)'
                  : 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 12px 40px rgba(0,0,0,0.5)',
                borderRadius: 14,
                overflow: 'hidden',
                width: 260,
                transition: 'top 0.65s cubic-bezier(0.34, 1.4, 0.64, 1), right 0.65s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.4s ease',
                animation: nowPlayingFlash ? 'nowPlayingFlash 1.1s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
              }}
            >
              {/* Now Playing row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }}>
                <div
                  className="relative shrink-0 rounded-lg overflow-hidden"
                  style={{
                    width: 40, height: 40,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                    animation: nowPlayingFlash ? 'coverPromote 0.7s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                  }}
                >
                  {songCover ? (
                    <img key={songCover} src={songCover} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ animation: 'coverFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '0.1em',
                    color: 'hsl(var(--h3) / 0.7)',
                    marginBottom: 2,
                    animation: nowPlayingFlash ? 'labelFlash 0.8s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                  }}>NOW PLAYING</p>
                  <p key={currentDetection?.id} style={{ fontSize: 11, color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, animation: nowPlayingFlash ? 'nowPlayingTextPop 0.5s cubic-bezier(0.16, 1, 0.3, 1)' : 'titleSlideIn 0.3s ease-out' }}>
                    {currentDetection?.track_title || currentSet.title}
                  </p>
                  {(currentDetection?.track_artist || currentSet.artist) && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentDetection?.track_artist || currentSet.artist}
                    </p>
                  )}
                  {/* Concurrent tracks (w/) */}
                  {currentDetections.slice(1).map((d) => {
                    const dSong = d.song
                    const dCover = dSong?.cover_art_r2_key ? getSongCoverUrl(dSong.id) : dSong?.cover_art_url || dSong?.lastfm_album_art || null
                    return (
                      <div key={d.id} style={{ marginTop: 6, paddingLeft: 8, borderLeft: '1.5px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="relative shrink-0 rounded overflow-hidden" style={{ width: 26, height: 26, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
                          {dCover ? (
                            <img src={dCover} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.8 }} />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <svg className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.15)' }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p style={{ fontSize: 8, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.08em', color: 'hsl(var(--h3) / 0.5)', marginBottom: 1 }}>w/</p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{d.track_title}</p>
                          {d.track_artist && (
                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.track_artist}</p>
                          )}
                        </div>
                        {/* Like button for concurrent track */}
                        {dSong && (
                          <div style={{ flexShrink: 0 }}>
                            <LikeButton songId={dSong.id} size={10} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Like button for main track */}
                {song && (
                  <div style={{ flexShrink: 0, paddingTop: 8 }}>
                    <LikeButton songId={song.id} size={14} />
                  </div>
                )}
              </div>

              {/* Up Next — slides down inside the same card */}
              {upNextDetection && (
                <div style={{
                  maxHeight: showUpNext ? (upNextConcurrent.length > 0 ? 72 : 56) : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                  {/* Divider — fades in with the row */}
                  <div style={{
                    height: 1,
                    background: 'rgba(255,255,255,0.07)',
                    margin: '0 12px',
                    opacity: showUpNext ? 1 : 0,
                    transition: 'opacity 0.2s ease 0.15s',
                  }} />
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px 9px 20px',
                    animation: upNextExiting
                      ? 'upNextExit 0.28s cubic-bezier(0.4, 0, 1, 1) forwards'
                      : showUpNext
                      ? 'upNextEntry 0.55s cubic-bezier(0.34, 1.3, 0.64, 1)'
                      : undefined,
                    opacity: showUpNext && !upNextExiting ? 1 : undefined,
                  }}>
                    {/* Small connector dot */}
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    {/* Cover stack — main cover + offset thumbnail if concurrent */}
                    {(() => {
                      const upNextSong = upNextDetection.song
                      const upNextCover = upNextSong?.cover_art_r2_key ? getSongCoverUrl(upNextSong.id) : upNextSong?.cover_art_url || upNextSong?.lastfm_album_art || null
                      const secondaryCover = upNextConcurrent.length > 0 ? (() => {
                        const s = upNextConcurrent[0].song
                        return s?.cover_art_r2_key ? getSongCoverUrl(s.id) : s?.cover_art_url || s?.lastfm_album_art || null
                      })() : null
                      return (
                        <div style={{ position: 'relative', width: 26 + (upNextConcurrent.length > 0 ? 8 : 0), height: 26, flexShrink: 0 }}>
                          {/* Offset secondary cover behind */}
                          {secondaryCover && (
                            <div className="absolute rounded overflow-hidden" style={{ width: 22, height: 22, top: 2, left: 8, opacity: 0.45, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
                              <img src={secondaryCover} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {/* Primary cover on top */}
                          <div className="absolute rounded overflow-hidden" style={{ width: 26, height: 26, left: 0, top: 0, opacity: 0.7, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
                            {upNextCover ? (
                              <img src={upNextCover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <svg className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.15)' }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="min-w-0 flex-1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                        <p style={{ fontSize: 8, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)' }}>UP NEXT</p>
                        {upNextConcurrent.length > 0 && (
                          <span style={{ fontSize: 7, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.06em', color: 'hsl(var(--h3) / 0.6)', background: 'hsl(var(--h3) / 0.12)', padding: '1px 4px', borderRadius: 4 }}>
                            +{upNextConcurrent.length}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{upNextDetection.track_title}</p>
                      {upNextConcurrent.length > 0 && (
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                          w/ {upNextConcurrent.map(d => d.track_title).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowUpNext(false)}
                      style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, padding: 2 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Theater controls overlay — hover to reveal, 3s inactivity timeout */}
          {isTheaterMode && (
            <div
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                zIndex: 100,
                opacity: showControls ? 1 : 0,
                transform: showControls ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: showControls ? 'auto' : 'none',
                background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.32) 60%, transparent 100%)',
                filter: 'drop-shadow(0 -8px 40px rgba(0,0,0,0.6))',
                padding: '36px 48px 18px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Progress bar — full width with hover + storyboard */}
                <div
                  className="relative h-[5px] rounded-full cursor-pointer group"
                  style={{ background: 'rgba(255,255,255,0.15)', marginBottom: 5 }}
                  onClick={handleSeek}
                  onMouseMove={handleProgressMouseMove}
                  onMouseLeave={handleProgressMouseLeave}
                >
                  {/* Detection chapter markers */}
                  {detections.map((d) => {
                    if (duration <= 0) return null
                    const pos = (d.start_time_seconds / duration) * 100
                    return (
                      <div
                        key={d.id}
                        className="absolute top-0 h-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ left: `${pos}%`, width: 1.5, background: 'rgba(255,255,255,0.35)' }}
                      />
                    )
                  })}
                  {/* Fill */}
                  <div className="absolute top-0 left-0 h-full rounded-full pointer-events-none" style={{ width: `${progress}%`, background: 'hsl(var(--h3))', transition: 'width 0.1s linear' }} />
                  {/* Hover thumb */}
                  {hoverTime !== null && (
                    <div
                      className="absolute pointer-events-none"
                      style={{ left: `${(hoverTime / duration) * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 13, height: 13, borderRadius: '50%', background: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.4)' }}
                    />
                  )}
                  {/* Hover time line */}
                  {hoverTime !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-px pointer-events-none opacity-40"
                      style={{ left: `${(hoverTime / duration) * 100}%`, background: 'rgba(255,255,255,0.8)' }}
                    />
                  )}
                  {/* Storyboard thumbnail popup */}
                  {hoverTime !== null && thumbnailInfo && (
                    <div
                      className="absolute pointer-events-none z-20"
                      style={{
                        bottom: '100%',
                        left: Math.max(0, Math.min(hoverBarWidth - thumbnailInfo.thumbWidth, hoverX - thumbnailInfo.thumbWidth / 2)),
                        marginBottom: 12,
                      }}
                    >
                      <div className="overflow-hidden rounded-lg" style={{ width: thumbnailInfo.thumbWidth, height: thumbnailInfo.thumbHeight, boxShadow: '0 8px 25px rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: thumbnailInfo.thumbWidth, height: thumbnailInfo.thumbHeight, backgroundImage: `url(${thumbnailInfo.spriteUrl})`, backgroundPosition: `-${thumbnailInfo.bgPositionX}px -${thumbnailInfo.bgPositionY}px`, backgroundSize: storyboard ? `${storyboard.storyboardWidth * thumbnailInfo.thumbWidth}px ${storyboard.storyboardHeight * thumbnailInfo.thumbHeight}px` : undefined, backgroundRepeat: 'no-repeat' }} />
                      </div>
                      <p className="mt-1 text-center text-[10px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatTime(hoverTime)}</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255,255,255,0.45)' }}>{formatTime(currentTime)}</span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255,255,255,0.45)' }}>{formatTime(duration)}</span>
                </div>

                {/* Transport row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Left: volume */}
                  <div style={{ flex: '0 0 200px' }}>
                    <VolumeSlider volume={volume} isMuted={isMuted} onVolumeChange={setVolume} onToggleMute={toggleMute} variant="fullscreen" />
                  </div>

                  {/* Center: prev / play / next */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                    <button onClick={playPrevious} style={{ color: 'rgba(255,255,255,0.55)', transition: 'color 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                    </button>
                    <button onClick={togglePlay} className="hover:scale-105 active:scale-95 transition-all" style={{ width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--h3))', boxShadow: '0 4px 20px hsl(var(--h4) / 0.45)' }}>
                      {isPlaying
                        ? <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        : <svg className="w-5 h-5 text-white" style={{ marginLeft: 2 }} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                    </button>
                    <button onClick={playNext} style={{ color: 'rgba(255,255,255,0.55)', transition: 'color 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                    </button>
                  </div>

                  {/* Right: balance spacer */}
                  <div style={{ flex: '0 0 200px' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls — hidden in theater mode (theater overlay handles it) */}
        <div
          className="shrink-0 px-6 pb-5 pt-3"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
            display: isTheaterMode ? 'none' : undefined,
          }}
        >
          <div className="max-w-2xl mx-auto">

            {/* Track info row — slides in during video mode, crossfades cover + title on track change */}
            <div
              className="flex items-center gap-3 mb-3"
              style={{
                opacity: isVideoMode ? 1 : 0,
                maxHeight: isVideoMode ? 60 : 0,
                overflow: 'hidden',
                transform: isVideoMode ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Mini cover — crossfade on track change */}
              <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
                {songCover ? (
                  <img
                    key={songCover}
                    src={songCover}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ animation: 'coverFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Title + artist — crossfade on track change */}
              <div key={currentDetection?.id || 'set'} className="flex-1 min-w-0" style={{ animation: 'titleSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {currentDetection?.track_title || currentSet.title}
                </p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {currentDetection?.track_artist || currentSet.artist}
                </p>
              </div>

              {/* Service links */}
              {serviceLinks.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0" style={{ animation: 'fade-in 0.3s ease-out' }}>
                  {serviceLinks.slice(0, 4).map(({ url, service }) => (
                    <ServiceIconLink key={service.key} url={url} service={service} size={14} />
                  ))}
                </div>
              )}
            </div>

            {/* Progress bar with hover + storyboard */}
            <div
              className="relative h-[5px] rounded-full cursor-pointer group"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onClick={handleSeek}
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={handleProgressMouseLeave}
            >
              {/* Detection chapter markers */}
              {detections.map((d) => {
                if (duration <= 0) return null
                const pos = (d.start_time_seconds / duration) * 100
                return (
                  <div
                    key={d.id}
                    className="absolute top-0 h-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `${pos}%`, width: 1.5, background: 'rgba(255,255,255,0.35)' }}
                  />
                )
              })}
              {/* Fill */}
              <div className="absolute top-0 left-0 h-full rounded-full pointer-events-none" style={{ width: `${progress}%`, background: 'hsl(var(--h3))', transition: 'width 0.1s linear' }} />
              {/* Hover thumb */}
              {hoverTime !== null && (
                <div
                  className="absolute pointer-events-none"
                  style={{ left: `${(hoverTime / duration) * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 13, height: 13, borderRadius: '50%', background: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.4)' }}
                />
              )}
              {/* Hover time line */}
              {hoverTime !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px pointer-events-none opacity-40"
                  style={{ left: `${(hoverTime / duration) * 100}%`, background: 'rgba(255,255,255,0.8)' }}
                />
              )}
              {/* Storyboard thumbnail popup */}
              {hoverTime !== null && thumbnailInfo && (
                <div
                  className="absolute pointer-events-none z-20"
                  style={{
                    bottom: '100%',
                    left: Math.max(0, Math.min(hoverBarWidth - thumbnailInfo.thumbWidth, hoverX - thumbnailInfo.thumbWidth / 2)),
                    marginBottom: 12,
                  }}
                >
                  <div className="overflow-hidden rounded-lg" style={{ width: thumbnailInfo.thumbWidth, height: thumbnailInfo.thumbHeight, boxShadow: '0 8px 25px rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ width: thumbnailInfo.thumbWidth, height: thumbnailInfo.thumbHeight, backgroundImage: `url(${thumbnailInfo.spriteUrl})`, backgroundPosition: `-${thumbnailInfo.bgPositionX}px -${thumbnailInfo.bgPositionY}px`, backgroundSize: storyboard ? `${storyboard.storyboardWidth * thumbnailInfo.thumbWidth}px ${storyboard.storyboardHeight * thumbnailInfo.thumbHeight}px` : undefined, backgroundRepeat: 'no-repeat' }} />
                  </div>
                  <p className="mt-1 text-center text-[10px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatTime(hoverTime)}</p>
                </div>
              )}
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
        @keyframes coverFadeIn {
          from { opacity: 0; transform: scale(0.9); filter: blur(8px); }
          to   { opacity: 1; transform: scale(1);   filter: blur(0); }
        }
        @keyframes titleSlideIn {
          from { opacity: 0; transform: translateX(-6px); filter: blur(2px); }
          to   { opacity: 1; transform: translateX(0);    filter: blur(0); }
        }
        @keyframes theaterExpand {
          0%   { transform: scale(0.92); opacity: 0; filter: blur(14px); border-radius: 16px; }
          65%  { transform: scale(1.006); opacity: 1; filter: blur(0); border-radius: 2px; }
          100% { transform: scale(1); opacity: 1; filter: blur(0); border-radius: 0; }
        }
        @keyframes theaterFadeIn {
          from { opacity: 0; transform: scale(0.92) translateX(12px); filter: blur(8px); }
          to   { opacity: 1; transform: scale(1)    translateX(0);     filter: blur(0); }
        }
        @keyframes nowPlayingFlash {
          0%   { background: rgba(0,0,0,0.6); transform: scale(1); }
          20%  { background: hsl(var(--h3) / 0.25); transform: scale(1.026); }
          100% { background: rgba(0,0,0,0.6); transform: scale(1); }
        }
        @keyframes nowPlayingTextPop {
          0%   { opacity: 0; transform: translateY(6px); filter: blur(3px); color: hsl(var(--h3)); }
          55%  { opacity: 1; transform: translateY(-1px); filter: blur(0); color: hsl(var(--h3)); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); color: rgba(255,255,255,0.92); }
        }
        @keyframes coverPromote {
          0%   { transform: scale(1);    filter: brightness(1) saturate(1); }
          22%  { transform: scale(1.14); filter: brightness(1.28) saturate(1.2); }
          100% { transform: scale(1);    filter: brightness(1) saturate(1); }
        }
        @keyframes labelFlash {
          0%   { color: hsl(var(--h3) / 0.7); letter-spacing: 0.1em; }
          30%  { color: hsl(var(--h3));        letter-spacing: 0.14em; }
          100% { color: hsl(var(--h3) / 0.7); letter-spacing: 0.1em; }
        }
        @keyframes upNextEntry {
          from { opacity: 0; transform: translateY(10px) scale(0.95); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0); }
        }
        @keyframes upNextExit {
          from { opacity: 1; transform: translateY(0)     scale(1);   filter: blur(0); }
          to   { opacity: 0; transform: translateY(-10px) scale(0.9); filter: blur(3px); }
        }
        @keyframes eq-bar-1 {
          0%, 100% { height: 4px; } 50% { height: 10px; }
        }
        @keyframes eq-bar-2 {
          0%, 100% { height: 8px; } 50% { height: 3px; }
        }
        @keyframes eq-bar-3 {
          0%, 100% { height: 6px; } 50% { height: 10px; }
        }
      `}</style>
    </div>
  )
}
