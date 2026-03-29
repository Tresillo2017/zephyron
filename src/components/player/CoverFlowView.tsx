import { useRef, useMemo } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { getSongCoverUrl, getCoverUrl } from '../../lib/api'
import { getAvailableServices, ServiceIcon } from '../../lib/services'
import type { Detection, Song } from '../../lib/types'

/**
 * CoverFlow view — 3D perspective display of the current track with album art.
 * Previous and next tracks are visible on the sides at an angle (like iTunes CoverFlow).
 * Transitions between songs as the set progresses.
 */
export function CoverFlowView() {
  const {
    currentSet, currentDetection, detections,
    isPlaying, seek,
  } = usePlayerStore()

  const containerRef = useRef<HTMLDivElement>(null)

  // Find current index and adjacent detections
  const currentIndex = useMemo(() => {
    if (!currentDetection) return -1
    return detections.findIndex((d) => d.id === currentDetection.id)
  }, [currentDetection?.id, detections])

  const prevDetection = currentIndex > 0 ? detections[currentIndex - 1] : null
  const nextDetection = currentIndex >= 0 && currentIndex < detections.length - 1
    ? detections[currentIndex + 1]
    : null

  if (!currentSet) return null

  // Fallback cover art from the set
  const setFallbackCover = currentSet.cover_image_r2_key ? getCoverUrl(currentSet.id) : null

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center h-full w-full overflow-hidden select-none">

      {/* 3D Perspective Container */}
      <div className="relative flex items-center justify-center w-full" style={{ perspective: '1200px', height: '360px' }}>

        {/* Previous track (left, angled) */}
        <CoverFlowCard
          detection={prevDetection}
          setFallbackCover={setFallbackCover}
          position="prev"
          onClick={() => prevDetection && seek(prevDetection.start_time_seconds)}
        />

        {/* Current track (center, full) */}
        <CoverFlowCard
          detection={currentDetection}
          setFallbackCover={setFallbackCover}
          position="current"
          isPlaying={isPlaying}
        />

        {/* Next track (right, angled) */}
        <CoverFlowCard
          detection={nextDetection}
          setFallbackCover={setFallbackCover}
          position="next"
          onClick={() => nextDetection && seek(nextDetection.start_time_seconds)}
        />
      </div>

      {/* Track info below the coverflow */}
      <div className="mt-6 text-center max-w-lg px-4">
        {currentDetection ? (
          <>
            <h2 className="text-xl sm:text-2xl truncate" style={{ color: 'hsl(var(--c1))', fontWeight: 'var(--font-weight-bold)' }}>
              {currentDetection.track_title}
            </h2>
            <p className="text-base mt-1 truncate" style={{ color: 'hsl(var(--c2))' }}>
              {currentDetection.track_artist || currentSet.artist}
            </p>
            {currentDetection.song?.label && (
              <p className="text-xs font-mono mt-1.5" style={{ color: 'hsl(var(--h3) / 0.7)' }}>
                [{currentDetection.song.label}]
                {currentDetection.song.album && ` · ${currentDetection.song.album}`}
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl truncate" style={{ color: 'hsl(var(--c1))', fontWeight: 'var(--font-weight-bold)' }}>
              {currentSet.title}
            </h2>
            <p className="text-base mt-1 truncate" style={{ color: 'hsl(var(--c2))' }}>
              {currentSet.artist}
            </p>
          </>
        )}

        {/* External service links */}
        {currentDetection?.song && <SongServiceLinks song={currentDetection.song} />}

        {/* Track counter */}
        {detections.length > 0 && currentIndex >= 0 && (
          <p className="text-[10px] font-mono mt-4" style={{ color: 'hsl(var(--c3))' }}>
            TRACK {currentIndex + 1} OF {detections.length}
          </p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// CoverFlow card — a single album art card with 3D transform
// ═══════════════════════════════════════════

interface CoverFlowCardProps {
  detection: Detection | null
  setFallbackCover: string | null
  position: 'prev' | 'current' | 'next'
  isPlaying?: boolean
  onClick?: () => void
}

function CoverFlowCard({ detection, setFallbackCover, position, isPlaying, onClick }: CoverFlowCardProps) {
  const song = detection?.song

  // Resolve cover art URL
  const coverUrl = song?.cover_art_r2_key
    ? getSongCoverUrl(song.id)
    : song?.cover_art_url || song?.lastfm_album_art || setFallbackCover

  // 3D transform styles for each position
  const transforms: Record<string, React.CSSProperties> = {
    prev: {
      transform: 'translateX(-65%) translateZ(-150px) rotateY(45deg)',
      opacity: detection ? 0.6 : 0,
      zIndex: 1,
      filter: 'brightness(0.6)',
    },
    current: {
      transform: 'translateX(0) translateZ(0) rotateY(0)',
      opacity: 1,
      zIndex: 10,
    },
    next: {
      transform: 'translateX(65%) translateZ(-150px) rotateY(-45deg)',
      opacity: detection ? 0.6 : 0,
      zIndex: 1,
      filter: 'brightness(0.6)',
    },
  }

  const style = transforms[position]
  const size = position === 'current' ? 280 : 200

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        ...style,
        transition: 'all 0.6s cubic-bezier(0.095, 0.41, 0.055, 0.96)',
        transformStyle: 'preserve-3d',
        cursor: position !== 'current' ? 'pointer' : undefined,
        pointerEvents: detection || position === 'current' ? 'auto' : 'none',
      }}
      onClick={onClick}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--card-radius)',
          overflow: 'hidden',
          boxShadow: position === 'current'
            ? `0 20px 60px hsl(var(--b7) / 0.5), 0 0 ${isPlaying ? '30px' : '0px'} hsl(var(--h3) / ${isPlaying ? '0.15' : '0'})`
            : '0 10px 30px hsl(var(--b7) / 0.4)',
          transition: 'box-shadow 0.6s cubic-bezier(0.095, 0.41, 0.055, 0.96)',
        }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={detection?.track_title || ''}
            className="w-full h-full object-cover"
            loading={position === 'current' ? 'eager' : 'lazy'}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(var(--h3) / 0.2), hsl(var(--b4)))' }}
          >
            <svg className="w-16 h-16" style={{ color: 'hsl(var(--c3) / 0.3)' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
      </div>

      {/* Reflection effect for current card */}
      {position === 'current' && coverUrl && (
        <div
          className="absolute w-full pointer-events-none"
          style={{
            top: '100%',
            height: size * 0.4,
            width: size,
            borderRadius: '0 0 var(--card-radius) var(--card-radius)',
            overflow: 'hidden',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)',
          }}
        >
          <img
            src={coverUrl}
            alt=""
            className="w-full object-cover"
            style={{ transform: 'scaleY(-1)', height: size }}
          />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// Song service links (Spotify, Apple Music, etc.)
// ═══════════════════════════════════════════

function SongServiceLinks({ song }: { song: Song }) {
  const links = getAvailableServices(song as unknown as Record<string, unknown>)

  if (links.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
      {links.map(({ url, service }) => (
        <a
          key={service.key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:scale-105"
          style={{
            background: `${service.color}20`,
            color: service.color,
            border: `1px solid ${service.color}30`,
          }}
        >
          <ServiceIcon service={service} size={14} />
          {service.label}
        </a>
      ))}
    </div>
  )
}
