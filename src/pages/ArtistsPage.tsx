import { useState, useEffect, useMemo, memo, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { RightFilled, UserStarFilled } from '@mingcute/react/core-filled'
import { fetchArtists, getArtistImageUrl } from '../lib/api'
import { getPlaceholder } from '../lib/placeholders'
import { formatPlayCount } from '../lib/formatTime'
import { ContentCard, EmptyState, Pagination, Section, Skeleton, Toolbar } from '../components/bleh'
import { PageFrame } from '../components/shell'
import './library.css'

const ARTISTS_PER_PAGE = 24
const SKELETON_COUNT = 12
const MAX_STAGGER = 12
const STAGGER_MS = 30

interface ArtistRow {
  id: string
  name: string
  slug?: string | null
  tags?: string | string[] | null
  listeners?: number
  set_count?: number
}

function parseTags(tags: ArtistRow['tags']): string[] {
  if (Array.isArray(tags)) return tags
  if (typeof tags !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

const ArtistTile = memo(function ArtistTile({ artist }: { artist: ArtistRow }) {
  const tags = useMemo(() => parseTags(artist.tags), [artist.tags])

  return (
    <Link to={`/app/artists/${artist.slug || artist.id}`} className="zl-tile">
      <div className="zl-tile-avatar">
        <img
          src={getArtistImageUrl(artist.id)}
          alt=""
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
        />
      </div>
      <div className="zl-tile-main">
        <span className="zl-tile-title">{artist.name}</span>
        {tags.length > 0 && <span className="zl-tile-sub">{tags.slice(0, 3).join(' · ')}</span>}
        <div className="zl-tile-stats">
          {(artist.listeners ?? 0) > 0 && <span><strong>{formatPlayCount(artist.listeners ?? 0)}</strong> listeners</span>}
          {(artist.set_count ?? 0) > 0 && (
            <span>{artist.set_count} {artist.set_count === 1 ? 'set' : 'sets'}</span>
          )}
        </div>
      </div>
      <span className="zl-tile-chev" aria-hidden="true"><RightFilled /></span>
    </Link>
  )
})

ArtistTile.displayName = 'ArtistTile'

function ArtistsSkeleton() {
  return (
    <ul className="zl-tiles" role="status" aria-label="Loading artists">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <li key={i} className="zl-tile-cell">
          <Skeleton height={80} borderRadius="var(--card-radius)" />
        </li>
      ))}
    </ul>
  )
}

export function ArtistsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const pageParam = parseInt(searchParams.get('page') || '1')

  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(pageParam)

  useEffect(() => {
    fetchArtists()
      .then((res) => setArtists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const paginatedArtists = useMemo(() => {
    const start = (currentPage - 1) * ARTISTS_PER_PAGE
    return artists.slice(start, start + ARTISTS_PER_PAGE)
  }, [artists, currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSearchParams({ page: page.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasArtists = artists.length > 0

  let body
  if (isLoading) {
    body = <ArtistsSkeleton />
  } else if (!hasArtists) {
    body = (
      <EmptyState
        icon={<UserStarFilled />}
        title="No artists yet"
        description="Artists are created when DJ sets are added and detected."
      />
    )
  } else {
    body = (
      <>
        <ul className="zl-tiles">
          {paginatedArtists.map((artist, i) => (
            <li
              key={artist.id}
              className="zl-tile-cell animate-grid"
              style={{ '--delay': `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms` } as CSSProperties}
            >
              <ArtistTile artist={artist} />
            </li>
          ))}
        </ul>
        <Pagination
          page={currentPage - 1}
          pageSize={ARTISTS_PER_PAGE}
          total={artists.length}
          onChange={(page) => handlePageChange(page + 1)}
        />
      </>
    )
  }

  return (
    <PageFrame>
      <ContentCard
        toolbar={
          <Toolbar>
            <h1 className="zl-toolbar-title">Artists</h1>
            {hasArtists && <span className="zl-toolbar-meta">{artists.length} DJs and producers</span>}
          </Toolbar>
        }
        main={<Section>{body}</Section>}
      />
    </PageFrame>
  )
}
