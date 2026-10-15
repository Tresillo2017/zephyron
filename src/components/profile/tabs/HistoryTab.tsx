import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Badge, Card } from '../../bleh'
import { HistoryListSkeleton } from '../../ui/Skeleton'
import { fetchHistory } from '../../../lib/api'
import { formatDuration, formatRelativeTime, formatTime } from '../../../lib/formatTime'
import { usePlayerStore } from '../../../stores/playerStore'
import type { ListenHistoryItem } from '../../../lib/types'

export function HistoryTab() {
  const [history, setHistory] = useState<ListenHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const play = usePlayerStore((s) => s.play)
  const seek = usePlayerStore((s) => s.seek)

  useEffect(() => {
    setLoading(true)
    fetchHistory()
      .then((res) => setHistory(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
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
      } as Parameters<typeof play>[0])
      if (item.last_position_seconds > 0) {
        setTimeout(() => seek(item.last_position_seconds), 200)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Listening history</h2>

      {loading ? (
        <HistoryListSkeleton count={5} />
      ) : history.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted">No listening history yet.</p>
          <Link to="/app/browse" className="text-sm no-underline hover:underline" style={{ color: 'oklch(var(--h3))' }}>
            Start listening
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((item) => {
            const progressPct = item.duration_seconds
              ? Math.min(100, (item.last_position_seconds / item.duration_seconds) * 100)
              : 0

            return (
              <div key={item.id} className="group flex items-center gap-4 rounded-card bg-surface p-3 transition-colors hover:bg-[oklch(var(--b4)/0.3)]">
                <button
                  type="button"
                  onClick={() => handleResume(item)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105"
                  style={{ background: 'oklch(var(--h3) / 0.15)', color: 'oklch(var(--h3))' }}
                  title={`Resume at ${formatTime(item.last_position_seconds)}`}
                  aria-label={`Resume ${item.title || 'set'} at ${formatTime(item.last_position_seconds)}`}
                >
                  <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>

                <Link to={`/app/sets/${item.set_id}`} className="min-w-0 flex-1 no-underline">
                  <p className="truncate text-sm font-medium hover:underline" style={{ color: 'oklch(var(--c1))' }}>
                    {item.title || 'Untitled'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="truncate text-xs" style={{ color: 'oklch(var(--c2))' }}>{item.artist || 'Unknown'}</p>
                    {item.genre && <Badge>{item.genre}</Badge>}
                  </div>
                  {item.duration_seconds && item.last_position_seconds > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'oklch(var(--b4))' }}>
                        <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'oklch(var(--h3))' }} />
                      </div>
                      <span className="text-[10px]" style={{ color: 'oklch(var(--c3))' }}>
                        {formatTime(item.last_position_seconds)} / {formatDuration(item.duration_seconds)}
                      </span>
                    </div>
                  )}
                </Link>

                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-xs" style={{ color: 'oklch(var(--c3))' }}>{formatRelativeTime(item.last_listened_at)}</span>
                  {item.listen_count > 1 && (
                    <span className="mt-0.5 text-[10px]" style={{ color: 'oklch(var(--c3))' }}>{item.listen_count}x played</span>
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
