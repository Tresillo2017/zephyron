import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { fetchHistory } from '../lib/api'
import { usePlayerStore } from '../stores/playerStore'
import { HistoryListSkeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { formatTime, formatDuration, formatRelativeTime } from '../lib/formatTime'
import type { ListenHistoryItem } from '../lib/types'

export function HistoryPage() {
  const [history, setHistory] = useState<ListenHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const play = usePlayerStore((s) => s.play)
  const seek = usePlayerStore((s) => s.seek)

  useEffect(() => {
    fetchHistory()
      .then((res) => setHistory(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleResume = (item: ListenHistoryItem) => {
    if (item.title && item.duration_seconds) {
      play({
        id: item.set_id,
        title: item.title,
        artist: item.artist || 'Unknown',
        duration_seconds: item.duration_seconds,
        genre: item.genre || null,
        r2_key: `sets/${item.set_id}/audio.mp3`,
      } as any)
      // Seek to last position after a brief delay for audio to load
      if (item.last_position_seconds > 0) {
        setTimeout(() => seek(item.last_position_seconds), 200)
      }
    }
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Listening History</h1>

      {isLoading ? (
        <HistoryListSkeleton count={5} />
      ) : history.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-text-muted/30 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
          </svg>
          <p className="text-text-muted text-sm">No listening history yet.</p>
          <Link to="/app/browse" className="text-accent text-sm mt-2 inline-block no-underline hover:underline">
            Start listening
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {history.map((item, index) => {
            const progressPct = item.duration_seconds
              ? Math.min(100, (item.last_position_seconds / item.duration_seconds) * 100)
              : 0

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                {/* Resume button */}
                <button
                  onClick={() => handleResume(item)}
                  className="w-10 h-10 bg-surface-overlay rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-colors flex-shrink-0"
                  title={`Resume at ${formatTime(item.last_position_seconds)}`}
                >
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>

                {/* Info */}
                <Link to={`/app/sets/${item.set_id}`} className="flex-1 min-w-0 no-underline">
                  <p className="text-sm text-text-primary truncate hover:underline">
                    {item.title || 'Untitled'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-text-secondary truncate">{item.artist || 'Unknown'}</p>
                    {item.genre && <Badge variant="muted">{item.genre}</Badge>}
                  </div>
                  {/* Progress bar */}
                  {item.duration_seconds && item.last_position_seconds > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-text-muted">
                        {formatTime(item.last_position_seconds)} / {formatDuration(item.duration_seconds)}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Meta */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs text-text-muted">
                    {formatRelativeTime(item.last_listened_at)}
                  </span>
                  {item.listen_count > 1 && (
                    <span className="text-[10px] text-text-muted mt-0.5">
                      {item.listen_count}x played
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
