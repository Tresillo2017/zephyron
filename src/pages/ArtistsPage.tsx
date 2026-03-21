import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { fetchArtists } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'
import { formatPlayCount } from '../lib/formatTime'

export function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchArtists()
      .then((res) => setArtists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="px-6 lg:px-10 py-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Artists</h1>
        <p className="text-sm text-text-muted mb-8">DJs and producers on Zephyron</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <p className="text-[10px] font-mono text-accent tracking-wider mb-2">ARTISTS</p>
      <h1 className="text-2xl font-bold text-text-primary mb-1">Artists</h1>
      <p className="text-sm text-text-muted mb-8">DJs and producers on Zephyron</p>

      {artists.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted text-sm">No artists yet. Artists are created when DJ sets are added and detected.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {artists.map((artist) => {
            const tags = typeof artist.tags === 'string' ? (() => { try { return JSON.parse(artist.tags) } catch { return [] } })() : (artist.tags || [])
            return (
              <Link
                key={artist.id}
                to={`/app/artists/${artist.slug || artist.id}`}
                className="group flex items-center gap-4 px-4 py-4 rounded-xl bg-surface-raised border border-border hover:border-border-light hover:bg-surface-hover transition-all no-underline"
              >
                {/* Artist image */}
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface-overlay">
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/15 to-surface-overlay">
                      <span className="text-lg font-bold text-text-muted/40">{artist.name?.charAt(0)}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">{artist.name}</p>
                  {tags.length > 0 && (
                    <p className="text-xs text-text-muted truncate mt-0.5">{tags.slice(0, 3).join(' · ')}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {artist.listeners > 0 && (
                      <span className="text-[10px] font-mono text-text-muted tabular-nums">{formatPlayCount(artist.listeners)} listeners</span>
                    )}
                    {artist.set_count > 0 && (
                      <span className="text-[10px] font-mono text-text-muted tabular-nums">{artist.set_count} {artist.set_count === 1 ? 'set' : 'sets'}</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
