import { useState, useEffect } from 'react'
import { fetchArtists, syncArtistAdmin, updateArtistAdmin, deleteArtistAdmin } from '../../lib/api'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Skeleton } from '../ui/Skeleton'
import { formatPlayCount, formatRelativeTime } from '../../lib/formatTime'

interface Artist {
  id: string
  name: string
  slug: string
  image_url: string | null
  bio_summary: string | null
  tags: string | null
  listeners: number
  playcount: number
  lastfm_url: string | null
  last_synced_at: string | null
  set_count: number
  created_at: string
}

export function ArtistsTab() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadArtists = () => {
    setIsLoading(true)
    fetchArtists()
      .then((res) => setArtists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadArtists() }, [])

  const handleSync = async (id: string) => {
    setSyncing(id)
    try {
      await syncArtistAdmin(id)
      loadArtists()
    } catch { /* silent */ }
    finally { setSyncing(null) }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteArtistAdmin(id)
      setArtists((prev) => prev.filter((a) => a.id !== id))
      setConfirmDelete(null)
    } catch { /* silent */ }
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />

  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted text-sm">No artists yet. Artists are created when you run detection on sets.</p>
      </div>
    )
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {artists.map((artist, index) => {
          const tags = (() => { try { return JSON.parse(artist.tags || '[]') } catch { return [] } })()
          return (
            <div
              key={artist.id}
              className={`flex items-center gap-4 px-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-surface-overlay">
                {artist.image_url ? (
                  <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-lg font-bold">
                    {artist.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{artist.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="muted">{tag}</Badge>
                  ))}
                  {artist.set_count > 0 && (
                    <span className="text-xs text-text-muted">{artist.set_count} set{artist.set_count !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {artist.listeners > 0 ? `${formatPlayCount(artist.listeners)} listeners` : 'No Last.fm data'}
                  {artist.last_synced_at && ` · Synced ${formatRelativeTime(artist.last_synced_at)}`}
                </p>
              </div>

              {/* Image status */}
              <Badge variant={artist.image_url ? 'accent' : 'muted'}>
                {artist.image_url ? 'Has image' : 'No image'}
              </Badge>

              {/* Actions */}
              <div className="flex gap-1.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSync(artist.id)}
                  disabled={syncing === artist.id}
                >
                  {syncing === artist.id ? '...' : 'Sync Last.fm'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingArtist(artist)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(artist.id)}>
                  Delete
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editingArtist && (
        <EditArtistModal
          artist={editingArtist}
          onClose={() => setEditingArtist(null)}
          onSaved={() => { setEditingArtist(null); loadArtists() }}
        />
      )}

      {/* Delete confirmation */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Artist">
        <p className="text-sm text-text-secondary mb-4">
          This will delete the artist record. Their sets will remain but will be unlinked. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </>
  )
}

function EditArtistModal({ artist, onClose, onSaved }: { artist: Artist; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(artist.name)
  const [imageUrl, setImageUrl] = useState(artist.image_url || '')
  const [bioSummary, setBioSummary] = useState(artist.bio_summary || '')
  const [tagsStr, setTagsStr] = useState(
    (() => { try { return JSON.parse(artist.tags || '[]').join(', ') } catch { return '' } })()
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const tags = tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean)
      await updateArtistAdmin(artist.id, {
        name: name.trim(),
        image_url: imageUrl.trim() || null,
        bio_summary: bioSummary.trim() || null,
        tags,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Edit: ${artist.name}`}>
      <div className="space-y-4">
        {/* Image preview */}
        {imageUrl && (
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border-2 border-border"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}

        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://... (paste any image URL)"
        />
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1.5">Bio</label>
          <textarea
            value={bioSummary}
            onChange={(e) => setBioSummary(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
          />
        </div>
        <Input
          label="Tags (comma-separated)"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="techno, house, electronic"
        />

        {artist.lastfm_url && (
          <a href={artist.lastfm_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline no-underline block">
            View on Last.fm &rarr;
          </a>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving || !name.trim()} className="flex-1">
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
