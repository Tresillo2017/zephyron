import { useState } from 'react'
import { useParams } from 'react-router'
import { useSet } from '../hooks/useSets'
import { useListeners } from '../hooks/useListeners'
import { useWaveform } from '../hooks/useWaveform'
import { usePlayerStore } from '../stores/playerStore'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { Waveform } from '../components/player/Waveform'
import { Timeline } from '../components/player/Timeline'
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
      <div className="px-6 py-16 text-center">
        <p className="text-danger text-sm">{error}</p>
      </div>
    )
  }

  if (isLoading || !set) {
    return (
      <div className="px-5 sm:px-8 py-8 sm:py-12 max-w-4xl mx-auto">
        <div className="flex gap-6 mb-10">
          <Skeleton className="w-48 h-48 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-20 w-full mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </div>
    )
  }

  return (
    <div className="px-5 sm:px-8 py-8 sm:py-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        {/* Cover */}
        <div className="w-48 h-48 bg-surface-overlay rounded-lg flex-shrink-0 overflow-hidden">
          {set.cover_image_r2_key ? (
            <img
              src={getCoverUrl(set.id)}
              alt={set.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-surface-overlay">
              <svg className="w-16 h-16 text-text-muted/30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-end">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">DJ Set</p>
          <h1 className="text-3xl font-bold text-text-primary mb-2">{set.title}</h1>
          <p className="text-lg text-text-secondary mb-3">{set.artist}</p>
          <div className="flex items-center gap-3 flex-wrap">
            {set.genre && <Badge variant="accent">{set.genre}</Badge>}
            {set.venue && <span className="text-sm text-text-muted">{set.venue}</span>}
            {set.event && <span className="text-sm text-text-muted">{set.event}</span>}
            <span className="text-sm text-text-muted">{formatDuration(set.duration_seconds)}</span>
            <span className="text-sm text-text-muted">{formatPlayCount(set.play_count)} plays</span>
            {listenerCount > 0 && (
              <span className="text-sm text-accent flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                {listenerCount} listening
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button variant="primary" size="lg" onClick={handlePlay}>
              {isCurrentlyPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setShowPlaylistModal(true)}>
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Add to Playlist
            </Button>
          </div>
        </div>
      </div>

      {/* Description */}
      {set.description && (
        <p className="text-sm text-text-secondary mb-8 leading-relaxed max-w-2xl">{set.description}</p>
      )}

      {/* Waveform */}
      {isThisSetLoaded && (
        <div className="mb-8 bg-surface-raised border border-border rounded-lg p-4">
          <Waveform
            peaks={waveformPeaks}
            duration={set.duration_seconds}
            detections={set.detections}
            height={80}
          />
        </div>
      )}

      {/* Timeline chapters (visual bar) */}
      {isThisSetLoaded && set.detections.length > 0 && (
        <div className="mb-10">
          <Timeline
            detections={set.detections}
            duration={set.duration_seconds}
          />
        </div>
      )}

      {/* Tracklist / Detections — always shown */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Tracklist</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              {DETECTION_STATUS_LABELS[set.detection_status] || set.detection_status}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddTrack(true)}
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Add Track
            </Button>
          </div>
        </div>

        {set.detections.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg">
            <p className="text-text-muted text-sm mb-3">
              {set.detection_status === 'pending'
                ? 'Track detection has not been run yet.'
                : set.detection_status === 'processing'
                ? 'AI is currently analyzing this set...'
                : 'No tracks detected in this set.'}
            </p>
            <Button variant="secondary" size="sm" onClick={() => setShowAddTrack(true)}>
              Add a track manually
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
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
      </section>

      {/* Add Track annotation editor */}
      <AnnotationEditor
        setId={set.id}
        duration={set.duration_seconds}
        initialTime={isThisSetLoaded ? currentTime : 0}
        isOpen={showAddTrack}
        onClose={() => setShowAddTrack(false)}
      />

      {/* Add to Playlist Modal */}
      {id && (
        <AddToPlaylist
          setId={id}
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </div>
  )
}
