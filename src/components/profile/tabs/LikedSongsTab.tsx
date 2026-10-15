import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { FiExternalLink, FiHeart, FiMusic } from 'react-icons/fi'
import { Button, Card } from '../../bleh'
import { Skeleton } from '../../ui/Skeleton'
import { LikeButton } from '../../ui/LikeButton'
import { ServiceIconLink, getAvailableServices } from '../../../lib/services'
import { fetchLikedSongs, getSongCoverUrl } from '../../../lib/api'
import type { Song } from '../../../lib/types'

export type LikedSong = Song & {
  liked_at: string
  like_count: number
  set_id: string | null
}

const LIKED_SONGS_PAGE_SIZE = 50

interface LikedSongsTabProps {
  page: number
  onPageChange: (page: number) => void
  total: number
  onTotalChange: (total: number) => void
}

export function LikedSongsTab({ page, onPageChange, total, onTotalChange }: LikedSongsTabProps) {
  const [songs, setSongs] = useState<LikedSong[]>([])
  const [loading, setLoading] = useState(false)
  const totalPages = Math.ceil(total / LIKED_SONGS_PAGE_SIZE)

  useEffect(() => {
    setLoading(true)
    fetchLikedSongs(page)
      .then((res) => {
        setSongs(res.data as LikedSong[])
        onTotalChange(res.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // onTotalChange is a state setter from the parent; it is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'oklch(var(--h3) / 0.15)' }}
        >
          <FiHeart size={22} style={{ color: 'oklch(var(--h3))' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Liked songs</h2>
          <p className="text-sm text-muted">
            {total} track{total !== 1 ? 's' : ''} you&apos;ve liked
          </p>
        </div>
      </div>

      {loading && songs.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <FiMusic size={48} style={{ color: 'oklch(var(--c3) / 0.3)' }} />
          <h3 className="text-lg font-medium">No liked songs yet</h3>
          <p className="mb-2 text-sm text-muted">
            Like tracks by clicking the heart icon next to any track in a set
          </p>
          <Button label="Browse sets" appearance="primary" to="/" />
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {songs.map((song) => {
              const coverUrl = song.cover_art_r2_key
                ? getSongCoverUrl(song.id)
                : song.cover_art_url || song.lastfm_album_art
              const serviceLinks = getAvailableServices(song as unknown as Record<string, unknown>)

              return (
                <div key={song.id} className="group flex items-center gap-3 rounded-card bg-surface p-3 transition-colors hover:bg-[oklch(var(--b4)/0.3)]">
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg" style={{ background: 'oklch(var(--b4) / 0.4)' }}>
                      <FiMusic size={20} style={{ color: 'oklch(var(--c3) / 0.3)' }} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'oklch(var(--c1))' }}>{song.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="truncate text-xs" style={{ color: 'oklch(var(--c2))' }}>{song.artist}</span>
                      {song.label && (
                        <>
                          <span className="text-[10px]" style={{ color: 'oklch(var(--c3) / 0.4)' }}>·</span>
                          <span className="truncate text-[10px]" style={{ color: 'oklch(var(--c3))' }}>{song.label}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <LikeButton songId={song.id} size={16} showCount initialCount={song.like_count} />

                    {serviceLinks.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {serviceLinks.slice(0, 5).map(({ url, service }) => (
                          <ServiceIconLink key={service.key} url={url} service={service} size={16} />
                        ))}
                      </div>
                    )}

                    {song.set_id && (
                      <Link
                        to={`/sets/${song.set_id}`}
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        title="Go to set"
                        aria-label={`Go to set for ${song.title}`}
                      >
                        <FiExternalLink size={16} style={{ color: 'oklch(var(--c3))' }} />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button label="Previous" size="sm" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))} />
              <span className="px-4 text-sm text-muted">Page {page} of {totalPages}</span>
              <Button label="Next" size="sm" disabled={page === totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
