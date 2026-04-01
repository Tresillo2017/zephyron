import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useSet } from '../hooks/useSets'
import { useListeners } from '../hooks/useListeners'
import { useWaveform } from '../hooks/useWaveform'
import { usePlayerStore } from '../stores/playerStore'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { Waveform } from '../components/player/Waveform'
import { DetectionGroup } from '../components/annotations/DetectionRow'
import { AnnotationEditor } from '../components/annotations/AnnotationEditor'
import { AddToPlaylist } from '../components/playlists/AddToPlaylist'
import { formatDuration, formatPlayCount } from '../lib/formatTime'
import { getCoverUrl, getVideoPreviewUrl, getEventCoverUrl, getEventLogoUrl } from '../lib/api'
import { DETECTION_STATUS_LABELS } from '../lib/constants'
import type { Detection } from '../lib/types'

export function SetPage() {
  const { id } = useParams<{ id: string }>()
  const { set, isLoading, error } = useSet(id)
  const play = usePlayerStore((s) => s.play)
  const currentSet = usePlayerStore((s) => s.currentSet)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const seekToDetection = usePlayerStore((s) => s.seekToDetection)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showAddTrack, setShowAddTrack] = useState(false)

  const isCurrentlyPlaying = currentSet?.id === id && isPlaying
  const isThisSetLoaded = currentSet?.id === id
  const currentTime = usePlayerStore((s) => s.currentTime)
  const listenerCount = useListeners(id, isCurrentlyPlaying)
  const { peaks: waveformPeaks } = useWaveform(id, set?.stream_type)

  const handlePlay = () => {
    if (!set) return
    if (isCurrentlyPlaying) {
      usePlayerStore.getState().pause()
    } else {
      play(set, set.detections)
    }
  }

  const handleDetectionClick = (detection: Detection) => {
    if (!set) return
    if (currentSet?.id !== set.id) {
      play(set, set.detections)
      setTimeout(() => seekToDetection(detection), 100)
    } else {
      seekToDetection(detection)
    }
  }

  if (error) {
    return <div className="flex items-center justify-center h-full"><p className="text-danger text-sm">{error}</p></div>
  }

  if (isLoading || !set) {
    return (
      <div>
        <div className="h-[280px] bg-surface-raised" />
        <div className="px-6 -mt-24 relative z-10 max-w-[1300px] mx-auto">
          <div className="flex gap-6">
            <Skeleton className="w-[180px] h-[180px] rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-16">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const artistInfo = (set as any).artist_info as {
    id: string; name: string; slug: string | null; image_url: string | null;
    bio_summary: string | null; tags: string | null; lastfm_url: string | null; listeners: number;
  } | null

  const artistTags = (() => {
    try { return JSON.parse(artistInfo?.tags || '[]') } catch { return [] }
  })() as string[]

  return (
    <div>
      {/* ═══ BANNER — bleh style, video if available ═══ */}
      <div className="relative h-[280px] overflow-hidden">
        {set.video_preview_r2_key ? (
          <video
            src={getVideoPreviewUrl(set.id)}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover object-center"
            poster={set.cover_image_r2_key ? getCoverUrl(set.id) : undefined}
          />
        ) : set.cover_image_r2_key ? (
          <img src={getCoverUrl(set.id)} alt="" className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full bg-surface-raised" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
      </div>

      {/* ═══ HEADER — overlapping banner ═══ */}
      <div className="relative -mt-[100px] z-10">
        <div className="px-6 lg:px-10">
          <div className="flex items-end gap-5 mb-6">
            {/* Cover art */}
            <div className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] rounded-[var(--card-radius)] overflow-hidden flex-shrink-0 bg-surface-overlay"
              style={{ boxShadow: 'var(--subtle-shadow)' }}>
              {set.cover_image_r2_key ? (
                <img src={getCoverUrl(set.id)} alt={set.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/15 to-surface-overlay">
                  <svg className="w-14 h-14 text-text-muted/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title on banner */}
            <div className="pb-2">
              <p className="text-sm text-text-secondary banner-text mb-1">DJ Set</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight banner-text mb-1">{set.title}</h1>
              {artistInfo ? (
                <Link to={`/app/artists/${artistInfo.slug || artistInfo.id}`} className="text-base text-text-secondary hover:text-accent transition-colors no-underline banner-text inline-flex items-center gap-1 group">
                  {set.artist}
                  <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <p className="text-base text-text-secondary banner-text">{set.artist}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-6 lg:px-10 py-4">
        <div className="flex flex-col lg:flex-row gap-5">

          {/* MAIN — tracklist */}
          <div className="flex-1 min-w-0">
            {/* Actions bar */}
            <div className="flex items-center gap-3 mb-5">
              <Button variant="primary" size="lg" onClick={handlePlay} className="shadow-lg shadow-accent/20">
                {isCurrentlyPlaying ? (
                  <><svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>Pause</>
                ) : (
                  <><svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Play Set</>
                )}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setShowPlaylistModal(true)} title="Add to playlist">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
              </Button>
              <div className="ml-auto flex items-center gap-4 text-xs font-mono text-text-muted tabular-nums">
                <span>{formatDuration(set.duration_seconds)}</span>
                {set.play_count > 0 && <span>{formatPlayCount(set.play_count)} plays</span>}
                {listenerCount > 0 && (
                  <span className="text-accent flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    {listenerCount} live
                  </span>
                )}
              </div>
            </div>

            {/* Waveform */}
            <div className="card p-4 mb-5">
              <Waveform peaks={waveformPeaks} duration={set.duration_seconds} detections={set.detections} height={56} />
            </div>

            {/* Tracklist */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid hsl(var(--b4) / 0.15)' }}>
                <div>
                  <h3 className="text-sm" style={{ fontWeight: 'var(--font-weight-medium)', color: 'hsl(var(--c1))' }}>Tracklist</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
                    {set.detections.length > 0
                      ? `${set.detections.length} tracks`
                      : DETECTION_STATUS_LABELS[set.detection_status] || set.detection_status}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAddTrack(true)}>
                  <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                  Add Track
                </Button>
              </div>

              {set.detections.length === 0 ? (
                <div className="text-center py-16 px-5">
                  <p className="text-text-muted text-sm mb-4">
                    {set.detection_status === 'pending' ? 'Awaiting detection — run from admin panel.' : 'No tracks detected yet.'}
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setShowAddTrack(true)}>Add a track manually</Button>
                </div>
              ) : (
                (() => {
                  // Group consecutive detections with the same start_time into w/ groups
                  const groups: Array<{ primary: typeof set.detections[0]; withTracks: typeof set.detections }> = []
                  for (const detection of set.detections) {
                    const lastGroup = groups[groups.length - 1]
                    // A track is a "w/" if it shares the same start time as the previous group's primary
                    // AND it's not the very first track, AND they're close together (within 2 seconds)
                    if (lastGroup && Math.abs(detection.start_time_seconds - lastGroup.primary.start_time_seconds) <= 2
                        && groups.length > 0) {
                      lastGroup.withTracks.push(detection)
                    } else {
                      groups.push({ primary: detection, withTracks: [] })
                    }
                  }

                  return groups.map((group, groupIdx) => {
                    const endTime = group.primary.end_time_seconds
                      ?? (groupIdx + 1 < groups.length
                        ? groups[groupIdx + 1].primary.start_time_seconds
                        : set.duration_seconds)
                    const isActive = isCurrentlyPlaying
                      && currentTime >= group.primary.start_time_seconds
                      && currentTime < endTime

                    return (
                      <DetectionGroup
                        key={group.primary.id}
                        primary={group.primary}
                        withTracks={group.withTracks}
                        index={groupIdx}
                        setId={set.id}
                        duration={set.duration_seconds}
                        onClickTrack={handleDetectionClick}
                        isActive={isActive}
                        isPlaying={isCurrentlyPlaying}
                      />
                    )
                  })
                })()
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:w-[300px] xl:w-[340px] shrink-0 space-y-5">
            {/* Metadata card — with event banner on top if event exists */}
            <div className="overflow-hidden rounded-[var(--card-radius)]" style={{ boxShadow: 'var(--card-border), var(--card-shadow)' }}>
              {/* Event banner section */}
              {set.event_info && (
                <Link
                  to={`/app/events/${set.event_info.slug || set.event_info.id}`}
                  className="block no-underline group relative h-[110px] overflow-hidden"
                >
                  {set.event_info.cover_image_r2_key ? (
                    <img
                      src={getEventCoverUrl(set.event_info.id)}
                      alt={set.event_info.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, hsl(var(--h3) / 0.2), hsl(var(--b4)))' }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
                    {/* Logo thumbnail */}
                    {set.event_info.logo_r2_key && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        <img src={getEventLogoUrl(set.event_info.id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono tracking-wider text-white/50 mb-0.5">EVENT</p>
                      <h3 className="text-sm font-[var(--font-weight-bold)] text-white truncate leading-snug">{set.event_info.name}</h3>
                      {set.event_info.location && (
                        <p className="text-[11px] text-white/60 truncate mt-0.5">{set.event_info.location}</p>
                      )}
                    </div>
                  </div>
                </Link>
              )}

              {/* Metadata section */}
              <div className="p-5" style={{ background: 'hsl(var(--b5))' }}>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {set.genre && <Badge variant="accent">{set.genre}</Badge>}
                  {set.subgenre && <Badge variant="muted">{set.subgenre}</Badge>}
                </div>
                {(set.venue || (set.event && !set.event_info)) && (
                  <p className="text-sm text-text-secondary mb-2">
                    {set.venue}
                    {set.venue && set.event && !set.event_info && ' · '}
                    {!set.event_info && set.event}
                  </p>
                )}
                {set.recorded_date && (
                  <p className="text-xs font-mono text-text-muted">{set.recorded_date}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="card p-5">
              <div className="flex gap-6">
                <div className="stat-block">
                  <span className="stat-value">{formatDuration(set.duration_seconds)}</span>
                  <span className="stat-label">Duration</span>
                </div>
                {set.play_count > 0 && (
                  <div className="stat-block">
                    <span className="stat-value">{formatPlayCount(set.play_count)}</span>
                    <span className="stat-label">Plays</span>
                  </div>
                )}
                {set.detections.length > 0 && (
                  <div className="stat-block">
                    <span className="stat-value">{set.detections.length}</span>
                    <span className="stat-label">Tracks</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {set.description && (
              <div className="card p-5">
                <h3 className="text-xs text-text-muted mb-3">About this set</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{set.description}</p>
              </div>
            )}

            {/* About the DJ */}
            {artistInfo && artistInfo.bio_summary && (
              <div className="card p-5">
                <h3 className="text-xs text-text-muted mb-3">About the DJ</h3>
                <Link to={`/app/artists/${artistInfo.slug || artistInfo.id}`} className="flex items-center gap-3 mb-3 no-underline group">
                  {artistInfo.image_url ? (
                    <img src={artistInfo.image_url} alt={artistInfo.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-text-muted">{artistInfo.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">{artistInfo.name}</p>
                    {artistInfo.listeners > 0 && (
                      <p className="text-[10px] font-mono text-text-muted">{formatPlayCount(artistInfo.listeners)} listeners</p>
                    )}
                  </div>
                </Link>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-3">{artistInfo.bio_summary}</p>
                {artistTags.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {artistTags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="tag">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnnotationEditor setId={set.id} duration={set.duration_seconds} initialTime={isThisSetLoaded ? currentTime : 0} isOpen={showAddTrack} onClose={() => setShowAddTrack(false)} />
      {id && <AddToPlaylist setId={id} isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} />}
    </div>
  )
}
