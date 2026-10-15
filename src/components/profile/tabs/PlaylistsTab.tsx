import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, FooterFill, Input, Modal } from '../../bleh'
import { PlaylistGridSkeleton } from '../../ui/Skeleton'
import { createPlaylist as createPlaylistApi, fetchPlaylists } from '../../../lib/api'
import { formatRelativeTime } from '../../../lib/formatTime'
import type { Playlist } from '../../../lib/types'

interface PlaylistsTabProps {
  /** Reports the count after the list loads or a playlist is created. */
  onCountChange: (count: number) => void
}

export function PlaylistsTab({ onCountChange }: PlaylistsTabProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const reload = useCallback(() => {
    setLoading(true)
    fetchPlaylists()
      .then((res) => {
        setPlaylists(res.data)
        onCountChange(res.data.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [onCountChange])

  // Mounted only while the tab is active, so this is the load-on-activate behaviour.
  useEffect(() => { reload() }, [reload])

  const closeCreate = () => { setShowCreate(false); setNewTitle(''); setNewDescription('') }

  const handleCreatePlaylist = async () => {
    if (!newTitle.trim() || isCreating) return
    setIsCreating(true)
    try {
      await createPlaylistApi(newTitle.trim(), newDescription.trim() || undefined)
      closeCreate()
      reload()
    } catch {
      // silent
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your playlists</h2>
        <Button label="New playlist" appearance="primary" size="sm" onClick={() => setShowCreate(true)} />
      </div>

      {showCreate && (
        <Modal
          title="New playlist"
          onClose={closeCreate}
          footer={(
            <>
              <FooterFill />
              <Button label="Cancel" appearance="ghost" size="sm" onClick={closeCreate} />
              <Button
                label={isCreating ? 'Creating...' : 'Create'}
                appearance="primary"
                size="sm"
                onClick={handleCreatePlaylist}
                disabled={!newTitle.trim() || isCreating}
              />
            </>
          )}
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Playlist name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="My DJ Set Collection"
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              autoFocus
            />
            <Input
              label="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="A collection of my favorite sets..."
            />
          </div>
        </Modal>
      )}

      {loading ? (
        <PlaylistGridSkeleton count={3} />
      ) : playlists.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted">No playlists yet</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {playlists.map((pl) => (
            <Link
              key={pl.id}
              to={`/playlists/${pl.id}`}
              className="flex items-center gap-4 rounded-card bg-surface p-4 no-underline transition-colors hover:bg-[oklch(var(--b4)/0.3)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'oklch(var(--c1))' }}>{pl.title}</p>
                <p className="text-xs text-muted">
                  {pl.item_count ?? 0} {(pl.item_count ?? 0) === 1 ? 'set' : 'sets'}
                  {' · '}
                  {formatRelativeTime(pl.updated_at)}
                </p>
              </div>
              <span aria-hidden="true" className="text-muted">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
