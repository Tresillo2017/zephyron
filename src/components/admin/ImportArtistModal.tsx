import { useState } from 'react'
import { createArtistAdmin, uploadArtistImageAdmin } from '../../lib/api'
import { parseArtistSourceHtml, type Artist1001Parsed } from '../../lib/parse-1001tracklists-source'
import { InlineAlert, Textarea } from '../bleh'
import { AdminButton, AdminModal } from './adminUi'

interface ImportArtistModalProps {
  onClose: () => void
  onImported?: () => void
  onCreated?: (id: string, name: string) => void
}

function countServices(parsed: Artist1001Parsed): number {
  return [
    parsed.spotify_url, parsed.soundcloud_url, parsed.beatport_url,
    parsed.apple_music_url, parsed.traxsource_url, parsed.youtube_url,
  ].filter(Boolean).length
}

function ParsedPreview({ parsed }: { parsed: Artist1001Parsed }) {
  const serviceCount = countServices(parsed)
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-b4/40 p-4 ring-1 ring-inset ring-border-soft">
      <div className="flex items-center gap-3">
        {parsed.image_url && (
          <img
            src={parsed.image_url}
            alt={parsed.name}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="min-w-0">
          <p className="font-medium text-heading">{parsed.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
            {parsed.country && <span>{parsed.country}</span>}
            {parsed.tracklist_count && <span>{parsed.tracklist_count.toLocaleString()} tracklists</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-[12px] text-text">
        {parsed.image_url && <div>Photo: found</div>}
        {serviceCount > 0 && <div>{serviceCount} service link{serviceCount !== 1 ? 's' : ''} found (Spotify, SoundCloud, Beatport, etc.)</div>}
        {parsed.facebook_url && <div>Facebook: found</div>}
        {parsed.instagram_url && <div>Instagram: found</div>}
        {parsed.youtube_url && <div>YouTube: found</div>}
        <div className="mt-1 text-muted">Last.fm bio and listener counts will be fetched automatically after import.</div>
      </div>
    </div>
  )
}

export function ImportArtistModal({ onClose, onImported, onCreated }: ImportArtistModalProps) {
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

      // Upload profile image to R2 if found
      if (parsed.image_url) {
        try {
          await uploadArtistImageAdmin(res.data.id, parsed.image_url)
        } catch (imgErr) {
          console.warn('Failed to upload profile image:', imgErr)
          // Don't fail the whole import if image upload fails
        }
      }

      onCreated?.(res.data.id, parsed.name)
      onImported?.()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <AdminModal
      isOpen
      onClose={onClose}
      title="Import Artist from 1001Tracklists"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={handleImport} disabled={!parsed || isImporting}>
            {isImporting ? 'Importing…' : 'Import Artist'}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-muted">
          Go to any artist page on 1001tracklists.com (e.g. <code className="font-mono text-[12px] text-text">/dj/johnsummit/</code>),
          right-click &rarr; &quot;View Page Source&quot;, select all, and paste below.
        </p>

        <Textarea
          label="Page HTML"
          value={html}
          onChange={(e) => { setHtml(e.target.value); setParsed(null); setParseError(null) }}
          rows={6}
          placeholder="Paste the full DJ page HTML here..."
          className="font-mono text-[12px]"
        />

        <AdminButton variant="secondary" onClick={handleParse} disabled={!html.trim()} className="w-full">
          Parse
        </AdminButton>

        {parseError && <InlineAlert tone="error">{parseError}</InlineAlert>}
        {parsed && <ParsedPreview parsed={parsed} />}
        {importError && <InlineAlert tone="error">{importError}</InlineAlert>}
      </div>
    </AdminModal>
  )
}
