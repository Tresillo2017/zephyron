import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { fetchArtist } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { SetGrid } from '../components/sets/SetGrid'
import { formatPlayCount } from '../lib/formatTime'

export function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const [artist, setArtist] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullBio, setShowFullBio] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    fetchArtist(id)
      .then((res) => setArtist(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load artist'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (error) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-danger text-sm">{error}</p>
      </div>
    )
  }

  if (isLoading || !artist) {
    return (
      <div className="relative">
        <div className="h-[280px] bg-surface-raised" />
        <div className="px-5 sm:px-8 -mt-20 max-w-5xl mx-auto">
          <div className="flex gap-6">
            <Skeleton className="w-40 h-40 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-8">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tags = Array.isArray(artist.tags) ? artist.tags : []
  const similarArtists = Array.isArray(artist.similar_artists) ? artist.similar_artists : []
  const sets = artist.sets || []
  const bio = showFullBio ? (artist.bio_full || artist.bio_summary) : artist.bio_summary
  const hasLongBio = artist.bio_full && artist.bio_full.length > (artist.bio_summary?.length || 0) + 50

  return (
    <div>
      {/* Hero banner — YouTube video frame background, fallback to blurred artist image */}
      <div className="relative h-[280px] sm:h-[340px] overflow-hidden">
        {artist.background_url ? (
          <>
            <img src={artist.background_url} alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-surface/50 via-surface/70 to-surface" />
          </>
        ) : artist.image_url ? (
          <>
            <img src={artist.image_url} alt="" className="w-full h-full object-cover scale-110 blur-[40px] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-surface/70 to-surface" />
          </>
        ) : (
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />
          </div>
        )}
      </div>

      {/* Content overlapping the hero */}
      <div className="px-5 sm:px-8 max-w-5xl mx-auto -mt-28 sm:-mt-32 relative z-10">

        {/* Header: image + info side by side */}
        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          {/* Artist image — square with rounded corners, not circle */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg overflow-hidden flex-shrink-0 bg-surface-overlay shadow-2xl border border-border/50">
            {artist.image_url ? (
              <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-surface-overlay">
                <span className="text-4xl font-bold text-text-muted/30">{artist.name?.charAt(0)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <p className="text-[10px] font-mono text-accent tracking-wider mb-2">ARTIST</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight mb-3">{artist.name}</h1>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="muted">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Stats — as distinct items */}
            <div className="flex items-center gap-5 text-sm">
              {artist.listeners > 0 && (
                <div>
                  <span className="font-semibold text-text-primary">{formatPlayCount(artist.listeners)}</span>
                  <span className="text-text-muted ml-1">listeners</span>
                </div>
              )}
              {artist.playcount > 0 && (
                <div>
                  <span className="font-semibold text-text-primary">{formatPlayCount(artist.playcount)}</span>
                  <span className="text-text-muted ml-1">plays</span>
                </div>
              )}
              {sets.length > 0 && (
                <div>
                  <span className="font-semibold text-text-primary">{sets.length}</span>
                  <span className="text-text-muted ml-1">{sets.length === 1 ? 'set' : 'sets'} on Zephyron</span>
                </div>
              )}
            </div>

            {/* External link */}
            {artist.lastfm_url && (
              <a
                href={artist.lastfm_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:text-accent-hover transition-colors mt-3 inline-flex items-center gap-1 no-underline"
              >
                View on Last.fm
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Two-column layout for bio + similar artists */}
        {(bio || similarArtists.length > 0) && (
          <div className="flex flex-col lg:flex-row gap-10 mb-12">
            {/* Bio */}
            {bio && (
              <div className="flex-1">
                <p className="text-[10px] font-mono text-text-muted tracking-wider mb-3">ABOUT</p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {bio}
                </p>
                {hasLongBio && !showFullBio && (
                  <button onClick={() => setShowFullBio(true)} className="text-xs text-accent hover:text-accent-hover transition-colors mt-2">
                    Read more
                  </button>
                )}
                {showFullBio && (
                  <button onClick={() => setShowFullBio(false)} className="text-xs text-accent hover:text-accent-hover transition-colors mt-2">
                    Show less
                  </button>
                )}
              </div>
            )}

            {/* Similar Artists */}
            {similarArtists.length > 0 && (
              <div className="lg:w-[280px] shrink-0">
                <p className="text-[10px] font-mono text-text-muted tracking-wider mb-3">SIMILAR ARTISTS</p>
                <div className="space-y-1">
                  {similarArtists.map((sa: { name: string; url: string }) => (
                    <a
                      key={sa.name}
                      href={sa.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors no-underline group"
                    >
                      <div className="w-8 h-8 bg-surface-overlay rounded-full flex items-center justify-center text-text-muted text-xs font-bold shrink-0">
                        {sa.name.charAt(0)}
                      </div>
                      <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors truncate">{sa.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-border via-border-light to-border mb-10" />

        {/* Sets on Zephyron */}
        <div className="pb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-mono text-text-muted tracking-wider mb-1">LIVE SETS</p>
              <h2 className="text-lg font-semibold text-text-primary">Sets on Zephyron</h2>
            </div>
            {sets.length > 0 && (
              <span className="text-xs font-mono text-text-muted tabular-nums">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>
            )}
          </div>
          {sets.length > 0 ? (
            <SetGrid sets={sets} />
          ) : (
            <div className="text-center py-16 border border-border rounded-xl">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-surface-raised border border-border flex items-center justify-center">
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-1">No sets yet</p>
              <p className="text-text-muted text-xs">Sets from {artist.name} will appear here when added.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
