import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { fetchPlaylist, removeFromPlaylist } from '../lib/api'
import { usePlayerStore } from '../stores/playerStore'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { formatDuration } from '../lib/formatTime'
import type { PlaylistWithItems } from '../lib/types'

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const [playlist, setPlaylist] = useState<PlaylistWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const play = usePlayerStore((s) => s.play)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    fetchPlaylist(id)
      .then((res) => setPlaylist(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [id])

  const handleRemove = async (setId: string) => {
    if (!id || !playlist) return
    try {
      await removeFromPlaylist(id, setId)
      setPlaylist((prev) =>
        prev ? { ...prev, items: prev.items.filter((item) => item.set_id !== setId) } : null
      )
    } catch {
      // silent
    }
  }

  if (error) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-danger text-sm">{error}</p>
      </div>
    )
  }

  if (isLoading || !playlist) {
    return (
      <div className="px-6 lg:px-10 py-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-40 mb-8" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full mb-2" />
        ))}
      </div>
    )
  }

  const totalDuration = playlist.items.reduce((sum, item) => sum + (item.duration_seconds || 0), 0)

  return (
    <div className="px-6 lg:px-10 py-6">
      {/* Header */}
      <div className="mb-8">
        <Link to="/app/playlists" className="text-xs text-text-muted hover:text-text-secondary transition-colors no-underline mb-2 inline-block">
          &larr; Back to playlists
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">{playlist.title}</h1>
        {playlist.description && (
          <p className="text-sm text-text-secondary mt-1">{playlist.description}</p>
        )}
        <p className="text-xs text-text-muted mt-2">
          {playlist.items.length} {playlist.items.length === 1 ? 'set' : 'sets'}
          {totalDuration > 0 && ` · ${formatDuration(totalDuration)}`}
        </p>
      </div>

      {/* Items */}
      {playlist.items.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl">
          <p className="text-text-muted text-sm">This playlist is empty.</p>
          <Link to="/app/browse" className="text-accent text-sm mt-2 inline-block no-underline hover:underline">
            Browse sets to add
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {playlist.items.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors ${
                index > 0 ? 'border-t border-border' : ''
              }`}
            >
              {/* Position */}
              <span className="text-xs text-text-muted w-6 text-center flex-shrink-0">
                {index + 1}
              </span>

              {/* Play button */}
              <button
                onClick={() => {
                  if (item.title && item.duration_seconds) {
                    play({
                      id: item.set_id,
                      title: item.title,
                      artist: item.artist || 'Unknown',
                      duration_seconds: item.duration_seconds,
                      genre: item.genre || null,
                      r2_key: `sets/${item.set_id}/audio.mp3`,
                    } as any)
                  }
                }}
                className="w-8 h-8 bg-surface-overlay rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-colors flex-shrink-0"
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
                <p className="text-xs text-text-secondary truncate">{item.artist || 'Unknown'}</p>
              </Link>

              {/* Meta */}
              {item.genre && <Badge variant="muted">{item.genre}</Badge>}
              {item.duration_seconds && (
                <span className="text-xs text-text-muted flex-shrink-0">
                  {formatDuration(item.duration_seconds)}
                </span>
              )}

              {/* Remove */}
              <button
                onClick={() => handleRemove(item.set_id)}
                className="text-text-muted hover:text-danger transition-colors flex-shrink-0 p-1"
                title="Remove from playlist"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
