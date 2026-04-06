import { useMemo, useState, useRef, useEffect } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { getSongCoverUrl, getCoverUrl } from '../../lib/api'
import { getAvailableServices, ServiceIcon } from '../../lib/services'
import type { Detection, Song } from '../../lib/types'
import { LikeButton } from '../ui/LikeButton'

// ═══════════════════════════════════════════
// Types + constants
// ═══════════════════════════════════════════

interface TrackGroup {
  primary: Detection
  withTracks: Detection[]
}

const CENTER_SIZE = 380
const SIDE_SIZE = 260
const FAR_SIZE = 180
const CARD_SPACING = 320  // px between card centers
const EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
const SMOOTH = 'cubic-bezier(0.16, 1, 0.3, 1)'
const DURATION = '0.7s'

function resolveCover(d: Detection | null, fallback: string | null): string | null {
  if (!d?.song) return fallback
  return d.song.cover_art_r2_key ? getSongCoverUrl(d.song.id) : d.song.cover_art_url || d.song.lastfm_album_art || fallback
}

// ═══════════════════════════════════════════
// Main CoverFlow — keyed sliding strip
// ═══════════════════════════════════════════

export function CoverFlowView() {
  const { currentSet, currentDetection, detections, isPlaying, seek } = usePlayerStore()

  const groups = useMemo<TrackGroup[]>(() => {
    const result: TrackGroup[] = []
    for (const detection of detections) {
      const last = result[result.length - 1]
      if (last && Math.abs(detection.start_time_seconds - last.primary.start_time_seconds) <= 2) {
        last.withTracks.push(detection)
      } else {
        result.push({ primary: detection, withTracks: [] })
      }
    }
    return result
  }, [detections])

  const currentGroupIndex = useMemo(() => {
    if (!currentDetection) return -1
    return groups.findIndex((g) =>
      g.primary.id === currentDetection.id ||
      g.withTracks.some((w) => w.id === currentDetection.id)
    )
  }, [currentDetection, groups])

  if (!currentSet) return null

  const fallbackCover = currentSet.cover_image_r2_key ? getCoverUrl(currentSet.id) : null
  const currentGroup = currentGroupIndex >= 0 ? groups[currentGroupIndex] : null

  return (
    <div className="flex flex-col items-center justify-center h-full w-full overflow-hidden select-none">

      {/* 3D Perspective Container */}
      <div
        className="relative flex items-center justify-center w-full"
        style={{ perspective: '1600px', height: '480px' }}
      >
        {/* Render each group as a keyed slide — persistent DOM nodes for CSS transitions */}
        {groups.map((group, idx) => {
          const offset = idx - currentGroupIndex

          // Only render within ±3 window for performance
          if (Math.abs(offset) > 3) return null

          return (
            <CoverFlowSlide
              key={group.primary.id}
              group={group}
              offset={offset}
              fallbackCover={fallbackCover}
              isPlaying={isPlaying && offset === 0}
              onSeek={seek}
            />
          )
        })}
      </div>

      {/* Track info */}
      <TrackInfo group={currentGroup} set={currentSet} groupIndex={currentGroupIndex} totalGroups={groups.length} />
    </div>
  )
}

// ═══════════════════════════════════════════
// CoverFlow Slide — a single group in the strip
// Each slide is a persistent keyed DOM node.
// When `offset` changes, CSS transitions animate the transform.
// ═══════════════════════════════════════════

function CoverFlowSlide({ group, offset, fallbackCover, isPlaying, onSeek }: {
  group: TrackGroup; offset: number; fallbackCover: string | null
  isPlaying: boolean; onSeek: (t: number) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasStack = group.withTracks.length > 0
  const primaryCover = resolveCover(group.primary, fallbackCover)
  const isCenter = offset === 0

  const [pulse, setPulse] = useState(false)
  const wasCenterRef = useRef(isCenter)
  useEffect(() => {
    if (isCenter && !wasCenterRef.current) {
      const t1 = setTimeout(() => setPulse(true), 0)
      const t2 = setTimeout(() => setPulse(false), 450)
      wasCenterRef.current = true
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    if (!isCenter) wasCenterRef.current = false
  }, [isCenter])

  useEffect(() => {
    if (!isCenter) {
      const t = setTimeout(() => setIsExpanded(false), 0)
      return () => clearTimeout(t)
    }
  }, [isCenter])

  const style = getSlideStyle(offset, pulse, isPlaying, isExpanded)
  const size = isCenter ? CENTER_SIZE : Math.abs(offset) === 1 ? SIDE_SIZE : FAR_SIZE

  const W_CARD_SIZE = 140
  const W_GAP = 12
  const totalWWidth = group.withTracks.length * W_CARD_SIZE + (group.withTracks.length - 1) * W_GAP

  return (
    <div
      className="absolute flex flex-col items-center"
      style={style}
      onClick={!isCenter ? () => onSeek(group.primary.start_time_seconds) : undefined}
      onMouseEnter={() => isCenter && hasStack && setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* w/ cards — always in DOM, animate from behind primary's bottom center to row below */}
      {isCenter && hasStack && group.withTracks.map((wt, i) => {
        const wtCover = resolveCover(wt, fallbackCover)
        const totalW = group.withTracks.length

        // Expanded position: row below, centered
        const expandedLeft = (CENTER_SIZE - totalWWidth) / 2 + i * (W_CARD_SIZE + W_GAP)
        const expandedTop = CENTER_SIZE + 16

        // Collapsed position: hidden behind the primary card's bottom center
        const collapsedLeft = (CENTER_SIZE - W_CARD_SIZE) / 2
        const collapsedTop = CENTER_SIZE - W_CARD_SIZE * 0.5 // peeking from behind bottom edge

        return (
          <div
            key={wt.id}
            className="absolute"
            style={{
              width: W_CARD_SIZE,
              height: W_CARD_SIZE,
              borderRadius: 12,
              overflow: 'hidden',
              top: isExpanded ? expandedTop : collapsedTop,
              left: isExpanded ? expandedLeft : collapsedLeft,
              transform: isExpanded
                ? 'scale(1) translateY(0)'
                : `scale(0.6) translateY(0)`,
              opacity: isExpanded ? 1 : 0,
              zIndex: isExpanded ? 15 : -1,
              transition: isExpanded
                ? `top 0.5s ${SMOOTH} ${i * 50}ms, left 0.5s ${SMOOTH} ${i * 50}ms, transform 0.5s ${SMOOTH} ${i * 50}ms, opacity 0.35s ${EASE} ${i * 50}ms`
                : `top 0.35s ${EASE} ${(totalW - 1 - i) * 30}ms, left 0.35s ${EASE} ${(totalW - 1 - i) * 30}ms, transform 0.35s ${EASE} ${(totalW - 1 - i) * 30}ms, opacity 0.2s ${EASE} ${(totalW - 1 - i) * 30}ms`,
              boxShadow: isExpanded ? '0 8px 30px rgba(0,0,0,0.5)' : 'none',
              cursor: isExpanded ? 'pointer' : 'default',
              pointerEvents: isExpanded ? 'auto' : 'none',
            }}
            onClick={isExpanded ? (e) => { e.stopPropagation(); onSeek(wt.start_time_seconds) } : undefined}
          >
            <Artwork src={wtCover} size={W_CARD_SIZE} />

            {/* Glass label at bottom — Zephyron design system */}
            <div
              className="absolute inset-x-0 bottom-0 px-2.5 py-2"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                opacity: isExpanded ? 1 : 0,
                transform: isExpanded ? 'translateY(0)' : 'translateY(100%)',
                transition: isExpanded
                  ? `all 0.35s ${EASE} ${(i + 1) * 60 + 200}ms`
                  : `all 0.2s ${EASE}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="text-[7px] font-mono px-1 py-px rounded shrink-0"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  w/
                </span>
                <p className="text-[11px] truncate leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>{wt.track_title}</p>
              </div>
              <p className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{wt.track_artist}</p>
            </div>
          </div>
        )
      })}

      {/* Primary artwork card */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: isCenter ? 16 : 12,
          overflow: 'hidden',
          boxShadow: isCenter
            ? `0 24px 70px rgba(0,0,0,0.55)${isPlaying && !isExpanded ? ', 0 0 50px rgba(255,255,255,0.06)' : ''}`
            : '0 10px 40px rgba(0,0,0,0.4)',
          transition: `all 0.5s ${SMOOTH}`,
          transform: `scale(${pulse ? 1.03 : 1})`,
          position: 'relative',
          zIndex: 5,
        }}
      >
        <Artwork src={primaryCover} size={size} />
      </div>

      {/* Stack badge */}
      {isCenter && hasStack && (
        <div
          className="absolute rounded-full text-[10px] font-mono flex items-center gap-1.5"
          style={{
            bottom: 12,
            right: 12,
            padding: '4px 10px',
            background: 'rgba(0,0,0,0.55)',
            color: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
            opacity: isExpanded ? 0 : 1,
            transform: isExpanded ? 'scale(0.6) translateY(5px)' : 'scale(1) translateY(0)',
            transition: `all 0.35s ${SMOOTH}`,
            zIndex: 6,
            pointerEvents: 'none',
          }}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
          {group.withTracks.length + 1}
        </div>
      )}

      {/* Reflection */}
      {isCenter && primaryCover && (
        <div
          className="pointer-events-none"
          style={{
            width: CENTER_SIZE,
            height: CENTER_SIZE * 0.2,
            overflow: 'hidden',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.08), transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.08), transparent)',
            borderRadius: '0 0 16px 16px',
            opacity: isExpanded ? 0 : 1,
            transition: `opacity 0.4s ${EASE}`,
          }}
        >
          <img src={primaryCover} alt="" className="w-full object-cover" style={{ transform: 'scaleY(-1)', height: CENTER_SIZE }} />
        </div>
      )}
    </div>
  )
}

/**
 * Compute the 3D transform style for a slide at a given offset from center.
 * Uses pixel-based translateX for true left-to-right sliding like Apple CoverFlow.
 * offset 0 = center, -1 = left, +1 = right, etc.
 */
function getSlideStyle(offset: number, pulse: boolean, _isPlaying: boolean, isExpanded: boolean): React.CSSProperties {
  const abs = Math.abs(offset)
  const sign = offset < 0 ? -1 : 1

  // Base horizontal position in pixels from center
  const baseX = offset * CARD_SPACING

  if (abs === 0) {
    return {
      transform: `translateX(${baseX}px) translateZ(0) rotateY(0) scale(${pulse ? 1.03 : isExpanded ? 1 : 1})`,
      opacity: 1,
      zIndex: 10,
      filter: 'brightness(1)',
      transition: `all ${DURATION} ${SMOOTH}`,
      transformStyle: 'preserve-3d' as const,
      cursor: 'default',
    }
  }

  if (abs === 1) {
    return {
      transform: `translateX(${baseX}px) translateZ(-100px) rotateY(${-sign * 38}deg)`,
      opacity: 0.85,
      zIndex: 5,
      filter: 'brightness(0.55)',
      transition: `all ${DURATION} ${SMOOTH}`,
      transformStyle: 'preserve-3d' as const,
      cursor: 'pointer',
      pointerEvents: 'auto' as const,
    }
  }

  if (abs === 2) {
    return {
      transform: `translateX(${baseX * 0.85}px) translateZ(-220px) rotateY(${-sign * 50}deg)`,
      opacity: 0.35,
      zIndex: 1,
      filter: 'brightness(0.35)',
      transition: `all ${DURATION} ${SMOOTH}`,
      transformStyle: 'preserve-3d' as const,
      cursor: 'pointer',
      pointerEvents: 'auto' as const,
    }
  }

  // Beyond ±2 — offscreen, ready to slide in
  return {
    transform: `translateX(${sign * CARD_SPACING * 3}px) translateZ(-300px) rotateY(${-sign * 55}deg)`,
    opacity: 0,
    zIndex: 0,
    filter: 'brightness(0.2)',
    transition: `all ${DURATION} ${SMOOTH}`,
    transformStyle: 'preserve-3d' as const,
    pointerEvents: 'none' as const,
  }
}

// ═══════════════════════════════════════════
// Artwork
// ═══════════════════════════════════════════

function Artwork({ src, size }: { src: string | null; size: number }) {
  return src ? (
    <img src={src} alt="" className="object-cover" style={{ width: size, height: size, display: 'block' }} loading="lazy" />
  ) : (
    <div className="flex items-center justify-center" style={{ width: size, height: size, background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' }}>
      <svg className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.12)' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    </div>
  )
}

// ═══════════════════════════════════════════
// Track info + service links
// ═══════════════════════════════════════════

function TrackInfo({ group, set, groupIndex, totalGroups }: {
  group: TrackGroup | null; set: { title: string; artist: string }; groupIndex: number; totalGroups: number
}) {
  return (
    <div className="mt-8 text-center max-w-lg px-4">
      {group ? (
        <>
          <h2 className="text-xl sm:text-2xl truncate" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 'var(--font-weight-bold)' }}>
            {group.primary.track_title}
          </h2>
          <p className="text-base mt-1 truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {group.primary.track_artist || set.artist}
          </p>
          {group.primary.song?.label && (
            <p className="text-xs font-mono mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              [{group.primary.song.label}]
              {group.primary.song.album && ` · ${group.primary.song.album}`}
            </p>
          )}
        </>
      ) : (
        <>
          <h2 className="text-xl sm:text-2xl truncate" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 'var(--font-weight-bold)' }}>
            {set.title}
          </h2>
          <p className="text-base mt-1 truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {set.artist}
          </p>
        </>
      )}

      {group?.primary.song && (
        <>
          <div className="flex items-center justify-center gap-2 mt-3">
            <LikeButton songId={group.primary.song.id} size={16} showCount />
          </div>
          <SongLinks song={group.primary.song} />
        </>
      )}

      {totalGroups > 0 && groupIndex >= 0 && (
        <p className="text-[10px] font-mono mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
          TRACK {groupIndex + 1} OF {totalGroups}
        </p>
      )}
    </div>
  )
}

function SongLinks({ song }: { song: Song }) {
  const links = getAvailableServices(song as unknown as Record<string, unknown>)
  if (links.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
      {links.map(({ url, service }) => (
        <a
          key={service.key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-[var(--button-radius)] text-[11px] font-medium transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'rgba(255, 255, 255, 0.7)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${service.color}20`
            e.currentTarget.style.color = service.color
            e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${service.color}30, 0 2px 8px ${service.color}20`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
            e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)'
          }}
        >
          <ServiceIcon service={service} size={13} />
          {service.label}
        </a>
      ))}
    </div>
  )
}
