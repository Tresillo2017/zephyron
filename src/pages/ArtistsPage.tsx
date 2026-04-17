import { useState, useEffect, useMemo, memo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { fetchArtists, getArtistImageUrl } from '../lib/api'
import { getPlaceholder } from '../lib/placeholders'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { formatPlayCount } from '../lib/formatTime'

const ARTISTS_PER_PAGE = 24

// Memoized artist card component
const ArtistCard = memo(({ artist }: { artist: any }) => {
  const tags = useMemo(() => {
    return typeof artist.tags === 'string'
      ? (() => { try { return JSON.parse(artist.tags) } catch { return [] } })()
      : (artist.tags || [])
  }, [artist.tags])

  return (
    <Link
      to={`/app/artists/${artist.slug || artist.id}`}
      className="group flex items-center gap-4 px-4 py-4 rounded-[var(--card-radius)] no-underline transition-all"
      style={{
        background: 'hsl(var(--b5))',
        boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25), 0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Artist image */}
      <div
        className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
        style={{
          background: 'hsl(var(--b4) / 0.3)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {artist.id ? (
          <img
            src={getArtistImageUrl(artist.id)}
            alt={artist.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
          />
        ) : (
          <img
            src={getPlaceholder('square')}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-[var(--font-weight-medium)] truncate transition-colors"
          style={{ color: 'hsl(var(--c1))' }}
        >
          {artist.name}
        </p>
        {tags.length > 0 && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
            {tags.slice(0, 3).join(' · ')}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {artist.listeners > 0 && (
            <span className="text-[10px] font-mono tabular-nums" style={{ color: 'hsl(var(--c3))' }}>
              {formatPlayCount(artist.listeners)} listeners
            </span>
          )}
          {artist.set_count > 0 && (
            <span className="text-[10px] font-mono tabular-nums" style={{ color: 'hsl(var(--c2))' }}>
              {artist.set_count} {artist.set_count === 1 ? 'set' : 'sets'}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <svg className="w-4 h-4 shrink-0 transition-colors" style={{ color: 'hsl(var(--c3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
})

ArtistCard.displayName = 'ArtistCard'

export function ArtistsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const pageParam = parseInt(searchParams.get('page') || '1')

  const [artists, setArtists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(pageParam)

  useEffect(() => {
    fetchArtists()
      .then((res) => setArtists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const totalPages = Math.ceil(artists.length / ARTISTS_PER_PAGE)
  const paginatedArtists = useMemo(() => {
    const start = (currentPage - 1) * ARTISTS_PER_PAGE
    return artists.slice(start, start + ARTISTS_PER_PAGE)
  }, [artists, currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSearchParams({ page: page.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="px-6 lg:px-10 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-[var(--font-weight-bold)] mb-1" style={{ color: 'hsl(var(--c1))' }}>
            Artists
          </h1>
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            DJs and producers on Zephyron
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--card-radius)]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-[var(--font-weight-bold)] mb-1"
          style={{ color: 'hsl(var(--c1))' }}
        >
          Artists
        </h1>
        <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
          {artists.length > 0 ? `${artists.length} DJs and producers` : 'DJs and producers on Zephyron'}
        </p>
      </div>

      {artists.length === 0 ? (
        <div className="card text-center py-20">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center"
            style={{
              background: 'hsl(var(--b4) / 0.3)',
              boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)',
            }}
          >
            <svg className="w-6 h-6" style={{ color: 'hsl(var(--c3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            No artists yet. Artists are created when DJ sets are added and detected.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-12">
              <Button
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                ← Previous
              </Button>
              <span className="text-sm font-mono tabular-nums px-4" style={{ color: 'hsl(var(--c2))' }}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
