import { useState, useEffect, useMemo } from 'react'
import { fetchArtists, syncArtistAdmin, updateArtistAdmin, deleteArtistAdmin, createArtistAdmin } from '../../lib/api'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Skeleton } from '../ui/Skeleton'
import { formatPlayCount, formatRelativeTime } from '../../lib/formatTime'
import { parseArtistSourceHtml, type Artist1001Parsed } from '../../lib/parse-1001tracklists-source'

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
  source_1001_id?: string | null
  spotify_url?: string | null
  soundcloud_url?: string | null
  beatport_url?: string | null
  traxsource_url?: string | null
  youtube_url?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  x_url?: string | null
}

export function ArtistsTab({ editId }: { editId?: string } = {}) {
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
        <Button variant="primary" size="sm" onClick={() => setShowImport(true)}>
          Import from 1001TL
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            {search ? 'No artists match your search.' : 'No artists yet. Artists are created when you run detection on sets, or use "Import from 1001TL" above.'}
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
                    {artist.source_1001_id && (
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--h3) / 0.7)' }}>1001TL:{artist.source_1001_id}</span>
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

      {/* Import modal */}
      {showImport && (
        <ImportArtistModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadArtists() }}
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

export function ImportArtistModal({ onClose, onImported, onCreated }: { onClose: () => void; onImported?: () => void; onCreated?: (id: string, name: string) => void }) {
  const [html, setHtml] = useState('')
  const [parsed, setParsed] = useState<Artist1001Parsed | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const handleParse = () => {
    setParseError(null)
    setParsed(null)
    if (!html.trim()) { setParseError('Paste the DJ page HTML first.'); return }
    try {
      const result = parseArtistSourceHtml(html)
      if (!result.name || result.name === 'Unknown Artist') {
        setParseError('Could not find artist name. Make sure you pasted the full DJ page HTML.')
        return
      }
      setParsed(result)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed')
    }
  }

  const handleImport = async () => {
    if (!parsed) return
    setIsImporting(true)
    setImportError(null)
    try {
      const res = await createArtistAdmin({
        name: parsed.name,
        image_url: parsed.image_url || null,
        country: parsed.country || null,
        spotify_url: parsed.spotify_url || null,
        soundcloud_url: parsed.soundcloud_url || null,
        beatport_url: parsed.beatport_url || null,
        apple_music_url: parsed.apple_music_url || null,
        traxsource_url: parsed.traxsource_url || null,
        youtube_url: parsed.youtube_url || null,
        facebook_url: parsed.facebook_url || null,
        instagram_url: parsed.instagram_url || null,
        x_url: parsed.x_url || null,
        source_1001_id: parsed.dj_id || null,
      })
      onCreated?.(res.data.id, parsed.name)
      onImported?.()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const serviceCount = parsed ? [
    parsed.spotify_url, parsed.soundcloud_url, parsed.beatport_url,
    parsed.apple_music_url, parsed.traxsource_url, parsed.youtube_url,
  ].filter(Boolean).length : 0

  return (
    <Modal isOpen onClose={onClose} title="Import Artist from 1001Tracklists">
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
          Go to any artist page on 1001tracklists.com (e.g. <code className="font-mono text-xs">/dj/johnsummit/</code>),
          right-click &rarr; "View Page Source", select all, and paste below.
        </p>

        {/* HTML paste area */}
        <div>
          <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>
            Page HTML
          </label>
          <textarea
            value={html}
            onChange={(e) => { setHtml(e.target.value); setParsed(null); setParseError(null) }}
            rows={6}
            placeholder="Paste the full DJ page HTML here..."
            className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-none focus:outline-none"
            style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
          />
        </div>

        <Button variant="secondary" onClick={handleParse} disabled={!html.trim()} className="w-full">
          Parse
        </Button>

        {parseError && (
          <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{parseError}</p>
        )}

        {/* Parsed preview */}
        {parsed && (
          <div className="rounded-lg p-4 space-y-3" style={{ background: 'hsl(var(--b5) / 0.6)', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.3)' }}>
            <div className="flex items-center gap-3">
              {parsed.image_url && (
                <img
                  src={parsed.image_url}
                  alt={parsed.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div>
                <p className="font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>{parsed.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {parsed.country && <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>{parsed.country}</span>}
                  {parsed.tracklist_count && (
                    <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>{parsed.tracklist_count.toLocaleString()} tracklists</span>
                  )}
                </div>
              </div>
            </div>

            {/* Service links summary */}
            <div className="text-xs space-y-1" style={{ color: 'hsl(var(--c2))' }}>
              {parsed.image_url && <div>Photo: found</div>}
              {serviceCount > 0 && <div>{serviceCount} service link{serviceCount !== 1 ? 's' : ''} found (Spotify, SoundCloud, Beatport, etc.)</div>}
              {parsed.facebook_url && <div>Facebook: found</div>}
              {parsed.instagram_url && <div>Instagram: found</div>}
              {parsed.youtube_url && <div>YouTube: found</div>}
              <div className="text-xs mt-1" style={{ color: 'hsl(var(--c3))' }}>
                Last.fm bio and listener counts will be fetched automatically after import.
              </div>
            </div>
          </div>
        )}

        {importError && (
          <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{importError}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!parsed || isImporting}
            className="flex-1"
          >
            {isImporting ? 'Importing...' : 'Import Artist'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function EditArtistModal({ artist, onClose, onSaved }: { artist: Artist; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(artist.name)
  const [imageUrl, setImageUrl] = useState(artist.image_url || '')
  const [bioSummary, setBioSummary] = useState(artist.bio_summary || '')
  const [tagsStr, setTagsStr] = useState(
    (() => { try { return JSON.parse(artist.tags || '[]').join(', ') } catch { return '' } })()
  )
  const [source1001Id, setSource1001Id] = useState(artist.source_1001_id || '')
  const [spotifyUrl, setSpotifyUrl] = useState(artist.spotify_url || '')
  const [soundcloudUrl, setSoundcloudUrl] = useState(artist.soundcloud_url || '')
  const [beatportUrl, setBeatportUrl] = useState(artist.beatport_url || '')
  const [traxsourceUrl, setTraxsourceUrl] = useState(artist.traxsource_url || '')
  const [youtubeUrl, setYoutubeUrl] = useState(artist.youtube_url || '')
  const [facebookUrl, setFacebookUrl] = useState(artist.facebook_url || '')
  const [instagramUrl, setInstagramUrl] = useState(artist.instagram_url || '')
  const [xUrl, setXUrl] = useState(artist.x_url || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1001TL enrichment
  const [showEnrich, setShowEnrich] = useState(false)
  const [enrichHtml, setEnrichHtml] = useState('')
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [enrichSuccess, setEnrichSuccess] = useState(false)

  const handleEnrich = () => {
    setEnrichError(null)
    setEnrichSuccess(false)
    if (!enrichHtml.trim()) { setEnrichError('Paste the DJ page HTML first.'); return }
    try {
      const result = parseArtistSourceHtml(enrichHtml)
      if (!result.name || result.name === 'Unknown Artist') {
        setEnrichError('Could not parse artist data. Make sure you pasted the full DJ page HTML.')
        return
      }
      // Fill only empty/missing fields — don't overwrite existing data
      if (!imageUrl && result.image_url) setImageUrl(result.image_url)
      if (!source1001Id && result.dj_id) setSource1001Id(result.dj_id)
      if (!spotifyUrl && result.spotify_url) setSpotifyUrl(result.spotify_url)
      if (!soundcloudUrl && result.soundcloud_url) setSoundcloudUrl(result.soundcloud_url)
      if (!beatportUrl && result.beatport_url) setBeatportUrl(result.beatport_url)
      if (!traxsourceUrl && result.traxsource_url) setTraxsourceUrl(result.traxsource_url)
      if (!youtubeUrl && result.youtube_url) setYoutubeUrl(result.youtube_url)
      if (!facebookUrl && result.facebook_url) setFacebookUrl(result.facebook_url)
      if (!instagramUrl && result.instagram_url) setInstagramUrl(result.instagram_url)
      if (!xUrl && result.x_url) setXUrl(result.x_url)
      setEnrichSuccess(true)
      setEnrichHtml('')
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : 'Parse failed')
    }
  }

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
        source_1001_id: source1001Id.trim() || null,
        spotify_url: spotifyUrl.trim() || null,
        soundcloud_url: soundcloudUrl.trim() || null,
        beatport_url: beatportUrl.trim() || null,
        traxsource_url: traxsourceUrl.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        x_url: xUrl.trim() || null,
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

        {/* 1001TL Enrichment section */}
        <div className="rounded-lg overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.2)' }}>
          <button
            onClick={() => setShowEnrich(!showEnrich)}
            className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer"
            style={{ background: 'hsl(var(--b5) / 0.4)' }}
          >
            <span className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c2))' }}>
              Enrich from 1001Tracklists
            </span>
            <svg
              className="w-3.5 h-3.5 transition-transform"
              style={{ color: 'hsl(var(--c3))', transform: showEnrich ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showEnrich && (
            <div className="px-3 pb-3 pt-2 space-y-2" style={{ background: 'hsl(var(--b5) / 0.2)' }}>
              <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
                Paste the DJ page HTML to fill in missing social links, image, and source ID. Existing values are preserved.
              </p>
              <textarea
                value={enrichHtml}
                onChange={(e) => { setEnrichHtml(e.target.value); setEnrichError(null); setEnrichSuccess(false) }}
                rows={3}
                placeholder="Paste /dj/... page HTML here..."
                className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-none focus:outline-none"
                style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}
              />
              <Button variant="secondary" size="sm" onClick={handleEnrich} disabled={!enrichHtml.trim()}>
                Parse &amp; Fill Missing
              </Button>
              {enrichError && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{enrichError}</p>}
              {enrichSuccess && <p className="text-xs" style={{ color: 'hsl(140, 60%, 45%)' }}>Fields updated from 1001Tracklists data. Review below and save.</p>}
            </div>
          )}
        </div>

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
        <Input
          label="1001Tracklists DJ ID"
          value={source1001Id}
          onChange={(e) => setSource1001Id(e.target.value)}
          placeholder="e.g. johnsummit (from /dj/johnsummit/)"
        />

        {/* Service links */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Spotify" value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/..." />
          <Input label="SoundCloud" value={soundcloudUrl} onChange={(e) => setSoundcloudUrl(e.target.value)} placeholder="https://soundcloud.com/..." />
          <Input label="Beatport" value={beatportUrl} onChange={(e) => setBeatportUrl(e.target.value)} placeholder="https://beatport.com/..." />
          <Input label="Traxsource" value={traxsourceUrl} onChange={(e) => setTraxsourceUrl(e.target.value)} placeholder="https://traxsource.com/..." />
          <Input label="YouTube" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
          <Input label="Facebook" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
          <Input label="Instagram" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
          <Input label="X (Twitter)" value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="https://x.com/..." />
        </div>

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
