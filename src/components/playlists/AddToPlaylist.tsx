import { useState, useEffect, type FormEvent } from 'react'
import { AddFilled, CheckFilled, PlaylistFilled } from '@mingcute/react/core-filled'
import { fetchPlaylists, addToPlaylist, createPlaylist } from '../../lib/api'
import { Button, InlineAlert, Input, Modal, Skeleton } from '../bleh'
import type { Playlist } from '../../lib/types'
import './playlists.css'

interface AddToPlaylistProps {
  setId: string
  isOpen: boolean
  onClose: () => void
}

export function AddToPlaylist({ setId, isOpen, onClose }: AddToPlaylistProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    fetchPlaylists()
      .then((res) => setPlaylists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [isOpen])

  if (!isOpen) return null

  const handleAdd = async (playlistId: string) => {
    if (addingTo) return
    setAddingTo(playlistId)
    setError(null)
    try {
      await addToPlaylist(playlistId, setId)
      setAdded((prev) => new Set(prev).add(playlistId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAddingTo(null)
    }
  }

  const handleCreate = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!newTitle.trim() || isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      const res = await createPlaylist(newTitle.trim())
      // Add to the new playlist immediately
      await addToPlaylist(res.data.id, setId)
      setPlaylists((prev) => [
        { id: res.data.id, title: res.data.title, user_id: null, anonymous_id: null, description: null, is_public: 1, item_count: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ...prev,
      ])
      setAdded((prev) => new Set(prev).add(res.data.id))
      setNewTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Modal title="Add to playlist" icon={<PlaylistFilled />} onClose={onClose} width={420}>
      {/* Create new */}
      <form className="zl-add-create" onSubmit={handleCreate}>
        <Input
          aria-label="New playlist name"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New playlist name..."
          className="zl-add-input"
        />
        <Button
          size="sm"
          appearance="primary"
          htmlButtonType="submit"
          label={isCreating ? 'Creating...' : 'Create'}
          disabled={!newTitle.trim() || isCreating}
        />
      </form>

      {error && <InlineAlert tone="error">{error}</InlineAlert>}

      {/* Existing playlists */}
      {isLoading ? (
        <div className="zl-add-list" role="status" aria-label="Loading playlists">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={48} borderRadius="var(--card-radius)" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <p className="zl-add-empty">No playlists yet. Create one above.</p>
      ) : (
        <div className="zl-add-list">
          {playlists.map((pl) => {
            const isAdded = added.has(pl.id)
            const isBusy = addingTo === pl.id
            return (
              <button
                key={pl.id}
                type="button"
                className="zl-row zl-add-row"
                onClick={() => handleAdd(pl.id)}
                disabled={isAdded || isBusy}
                data-added={isAdded ? '' : undefined}
              >
                <span className="zl-row-main">
                  <span className="zl-row-title">{pl.title}</span>
                  <span className="zl-row-sub">
                    {pl.item_count ?? 0} {(pl.item_count ?? 0) === 1 ? 'set' : 'sets'}
                  </span>
                </span>
                {isAdded ? (
                  <>
                    <CheckFilled className="zl-add-icon" aria-hidden="true" />
                    <span className="sr-only">Added</span>
                  </>
                ) : isBusy ? (
                  <span className="zl-row-sub">Adding...</span>
                ) : (
                  <AddFilled className="zl-add-icon" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
