import { useState, useEffect, type CSSProperties } from 'react'
import { useParams, Link } from 'react-router'
import { CloseFilled, PlayFilled, PlaylistFilled } from '@mingcute/react/core-filled'
import { fetchPlaylist, removeFromPlaylist } from '../lib/api'
import { usePlayerStore } from '../stores/playerStore'
import { Badge, Button, ContentCard, EmptyState, IconButton, InlineAlert, Section, Skeleton, Toolbar } from '../components/bleh'
import { Hero, PageFrame } from '../components/shell'
import { formatDuration } from '../lib/formatTime'
import type { PlaylistWithItems } from '../lib/types'
import './library.css'

const MAX_STAGGER = 12
const STAGGER_MS = 30

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
      <PageFrame>
        <ContentCard main={<Section><InlineAlert tone="error">{error}</InlineAlert></Section>} />
      </PageFrame>
    )
  }

  const items = playlist?.items ?? []
  const totalDuration = items.reduce((sum, item) => sum + (item.duration_seconds || 0), 0)
  const meta = playlist && (
    <>
      {items.length} {items.length === 1 ? 'set' : 'sets'}
      {totalDuration > 0 && ` · ${formatDuration(totalDuration)}`}
    </>
  )

  return (
    <>
      <Hero
        title={playlist?.title ?? 'Playlist'}
        eyebrow="Playlist"
        art={<div className="zl-hero-cover" aria-hidden="true"><PlaylistFilled /></div>}
        meta={meta || undefined}
      />
      <PageFrame>
        <ContentCard
          toolbar={
            <Toolbar>
              <Link to="/app/playlists" className="zl-back">All playlists</Link>
              {playlist?.description && <span className="zl-toolbar-meta">{playlist.description}</span>}
            </Toolbar>
          }
          main={
            <Section>
              {isLoading || !playlist ? (
                <div className="zl-body" role="status" aria-label="Loading playlist">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={60} borderRadius="var(--card-radius)" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={<PlaylistFilled />}
                  title="This playlist is empty"
                  description="Add sets from their page or from browse."
                  action={<Button appearance="primary" to="/app/browse" label="Browse sets" />}
                />
              ) : (
                <div className="zl-rows">
                  {items.map((item, index) => {
                    const canPlay = Boolean(item.title && item.duration_seconds)
                    return (
                      <div
                        key={item.id}
                        className="zl-row animate-item"
                        style={{ '--delay': `${Math.min(index, MAX_STAGGER) * STAGGER_MS}ms` } as CSSProperties}
                      >
                        <span className="zl-row-index">{index + 1}</span>
                        <button
                          type="button"
                          className="zl-round"
                          disabled={!canPlay}
                          aria-label={`Play ${item.title || 'set'}`}
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
                        >
                          <PlayFilled />
                        </button>
                        <Link to={`/app/sets/${item.set_id}`} className="zl-row-main">
                          <span className="zl-row-title">{item.title || 'Untitled'}</span>
                          <span className="zl-row-sub">{item.artist || 'Unknown'}</span>
                        </Link>
                        <div className="zl-row-end zl-row-end--inline">
                          {item.genre && <span className="zl-hide-sm"><Badge>{item.genre}</Badge></span>}
                          {item.duration_seconds ? <span className="zl-hide-sm">{formatDuration(item.duration_seconds)}</span> : null}
                        </div>
                        <IconButton label={`Remove ${item.title || 'set'} from playlist`} size="sm" onClick={() => handleRemove(item.set_id)}>
                          <CloseFilled />
                        </IconButton>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          }
        />
      </PageFrame>
    </>
  )
}
