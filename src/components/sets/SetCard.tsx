import { Link } from 'react-router'
import { usePlayerStore } from '../../stores/playerStore'
import { Badge } from '../ui/Badge'
import { formatDuration, formatPlayCount } from '../../lib/formatTime'
import { getCoverUrl } from '../../lib/api'
import type { DjSet } from '../../lib/types'

interface SetCardProps {
  set: DjSet
}

export function SetCard({ set }: SetCardProps) {
  const play = usePlayerStore((s) => s.play)
  const currentSet = usePlayerStore((s) => s.currentSet)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const isCurrentlyPlaying = currentSet?.id === set.id && isPlaying

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isCurrentlyPlaying) {
      usePlayerStore.getState().pause()
    } else {
      play(set)
    }
  }

  return (
    <Link to={`/app/sets/${set.id}`} className="group flex flex-col gap-3 no-underline">
      {/* Cover art */}
      <div className={`relative aspect-square bg-surface-overlay rounded-xl overflow-hidden transition-all duration-200 ${
        isCurrentlyPlaying ? 'ring-1 ring-accent/40 shadow-lg shadow-accent/10' : 'group-hover:shadow-lg group-hover:shadow-accent/5'
      }`}
        style={{ transitionTimingFunction: 'var(--ease-out-custom)' }}
      >
        {set.cover_image_r2_key ? (
          <img
            src={getCoverUrl(set.id)}
            alt={set.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/20 to-surface-overlay">
            <svg className="w-12 h-12 text-text-muted/30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
            </svg>
          </div>
        )}

        {/* Play button overlay */}
        <button
          onClick={handlePlay}
          className={`absolute bottom-2 right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-[0_3px_12px_hsl(var(--h4)/0.35)] transition-all duration-200 cursor-pointer ${
            isCurrentlyPlaying
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          } hover:scale-105 hover:bg-accent-hover active:scale-95`}
        >
          {isCurrentlyPlaying ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary truncate leading-snug">{set.title}</p>
        <p className="text-xs text-text-secondary truncate mt-1">{set.artist}</p>
        <div className="flex items-center gap-2 mt-2">
          {set.genre && <Badge variant="muted">{set.genre}</Badge>}
          <span className="text-xs text-text-muted">{formatDuration(set.duration_seconds)}</span>
          {set.play_count > 0 && (
            <span className="text-xs text-text-muted">{formatPlayCount(set.play_count)} plays</span>
          )}
        </div>
      </div>
    </Link>
  )
}
