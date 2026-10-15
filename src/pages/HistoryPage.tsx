import { useState, useEffect, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { HistoryFilled, PlayFilled } from '@mingcute/react/core-filled'
import { fetchHistory } from '../lib/api'
import { usePlayerStore } from '../stores/playerStore'
import { Badge, Button, ContentCard, EmptyState, Section, Skeleton, Toolbar } from '../components/bleh'
import { PageFrame } from '../components/shell'
import { formatTime, formatDuration, formatRelativeTime } from '../lib/formatTime'
import type { ListenHistoryItem } from '../lib/types'
import './library.css'

const SKELETON_ROWS = 5
const SEEK_DELAY_MS = 200
const MAX_STAGGER = 12
const STAGGER_MS = 30

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
        setTimeout(() => seek(item.last_position_seconds), SEEK_DELAY_MS)
      }
    }
  }

  let body
  if (isLoading) {
    body = (
      <div className="zl-body" role="status" aria-label="Loading history">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <Skeleton key={i} height={60} borderRadius="var(--card-radius)" />
        ))}
      </div>
    )
  } else if (history.length === 0) {
    body = (
      <EmptyState
        icon={<HistoryFilled />}
        title="No listening history yet"
        description="Sets you play show up here so you can pick up where you left off."
        action={<Button appearance="primary" to="/app/browse" label="Start listening" />}
      />
    )
  } else {
    body = (
      <div className="zl-rows">
        {history.map((item, index) => {
          const progressPct = item.duration_seconds
            ? Math.min(100, (item.last_position_seconds / item.duration_seconds) * 100)
            : 0
          const canResume = Boolean(item.title && item.duration_seconds)

          return (
            <div
              key={item.id}
              className="zl-row animate-item"
              style={{ '--delay': `${Math.min(index, MAX_STAGGER) * STAGGER_MS}ms` } as CSSProperties}
            >
              <button
                type="button"
                className="zl-round"
                disabled={!canResume}
                onClick={() => handleResume(item)}
                aria-label={`Resume ${item.title || 'set'} at ${formatTime(item.last_position_seconds)}`}
              >
                <PlayFilled />
              </button>

              <Link to={`/app/sets/${item.set_id}`} className="zl-row-main">
                <span className="zl-row-title">{item.title || 'Untitled'}</span>
                <span className="zl-row-sub zl-row-line">
                  <span className="zl-row-ellipsis">{item.artist || 'Unknown'}</span>
                  {item.genre && <Badge>{item.genre}</Badge>}
                </span>
                {item.duration_seconds && item.last_position_seconds > 0 && (
                  <span className="zl-progress-row">
                    <span className="zl-progress" aria-hidden="true">
                      <span style={{ width: `${progressPct}%` }} />
                    </span>
                    <span className="zl-row-sub">
                      {formatTime(item.last_position_seconds)} / {formatDuration(item.duration_seconds)}
                    </span>
                  </span>
                )}
              </Link>

              <div className="zl-row-end">
                <span>{formatRelativeTime(item.last_listened_at)}</span>
                {item.listen_count > 1 && <span>{item.listen_count}× played</span>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <PageFrame>
      <ContentCard
        toolbar={
          <Toolbar>
            <h1 className="zl-toolbar-title">Listening history</h1>
            {!isLoading && history.length > 0 && <span className="zl-toolbar-meta">{history.length} sets</span>}
          </Toolbar>
        }
        main={<Section>{body}</Section>}
      />
    </PageFrame>
  )
}
