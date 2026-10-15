import { useState } from 'react'
import { updateArtistAdmin, uploadArtistImageAdmin } from '../../lib/api'
import { parseArtistSourceHtml } from '../../lib/parse-1001tracklists-source'
import { cn } from '../../lib/cn'
import { DownSmallFilled } from '@mingcute/react/core-filled'
import { Input, InlineAlert, Textarea } from '../bleh'
import { AdminButton, AdminModal, safeUrl } from './adminUi'
import { parseArtistTags, type Artist } from './artistTypes'

interface EnrichPanelProps {
  isOpen: boolean
  onToggle: () => void
  html: string
  onHtmlChange: (value: string) => void
  onParse: () => void
  isEnriching: boolean
  error: string | null
  success: boolean
}

function EnrichPanel({ isOpen, onToggle, html, onHtmlChange, onParse, isEnriching, error, success }: EnrichPanelProps) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-inset ring-border-soft">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between bg-b4/40 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-2"
      >
        <span className="text-[13px] font-medium text-text">Enrich from 1001Tracklists</span>
        <DownSmallFilled size={16} aria-hidden="true" className={cn('text-muted transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 px-3 pb-3 pt-2">
          <p className="text-[12px] text-muted">
            Paste the DJ page HTML to fill in missing social links, profile image, and source ID. Existing values are preserved.
          </p>
          <Textarea
            aria-label="1001Tracklists page HTML"
            value={html}
            onChange={(e) => onHtmlChange(e.target.value)}
            rows={3}
            placeholder="Paste /dj/... page HTML here..."
            className="font-mono text-[12px]"
            disabled={isEnriching}
          />
          <AdminButton variant="secondary" size="sm" onClick={onParse} disabled={!html.trim() || isEnriching}>
            {isEnriching ? 'Processing…' : 'Parse & Fill Missing'}
          </AdminButton>
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          {success && (
            <InlineAlert tone="success">Fields and profile image updated from 1001Tracklists data. Review below and save.</InlineAlert>
          )}
        </div>
      )}
    </div>
  )
}

export function EditArtistModal({ artist, onClose, onSaved }: { artist: Artist; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(artist.name)
  const [bioSummary, setBioSummary] = useState(artist.bio_summary || '')
  const [tagsStr, setTagsStr] = useState(parseArtistTags(artist.tags).join(', '))
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
  const [isEnriching, setIsEnriching] = useState(false)

  const handleEnrich = async () => {
    setEnrichError(null)
    setEnrichSuccess(false)
    setIsEnriching(true)

    if (!enrichHtml.trim()) {
      setEnrichError('Paste the DJ page HTML first.')
      setIsEnriching(false)
      return
    }

    try {
      const result = parseArtistSourceHtml(enrichHtml)
      if (!result.name || result.name === 'Unknown Artist') {
        setEnrichError('Could not parse artist data. Make sure you pasted the full DJ page HTML.')
        setIsEnriching(false)
        return
      }

      // Fill only empty/missing fields — don't overwrite existing data
      if (!source1001Id && result.dj_id) setSource1001Id(result.dj_id)
      if (!spotifyUrl && result.spotify_url) setSpotifyUrl(result.spotify_url)
      if (!soundcloudUrl && result.soundcloud_url) setSoundcloudUrl(result.soundcloud_url)
      if (!beatportUrl && result.beatport_url) setBeatportUrl(result.beatport_url)
      if (!traxsourceUrl && result.traxsource_url) setTraxsourceUrl(result.traxsource_url)
      if (!youtubeUrl && result.youtube_url) setYoutubeUrl(result.youtube_url)
      if (!facebookUrl && result.facebook_url) setFacebookUrl(result.facebook_url)
      if (!instagramUrl && result.instagram_url) setInstagramUrl(result.instagram_url)
      if (!xUrl && result.x_url) setXUrl(result.x_url)

      // Upload profile image if found
      if (result.image_url) {
        try {
          await uploadArtistImageAdmin(artist.id, result.image_url)
        } catch (imgErr) {
          console.warn('Failed to upload profile image:', imgErr)
          // Don't fail the whole enrichment if image upload fails
        }
      }

      setEnrichSuccess(true)
      setEnrichHtml('')
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setIsEnriching(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const tags = tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean)
      await updateArtistAdmin(artist.id, {
        name: name.trim(),
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

  const serviceFields = [
    { label: 'Spotify', value: spotifyUrl, onChange: setSpotifyUrl, placeholder: 'https://open.spotify.com/...' },
    { label: 'SoundCloud', value: soundcloudUrl, onChange: setSoundcloudUrl, placeholder: 'https://soundcloud.com/...' },
    { label: 'Beatport', value: beatportUrl, onChange: setBeatportUrl, placeholder: 'https://beatport.com/...' },
    { label: 'Traxsource', value: traxsourceUrl, onChange: setTraxsourceUrl, placeholder: 'https://traxsource.com/...' },
    { label: 'YouTube', value: youtubeUrl, onChange: setYoutubeUrl, placeholder: 'https://youtube.com/...' },
    { label: 'Facebook', value: facebookUrl, onChange: setFacebookUrl, placeholder: 'https://facebook.com/...' },
    { label: 'Instagram', value: instagramUrl, onChange: setInstagramUrl, placeholder: 'https://instagram.com/...' },
    { label: 'X (Twitter)', value: xUrl, onChange: setXUrl, placeholder: 'https://x.com/...' },
  ]

  return (
    <AdminModal
      isOpen
      onClose={onClose}
      title={`Edit: ${artist.name}`}
      size="lg"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving…' : 'Save'}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <EnrichPanel
          isOpen={showEnrich}
          onToggle={() => setShowEnrich(!showEnrich)}
          html={enrichHtml}
          onHtmlChange={(value) => { setEnrichHtml(value); setEnrichError(null); setEnrichSuccess(false) }}
          onParse={handleEnrich}
          isEnriching={isEnriching}
          error={enrichError}
          success={enrichSuccess}
        />

        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Bio" value={bioSummary} onChange={(e) => setBioSummary(e.target.value)} rows={4} />
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

        <div className="grid grid-cols-2 gap-3">
          {serviceFields.map((field) => (
            <Input
              key={field.label}
              label={field.label}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder={field.placeholder}
            />
          ))}
        </div>

        {safeUrl(artist.lastfm_url) && (
          <a
            href={safeUrl(artist.lastfm_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[12px] text-accent-2 no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 rounded-sm"
          >
            View on Last.fm &rarr;
          </a>
        )}

        {error && <InlineAlert tone="error">{error}</InlineAlert>}
      </div>
    </AdminModal>
  )
}
