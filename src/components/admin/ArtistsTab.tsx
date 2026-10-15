import { useState, useEffect, useMemo } from 'react'
import { fetchArtists, syncArtistAdmin, deleteArtistAdmin } from '../../lib/api'
import { IconButton, Skeleton } from '../bleh'
import { inputClass } from '../bleh/ui/inputClass'
import { LayoutGridFilled, ListCheckFilled, Search2Filled } from '@mingcute/react/core-filled'
import { AdminButton, AdminModal } from './adminUi'
import { ArtistGrid, ArtistListTable } from './ArtistViews'
import { EditArtistModal } from './EditArtistModal'
import { ImportArtistModal } from './ImportArtistModal'
import { parseArtistTags, type Artist, type ArtistViewMode } from './artistTypes'

export { ImportArtistModal }

export function ArtistsTab({ editId }: { editId?: string } = {}) {
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ArtistViewMode>('list')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)

  const loadArtists = () => {
    setIsLoading(true)
    fetchArtists()
      .then((res) => setArtists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadArtists() }, [])

  // Auto-open edit modal when editId is provided via URL
  useEffect(() => {
    if (editId && artists.length > 0 && !editingArtist) {
      const match = artists.find((a) => a.id === editId)
      if (match) setEditingArtist(match)
    }
  }, [editId, artists, editingArtist])

  const filtered = useMemo(() => {
    if (!search.trim()) return artists
    const q = search.toLowerCase()
    return artists.filter((a) => {
      const tags = parseArtistTags(a.tags).join(' ')
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    )
  }

  const viewProps = {
    artists: filtered,
    syncing,
    onSync: handleSync,
    onEdit: (artist: Artist) => setEditingArtist(artist),
    onDelete: (id: string) => setConfirmDelete(id),
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs flex-1">
          <Search2Filled size={14} className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search artists"
            placeholder="Search artists…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + ' pl-9'}
          />
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="View mode">
          <IconButton
            label="List view"
            size="sm"
            variant={viewMode === 'list' ? 'filled' : 'subtle'}
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            <ListCheckFilled />
          </IconButton>
          <IconButton
            label="Grid view"
            size="sm"
            variant={viewMode === 'grid' ? 'filled' : 'subtle'}
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGridFilled />
          </IconButton>
        </div>
        <AdminButton size="sm" variant="primary" onClick={() => setShowImport(true)}>
          Import from 1001TL
        </AdminButton>
        <p className="shrink-0 text-[13px] tabular-nums text-muted">
          {filtered.length} artist{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* List/Grid */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">
          {search ? 'No artists match your search.' : 'No artists yet. Artists are created when you run detection on sets, or use "Import from 1001TL" above.'}
        </p>
      ) : viewMode === 'list' ? (
        <ArtistListTable {...viewProps} />
      ) : (
        <ArtistGrid {...viewProps} />
      )}

      {editingArtist && (
        <EditArtistModal
          artist={editingArtist}
          onClose={() => setEditingArtist(null)}
          onSaved={() => { setEditingArtist(null); loadArtists() }}
        />
      )}

      {showImport && (
        <ImportArtistModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadArtists() }}
        />
      )}

      {/* Delete confirmation */}
      <AdminModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Artist"
        size="sm"
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</AdminButton>
          </>
        }
      >
        <p className="text-[13px] text-text">
          This will delete the artist record. Their sets will remain but will be unlinked. This cannot be undone.
        </p>
      </AdminModal>
    </div>
  )
}
