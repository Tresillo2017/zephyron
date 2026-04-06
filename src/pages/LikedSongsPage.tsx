import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { FiHeart, FiMusic, FiExternalLink } from 'react-icons/fi'
import { fetchLikedSongs, getSongCoverUrl } from '../lib/api'
import { getAvailableServices, ServiceIconLink } from '../lib/services'
import { useSession } from '../lib/auth-client'
import { Skeleton } from '../components/ui/Skeleton'
import { LikeButton } from '../components/ui/LikeButton'
import type { Song } from '../lib/types'

type LikedSong = Song & {
  liked_at: string
  like_count: number
  set_id: string | null
}

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

  const pageSize = 50
  const totalPages = Math.ceil(total / pageSize)

  // Not logged in
  if (!session?.user) {
    return (
      <div className="px-6 lg:px-10 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="card text-center py-16">
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'hsl(var(--h3) / 0.1)' }}
              >
                <FiHeart size={28} style={{ color: 'hsl(var(--h3))' }} />
              </div>
            </div>
            <h2
              className="text-xl mb-2"
              style={{
                color: 'hsl(var(--c1))',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              Sign in to see your liked songs
            </h2>
            <p className="text-sm mb-6" style={{ color: 'hsl(var(--c3))' }}>
              Like tracks as you discover them to build your personal collection
            </p>
            <Link to="/login" className="button-primary inline-flex items-center gap-2">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading && songs.length === 0) {
    return (
      <div className="px-6 lg:px-10 py-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-10 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'hsl(var(--h3) / 0.15)' }}
          >
            <FiHeart size={22} style={{ color: 'hsl(var(--h3))' }} />
          </div>
          <div>
            <h1
              className="text-2xl"
              style={{
                color: 'hsl(var(--c1))',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              Liked Songs
            </h1>
            <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
              {total} track{total !== 1 ? 's' : ''} you've liked
            </p>
          </div>
        </div>

        {/* Empty state */}
        {songs.length === 0 ? (
          <div className="card text-center py-16">
            <div className="flex justify-center mb-4">
              <FiMusic size={48} style={{ color: 'hsl(var(--c3) / 0.3)' }} />
            </div>
            <h2
              className="text-lg mb-2"
              style={{
                color: 'hsl(var(--c1))',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              No liked songs yet
            </h2>
            <p className="text-sm mb-6" style={{ color: 'hsl(var(--c3))' }}>
              Like tracks by clicking the heart icon next to any track in a set
            </p>
            <Link to="/" className="button-primary inline-flex items-center gap-2">
              Browse Sets
            </Link>
          </div>
        ) : (
          <>
            {/* Song list */}
            <div className="space-y-2">
              {songs.map((song) => {
                const coverUrl = song.cover_art_r2_key
                  ? getSongCoverUrl(song.id)
                  : song.cover_art_url || song.lastfm_album_art
                const serviceLinks = getAvailableServices(song as unknown as Record<string, unknown>)

                return (
                  <div key={song.id} className="card !p-3 group hover:bg-[hsl(var(--b4)/0.3)] transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Cover art */}
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center"
                          style={{ background: 'hsl(var(--b4) / 0.4)' }}
                        >
                          <FiMusic size={20} style={{ color: 'hsl(var(--c3) / 0.3)' }} />
                        </div>
                      )}

                      {/* Track info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm truncate"
                          style={{
                            color: 'hsl(var(--c1))',
                            fontWeight: 'var(--font-weight-medium)',
                          }}
                        >
                          {song.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs truncate" style={{ color: 'hsl(var(--c2))' }}>
                            {song.artist}
                          </span>
                          {song.label && (
                            <>
                              <span className="text-[10px]" style={{ color: 'hsl(var(--c3) / 0.4)' }}>
                                ·
                              </span>
                              <span className="text-[10px] truncate" style={{ color: 'hsl(var(--c3))' }}>
                                {song.label}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Like button */}
                        <LikeButton songId={song.id} size={16} showCount initialCount={song.like_count} />

                        {/* Service links */}
                        {serviceLinks.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {serviceLinks.slice(0, 5).map(({ url, service }) => (
                              <ServiceIconLink key={service.key} url={url} service={service} size={16} />
                            ))}
                          </div>
                        )}

                        {/* Go to set */}
                        {song.set_id && (
                          <Link
                            to={`/sets/${song.set_id}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Go to set"
                          >
                            <FiExternalLink size={16} style={{ color: 'hsl(var(--c3))' }} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="button-secondary"
                  style={{ opacity: page === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <span className="text-sm px-4" style={{ color: 'hsl(var(--c3))' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="button-secondary"
                  style={{ opacity: page === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
