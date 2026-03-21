import { useState, useEffect, useMemo } from 'react'
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
  const [search, setSearch] = useState('')

  const loadArtists = () => {
    setIsLoading(true)
    fetchArtists()
      .then((res) => setArtists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadArtists() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return artists
    const q = search.toLowerCase()
    return artists.filter((a) => {
      const tags = (() => { try { return JSON.parse(a.tags || '[]').join(' ') } catch { return '' } })()
      return a.name.toLowerCase().includes(q) || a.slug.includes(q) || tags.toLowerCase().includes(q)
    })
  }, [artists, search])

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

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <p className="text-sm shrink-0" style={{ color: 'hsl(var(--c3))' }}>{filtered.length} artist{filtered.length !== 1 ? 's' : ''}</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search artists..."
          className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm placeholder:text-text-muted focus:outline-none transition-all duration-200"
          style={{
            background: 'hsl(var(--b4) / 0.4)',
            color: 'hsl(var(--c1))',
          }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px hsl(var(--h3) / 0.5)' }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            {search ? 'No artists match your search.' : 'No artists yet. Artists are created when you run detection on sets.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((artist) => {
            const tags = (() => { try { return JSON.parse(artist.tags || '[]') } catch { return [] } })()
            return (
              <div key={artist.id} className="card !p-4 flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'hsl(var(--b4) / 0.6)' }}
                >
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3))' }}>
                      {artist.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-[var(--font-weight-medium)] truncate" style={{ color: 'hsl(var(--c1))' }}>{artist.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="muted">{tag}</Badge>
                    ))}
                    {artist.listeners > 0 && (
                      <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>{formatPlayCount(artist.listeners)} listeners</span>
                    )}
                    {artist.last_synced_at && (
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>synced {formatRelativeTime(artist.last_synced_at)}</span>
                    )}
                  </div>
                </div>

                {/* Set count */}
                <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>
                  {artist.set_count} set{artist.set_count !== 1 ? 's' : ''}
                </span>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSync(artist.id)}
                    disabled={syncing === artist.id}
                  >
                    {syncing === artist.id ? '...' : 'Sync'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingArtist(artist)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(artist.id)}>Delete</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>
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
      <div className="space-y-3">
        {/* Image preview */}
        {imageUrl && (
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-20 h-20 rounded-full object-cover"
              style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}
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
          <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Bio</label>
          <textarea
            value={bioSummary}
            onChange={(e) => setBioSummary(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
            style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
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

        {error && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p>}

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
