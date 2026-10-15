import { Link } from 'react-router'
import { PauseFilled, PlayFilled } from '@mingcute/react/core-filled'
import { usePlayerStore } from '../../stores/playerStore'
import { Badge } from '../bleh'
import { formatDuration, formatPlayCount } from '../../lib/formatTime'
import { getCoverUrl } from '../../lib/api'
import { getPlaceholder } from '../../lib/placeholders'
import type { DjSet } from '../../lib/types'
import './sets.css'

interface SetCardProps {
  set: DjSet
}

export function SetCard({ set }: SetCardProps) {
  const play = usePlayerStore((s) => s.play)
  const currentSet = usePlayerStore((s) => s.currentSet)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const isCurrentlyPlaying = currentSet?.id === set.id && isPlaying

  const handlePlay = () => {
    if (isCurrentlyPlaying) {
      usePlayerStore.getState().pause()
    } else {
      play(set)
    }
  }

  const cover = set.cover_image_r2_key ? getCoverUrl(set.id) : getPlaceholder('square')

  return (
    <article className="zl-set" data-playing={isCurrentlyPlaying ? '' : undefined}>
      <div className="zl-set-art">
        <img src={cover} alt="" className="zl-set-img" loading="lazy" />
        <button
          type="button"
          className="zl-set-play"
          onClick={handlePlay}
          aria-label={`${isCurrentlyPlaying ? 'Pause' : 'Play'} ${set.title}`}
        >
          {isCurrentlyPlaying ? <PauseFilled size={18} /> : <PlayFilled size={18} />}
        </button>
      </div>
      <div className="zl-set-info">
        <Link to={`/app/sets/${set.id}`} className="zl-set-title">{set.title}</Link>
        <p className="zl-set-artist">{set.artist}</p>
        {set.event && <p className="zl-set-event">{set.event}</p>}
        <div className="zl-set-meta">
          {set.genre && <Badge>{set.genre}</Badge>}
          <span>{formatDuration(set.duration_seconds)}</span>
          {set.play_count > 0 && <span>{formatPlayCount(set.play_count)} plays</span>}
        </div>
      </div>
    </article>
  )
}
