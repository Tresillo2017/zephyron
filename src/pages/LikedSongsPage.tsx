import { useState, useEffect, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ExternalLinkFilled, HeartFilled, MusicFilled } from '@mingcute/react/core-filled'
import { fetchLikedSongs, getSongCoverUrl } from '../lib/api'
import { getAvailableServices, ServiceIconLink } from '../lib/services'
import { useSession } from '../lib/auth-client'
import { LikeButton } from '../components/ui/LikeButton'
import { Button, ContentCard, EmptyState, Pagination, Section, Skeleton, Toolbar } from '../components/bleh'
import { PageFrame } from '../components/shell'
import type { Song } from '../lib/types'
import './library.css'

type LikedSong = Song & {
  liked_at: string
  like_count: number
  set_id: string | null
}

const PAGE_SIZE = 50
const SKELETON_ROWS = 10
const MAX_STAGGER = 12
const STAGGER_MS = 30

export function LikedSongsPage() {
  const { data: session } = useSession()
  const [songs, setSongs] = useState<LikedSong[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchLikedSongs(page)
      .then(res => {
        setSongs(res.data as LikedSong[])
        setTotal(res.total)
      })
      .catch(err => {
        console.error('Failed to fetch liked songs:', err)
      })
      .finally(() => setLoading(false))
  }, [session, page])

  // Not logged in
  if (!session?.user) {
    return (
      <PageFrame>
        <ContentCard
          main={
            <Section>
              <EmptyState
                icon={<HeartFilled />}
                title="Sign in to see your liked songs"
                description="Like tracks as you discover them to build your personal collection."
                action={<Button appearance="primary" to="/login" label="Sign in" />}
              />
            </Section>
          }
        />
      </PageFrame>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  let body
  if (loading && songs.length === 0) {
    body = (
      <div className="zl-body" role="status" aria-label="Loading liked songs">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <Skeleton key={i} height={60} borderRadius="var(--card-radius)" />
        ))}
      </div>
    )
  } else if (songs.length === 0) {
    body = (
      <EmptyState
        icon={<MusicFilled />}
        title="No liked songs yet"
        description="Like tracks by clicking the heart icon next to any track in a set."
        action={<Button appearance="primary" to="/app/browse" label="Browse sets" />}
      />
    )
  } else {
    body = (
      <>
        <div className="zl-rows">
          {songs.map((song, index) => {
            const coverUrl = song.cover_art_r2_key
              ? getSongCoverUrl(song.id)
              : song.cover_art_url || song.lastfm_album_art
            const serviceLinks = getAvailableServices(song as unknown as Record<string, unknown>)

            return (
              <div
                key={song.id}
                className="zl-row animate-item"
                style={{ '--delay': `${Math.min(index, MAX_STAGGER) * STAGGER_MS}ms` } as CSSProperties}
              >
                {coverUrl ? (
                  <span className="zl-row-thumb">
                    <img src={coverUrl} alt="" loading="lazy" />
                  </span>
                ) : (
                  <span className="zl-row-thumb" aria-hidden="true"><MusicFilled /></span>
                )}

                <div className="zl-row-main">
                  <span className="zl-row-title">{song.title}</span>
                  <span className="zl-row-sub zl-row-line">
                    <span className="zl-row-ellipsis">{song.artist}</span>
                    {song.label && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="zl-row-ellipsis">{song.label}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="zl-row-end zl-row-end--inline">
                  <LikeButton songId={song.id} size={16} showCount initialCount={song.like_count} />
                  {serviceLinks.length > 0 && (
                    <span className="zl-row-end zl-row-end--inline">
                      {serviceLinks.slice(0, 5).map(({ url, service }) => (
                        <ServiceIconLink key={service.key} url={url} service={service} size={16} />
                      ))}
                    </span>
                  )}
                  {song.set_id && (
                    <Link to={`/app/sets/${song.set_id}`} className="zl-round" aria-label={`Go to set ${song.title}`} title="Go to set">
                      <ExternalLinkFilled />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <Pagination
          page={page - 1}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={(p) => setPage(p + 1)}
        />
      </>
    )
  }

  return (
    <PageFrame>
      <ContentCard
        toolbar={
          <Toolbar>
            <h1 className="zl-toolbar-title">Liked songs</h1>
            <span className="zl-toolbar-meta">
              {total} track{total !== 1 ? 's' : ''} you&apos;ve liked
              {totalPages > 1 && ` · page ${page} of ${totalPages}`}
            </span>
          </Toolbar>
        }
        main={<Section>{body}</Section>}
      />
    </PageFrame>
  )
}
