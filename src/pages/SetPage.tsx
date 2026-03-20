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
import { DetectionRow } from '../components/annotations/DetectionRow'
import { AnnotationEditor } from '../components/annotations/AnnotationEditor'
import { AddToPlaylist } from '../components/playlists/AddToPlaylist'
import { formatDuration, formatPlayCount } from '../lib/formatTime'
import { getCoverUrl } from '../lib/api'
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
  const { peaks: waveformPeaks } = useWaveform(id)

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
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-danger text-sm">{error}</p>
      </div>
    )
  }

  if (isLoading || !set) {
    return (
      <div>
        <div className="h-[280px] bg-surface-raised" />
        <div className="px-5 sm:px-8 -mt-24 relative z-10">
          <div className="flex gap-6">
            <Skeleton className="w-44 h-44 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-8">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
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
      {/* ═══ HERO BANNER — cinematic YouTube thumbnail background ═══ */}
      <div className="relative h-[300px] sm:h-[360px] overflow-hidden">
        {set.cover_image_r2_key ? (
          <>
            <img src={getCoverUrl(set.id)} alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-surface/50 via-surface/70 to-surface" />
          </>
        ) : (
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />
          </div>
        )}
      </div>

      {/* ═══ CONTENT — overlapping into the hero ═══ */}
      <div className="px-5 sm:px-8 -mt-28 sm:-mt-32 relative z-10">

        {/* Header: cover + info side by side */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          {/* Cover art */}
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-lg overflow-hidden flex-shrink-0 bg-surface-overlay shadow-2xl border border-border/50">
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

          {/* Info */}
          <div className="flex flex-col justify-end">
            <p className="text-[10px] font-mono text-accent tracking-wider mb-2">DJ SET</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-2">{set.title}</h1>
            {artistInfo ? (
              <Link
                to={`/app/artists/${artistInfo.slug || artistInfo.id}`}
                className="text-lg text-text-secondary hover:text-accent transition-colors no-underline inline-flex items-center gap-1.5 group mb-3"
              >
                {set.artist}
                <svg className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <p className="text-lg text-text-secondary mb-3">{set.artist}</p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {set.genre && <Badge variant="accent">{set.genre}</Badge>}
              {set.subgenre && <Badge variant="muted">{set.subgenre}</Badge>}
              {set.venue && <span className="text-sm text-text-secondary">{set.venue}</span>}
              {set.event && <span className="text-sm text-text-muted">· {set.event}</span>}
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-text-muted tabular-nums">
              <span>{formatDuration(set.duration_seconds)}</span>
              {set.play_count > 0 && <span>{formatPlayCount(set.play_count)} plays</span>}
              {set.recorded_date && <span>{set.recorded_date}</span>}
              {listenerCount > 0 && (
                <span className="text-accent flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                  {listenerCount} live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions + Waveform row */}
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
          <div className="flex items-center gap-2 shrink-0">
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
          </div>
          <div className="flex-1 min-w-0 w-full bg-surface-raised/50 border border-border rounded-xl p-3">
            <Waveform peaks={waveformPeaks} duration={set.duration_seconds} detections={set.detections} height={48} />
          </div>
        </div>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-border via-border-light to-border mb-8" />

        {/* ═══ TWO COLUMN: description/DJ info + tracklist ═══ */}
        <div className="flex flex-col lg:flex-row gap-8 pb-12">

          {/* LEFT: description + about DJ */}
          <div className="lg:w-[320px] xl:w-[360px] shrink-0 space-y-6">
            {/* Description */}
            {set.description && (
              <div>
                <p className="text-[10px] font-mono text-text-muted tracking-wider mb-3">ABOUT THIS SET</p>
                <p className="text-sm text-text-secondary leading-relaxed">{set.description}</p>
              </div>
            )}

            {/* About the DJ */}
            {artistInfo && artistInfo.bio_summary && (
              <div>
                <p className="text-[10px] font-mono text-text-muted tracking-wider mb-3">ABOUT THE DJ</p>
                <Link
                  to={`/app/artists/${artistInfo.slug || artistInfo.id}`}
                  className="flex items-center gap-3 mb-3 no-underline group"
                >
                  {artistInfo.image_url ? (
                    <img src={artistInfo.image_url} alt={artistInfo.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-surface-overlay flex items-center justify-center flex-shrink-0">
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
                <p className="text-xs text-text-muted leading-relaxed line-clamp-4">{artistInfo.bio_summary}</p>
                {artistTags.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {artistTags.slice(0, 5).map((tag) => (
                      <span key={tag} className="text-[10px] text-text-muted bg-surface-overlay px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No description and no artist info — show nothing, the right column fills the space */}
          </div>

          {/* RIGHT: tracklist */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-mono text-text-muted tracking-wider mb-1">TRACKLIST</p>
                <p className="text-sm text-text-secondary">
                  {set.detections.length > 0
                    ? `${set.detections.length} tracks detected`
                    : DETECTION_STATUS_LABELS[set.detection_status] || set.detection_status}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAddTrack(true)}>
                <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                Add Track
              </Button>
            </div>

            {set.detections.length === 0 ? (
              <div className="text-center py-20 border border-border rounded-xl bg-surface-raised/30">
                <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-surface-overlay border border-border flex items-center justify-center">
                  <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                </div>
                <p className="text-text-primary text-sm font-medium mb-1">
                  {set.detection_status === 'pending' ? 'Awaiting detection' : set.detection_status === 'processing' ? 'Analyzing tracks...' : 'No tracks detected'}
                </p>
                <p className="text-text-muted text-xs mb-5 max-w-xs mx-auto">
                  {set.detection_status === 'pending'
                    ? 'Run AI detection from the admin panel to identify tracks.'
                    : 'Add tracks manually or wait for community contributions.'}
                </p>
                <Button variant="secondary" size="sm" onClick={() => setShowAddTrack(true)}>
                  Add a track manually
                </Button>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                {set.detections.map((detection, index) => {
                  const endTime = detection.end_time_seconds
                    ?? (index + 1 < set.detections.length
                      ? set.detections[index + 1].start_time_seconds
                      : set.duration_seconds)
                  const isActive = isThisSetLoaded &&
                    currentTime >= detection.start_time_seconds &&
                    currentTime < endTime

                  return (
                    <DetectionRow
                      key={detection.id}
                      detection={detection}
                      index={index}
                      setId={set.id}
                      duration={set.duration_seconds}
                      onClick={() => handleDetectionClick(detection)}
                      isActive={isActive}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnnotationEditor
        setId={set.id}
        duration={set.duration_seconds}
        initialTime={isThisSetLoaded ? currentTime : 0}
        isOpen={showAddTrack}
        onClose={() => setShowAddTrack(false)}
      />
      {id && (
        <AddToPlaylist setId={id} isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} />
      )}
    </div>
  )
}
