import { formatTime } from '../../lib/formatTime'
import { getSongCoverUrl } from '../../lib/api'
import { getAvailableServices, ServiceIconLink } from '../../lib/services'
import type { Detection } from '../../lib/types'

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface DetectionGroupProps {
  /** The main track (first in the group) */
  primary: Detection
  /** Tracks playing simultaneously ("w/" tracks) */
  withTracks: Detection[]
  index: number
  setId: string
  duration: number
  onClickTrack: (detection: Detection) => void
  isActive?: boolean
  isPlaying?: boolean
}

export interface DetectionRowProps {
  detection: Detection
  index: number
  setId: string
  duration: number
  onClick: () => void
  isActive?: boolean
  isPlaying?: boolean
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function getCoverUrl(song: Detection['song']) {
  if (!song) return null
  return song.cover_art_r2_key ? getSongCoverUrl(song.id) : song.cover_art_url || song.lastfm_album_art || null
}

// ═══════════════════════════════════════════
// Detection Group — handles w/ tracks
// ═══════════════════════════════════════════

/**
 * Renders a primary track with optional "w/" (played with) tracks nested below.
 * Groups tracks that play simultaneously into a visual unit.
 */
export function DetectionGroup({
  primary, withTracks, onClickTrack, isActive, isPlaying,
}: DetectionGroupProps) {
  const hasWithTracks = withTracks.length > 0

  const song = primary.song
  const coverUrl = getCoverUrl(song)
  const serviceLinks = song ? getAvailableServices(song as unknown as Record<string, unknown>) : []

  return (
    <>
      <div
        className="group relative transition-colors duration-150"
        style={{ background: isActive ? 'hsl(var(--h3) / 0.06)' : 'transparent' }}
      >
        {/* Active indicator bar */}
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: 'hsl(var(--h3))' }} />
        )}

        {/* ═══ PRIMARY TRACK ═══ */}
        <button
          onClick={() => onClickTrack(primary)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
        >
          {/* Timestamp / equalizer */}
          <span
            className="w-10 text-center font-mono text-[11px] tabular-nums shrink-0"
            style={{ color: isActive ? 'hsl(var(--h3))' : 'hsl(var(--c3) / 0.6)' }}
          >
            {isActive && isPlaying ? (
              <span className="flex items-center justify-center">
                <span className="flex gap-[2px] items-end h-3">
                  <span className="w-[2.5px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-1 0.8s ease-in-out infinite' }} />
                  <span className="w-[2.5px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-2 0.6s ease-in-out infinite' }} />
                  <span className="w-[2.5px] rounded-sm" style={{ background: 'hsl(var(--h3))', animation: 'eq-bar-3 0.7s ease-in-out infinite' }} />
                </span>
              </span>
            ) : (
              formatTime(primary.start_time_seconds)
            )}
          </span>

          {/* Artwork */}
          <TrackArtwork coverUrl={coverUrl} size={40} />

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] leading-tight truncate"
              style={{
                color: isActive ? 'hsl(var(--h3))' : 'hsl(var(--c1))',
                fontWeight: isActive ? 'var(--font-weight-medium)' : 'var(--font-weight-default)',
              }}
            >
              {primary.track_title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {primary.track_artist && (
                <span className="text-xs truncate" style={{ color: 'hsl(var(--c2))' }}>{primary.track_artist}</span>
              )}
              {song?.label && (
                <>
                  <span className="text-[10px]" style={{ color: 'hsl(var(--c3) / 0.4)' }}>·</span>
                  <span className="text-[10px] truncate" style={{ color: 'hsl(var(--c3))' }}>{song.label}</span>
                </>
              )}
            </div>
          </div>

          {/* Service links */}
          {serviceLinks.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {serviceLinks.slice(0, 5).map(({ url, service }) => (
                <ServiceIconLink key={service.key} url={url} service={service} size={14} />
              ))}
            </div>
          )}
        </button>

        {/* ═══ "W/" TRACKS — nested underneath ═══ */}
        {hasWithTracks && (
          <div className="ml-[52px] mr-4 mb-2">
            {withTracks.map((wt) => {
              const wtSong = wt.song
              const wtCover = getCoverUrl(wtSong)
              const wtLinks = wtSong ? getAvailableServices(wtSong as unknown as Record<string, unknown>) : []

              return (
                <button
                  key={wt.id}
                  onClick={() => onClickTrack(wt)}
                  className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-left transition-colors hover:bg-[hsl(var(--b4)/0.2)]"
                >
                  {/* w/ connector */}
                  <span
                    className="text-[9px] font-mono shrink-0 w-6 text-center"
                    style={{ color: 'hsl(var(--c3) / 0.4)' }}
                  >
                    w/
                  </span>

                  {/* Small artwork */}
                  <TrackArtwork coverUrl={wtCover} size={28} />

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] leading-tight truncate" style={{ color: 'hsl(var(--c2))' }}>
                      {wt.track_title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {wt.track_artist && (
                        <span className="text-[10px] truncate" style={{ color: 'hsl(var(--c3))' }}>{wt.track_artist}</span>
                      )}
                      {wtSong?.label && (
                        <>
                          <span className="text-[9px]" style={{ color: 'hsl(var(--c3) / 0.3)' }}>·</span>
                          <span className="text-[9px] truncate" style={{ color: 'hsl(var(--c3) / 0.6)' }}>{wtSong.label}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Service links (smaller) */}
                  {wtLinks.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {wtLinks.slice(0, 3).map(({ url, service }) => (
                        <ServiceIconLink key={service.key} url={url} service={service} size={12} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Separator */}
        <div className="mx-4" style={{ borderBottom: '1px solid hsl(var(--b4) / 0.15)' }} />
      </div>
    </>
  )
}

// ═══════════════════════════════════════════
// Standalone row (backward compat for non-grouped usage)
// ═══════════════════════════════════════════

export function DetectionRow({
  detection, index, setId, duration, onClick, isActive, isPlaying,
}: DetectionRowProps) {
  return (
    <DetectionGroup
      primary={detection}
      withTracks={[]}
      index={index}
      setId={setId}
      duration={duration}
      onClickTrack={() => onClick()}
      isActive={isActive}
      isPlaying={isPlaying}
    />
  )
}

// ═══════════════════════════════════════════
// Shared components
// ═══════════════════════════════════════════

function TrackArtwork({ coverUrl, size }: { coverUrl: string | null; size: number }) {
  if (coverUrl) {
    return (
      <div
        className="rounded-lg overflow-hidden shrink-0"
        style={{ width: size, height: size, boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.2)' }}
      >
        <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
    )
  }

  return (
    <div
      className="rounded-lg shrink-0 flex items-center justify-center"
      style={{ width: size, height: size, background: 'hsl(var(--b4) / 0.4)' }}
    >
      <svg className="w-4 h-4" style={{ color: 'hsl(var(--c3) / 0.3)' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    </div>
  )
}
