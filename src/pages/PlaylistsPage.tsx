import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { fetchPlaylists, createPlaylist as createPlaylistApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PlaylistGridSkeleton } from '../components/ui/Skeleton'
import { formatRelativeTime } from '../lib/formatTime'
import type { Playlist } from '../lib/types'

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const loadPlaylists = () => {
    setIsLoading(true)
    fetchPlaylists()
      .then((res) => setPlaylists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadPlaylists()
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim() || isCreating) return
    setIsCreating(true)
    try {
      await createPlaylistApi(newTitle.trim(), newDescription.trim() || undefined)
      setNewTitle('')
      setNewDescription('')
      setShowCreate(false)
      loadPlaylists()
    } catch {
      // silent
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Your Playlists</h1>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'New Playlist'}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface-raised border border-border rounded-xl p-4 mb-6 space-y-3">
          <Input
            label="Playlist name"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="My DJ Set Collection"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Input
            label="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="A collection of my favorite sets..."
          />
          <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim() || isCreating}>
            {isCreating ? 'Creating...' : 'Create Playlist'}
          </Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <PlaylistGridSkeleton count={3} />
      ) : playlists.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-text-muted/30 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          </svg>
          <p className="text-text-muted text-sm mb-4">No playlists yet</p>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            Create your first playlist
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {playlists.map((pl) => (
            <Link
              key={pl.id}
              to={`/playlists/${pl.id}`}
              className="flex items-center gap-4 px-4 py-4 bg-surface-raised border border-border rounded-xl hover:border-border-light transition-colors no-underline"
            >
              <div className="w-12 h-12 bg-surface-overlay rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{pl.title}</p>
                <p className="text-xs text-text-muted">
                  {pl.item_count ?? 0} {(pl.item_count ?? 0) === 1 ? 'set' : 'sets'}
                  {' · '}
                  {formatRelativeTime(pl.updated_at)}
                </p>
              </div>
              <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
