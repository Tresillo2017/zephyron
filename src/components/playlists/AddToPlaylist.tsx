import { useState, useEffect } from 'react'
import { fetchPlaylists, addToPlaylist } from '../../lib/api'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { createPlaylist } from '../../lib/api'
import type { Playlist } from '../../lib/types'

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

  const handleCreate = async () => {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Playlist">
      {/* Create new */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New playlist name..."
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreate}
          disabled={!newTitle.trim() || isCreating}
        >
          {isCreating ? '...' : 'Create'}
        </Button>
      </div>

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      {/* Existing playlists */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-overlay rounded animate-pulse" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">
          No playlists yet. Create one above.
        </p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => handleAdd(pl.id)}
              disabled={added.has(pl.id) || addingTo === pl.id}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                added.has(pl.id)
                  ? 'bg-accent/10 text-accent'
                  : 'hover:bg-surface-hover text-text-primary'
              } disabled:opacity-60`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{pl.title}</p>
                <p className="text-xs text-text-muted">
                  {pl.item_count ?? 0} {(pl.item_count ?? 0) === 1 ? 'set' : 'sets'}
                </p>
              </div>
              {added.has(pl.id) ? (
                <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              ) : addingTo === pl.id ? (
                <span className="text-xs text-text-muted">Adding...</span>
              ) : (
                <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
