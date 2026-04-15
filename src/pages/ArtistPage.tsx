import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { fetchArtist, getArtistImageUrl } from '../lib/api'
import { useSession } from '../lib/auth-client'
import { ArtistBannerSkeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { TabBar } from '../components/ui/TabBar'
import { SetGrid } from '../components/sets/SetGrid'
import { SocialLinks, countSocialLinks } from '../components/ui/SocialLinks'
import NumberFlow from '@number-flow/react'

const TABS = [
  { id: 'home',    label: 'Home',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'sets',    label: 'Live Sets',  icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z' },
  { id: 'bio',     label: 'Biography',  icon: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12' },
]

// Deterministic per-artist gradient from first letter
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #2a1060, #5a20a0)',
  'linear-gradient(135deg, #0a1a50, #1a4090)',
  'linear-gradient(135deg, #0a2820, #1a6050)',
  'linear-gradient(135deg, #301020, #701040)',
  'linear-gradient(135deg, #1a1808, #504010)',
  'linear-gradient(135deg, #280a28, #681068)',
]

function avatarGradient(name: string): string {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
}

export function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [artist, setArtist] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('home')
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
    return <div className="flex items-center justify-center h-full"><p className="text-danger text-sm">{error}</p></div>
  }

  if (isLoading || !artist) {
    return <ArtistBannerSkeleton />
  }

  const tags = Array.isArray(artist.tags) ? artist.tags : []
  const similarArtists = Array.isArray(artist.similar_artists) ? artist.similar_artists : []
  const sets = artist.sets || []
  const bio = showFullBio ? (artist.bio_full || artist.bio_summary) : artist.bio_summary
  const hasLongBio = artist.bio_full && artist.bio_full.length > (artist.bio_summary?.length || 0) + 50

  const hasStats = artist.listeners > 0 || artist.playcount > 0 || sets.length > 0

  return (
    <div>
      {/* ═══ BANNER — 340px cinematic, left gradient for text legibility ═══ */}
      <div className="relative h-[340px] overflow-hidden">
        {artist.background_url ? (
          <img src={artist.background_url} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <img
            src={artist.id ? getArtistImageUrl(artist.id) : '/placeholder1.png'}
            alt=""
            className="w-full h-full object-cover scale-150 blur-[30px] opacity-40"
          />
        )}
        {/* Bottom gradient — fades into page background */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
        {/* Left gradient — ensures name legibility over any photo */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, hsl(var(--b6) / 0.85) 25%, transparent 65%)' }}
        />
      </div>

      {/* ═══ HEADER — overlapping banner ═══ */}
      <div className="relative -mt-[100px] z-10">
        <div className="px-6 lg:px-10">
          <div className="flex items-end gap-5 mb-6">
            {/* Avatar */}
            <div
              className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] rounded-[var(--card-radius)] overflow-hidden flex-shrink-0"
              style={{
                background: avatarGradient(artist.name || 'A'),
                boxShadow: 'var(--subtle-shadow)',
              }}
            >
              <img
                src={artist.id ? getArtistImageUrl(artist.id) : '/placeholder1.png'}
                alt={artist.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder1.png' }}
              />
            </div>

            {/* Name + tags */}
            <div className="pb-2 flex-1 min-w-0">
              <p className="text-sm banner-text mb-1" style={{ color: 'hsl(var(--c3))' }}>Artist</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight banner-text mb-2">
                {artist.name}
              </h1>
              {tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {tags.slice(0, 4).map((tag: string) => <Badge key={tag} variant="tag">{tag}</Badge>)}
                </div>
              )}
            </div>

            {/* Admin edit button */}
            {isAdmin && (
              <div className="pb-2 flex items-end">
                <Link to={`/app/admin?tab=artists&edit=${artist.id}`} className="no-underline">
                  <Button variant="secondary" size="sm">
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ─── Stats bar ─── */}
        {hasStats && (
          <div
            className="flex items-center px-6 lg:px-10"
            style={{
              background: 'hsl(var(--b6) / 0.5)',
              borderBottom: '1px solid hsl(var(--b4) / 0.3)',
              borderTop: '1px solid hsl(var(--b4) / 0.15)',
            }}
          >
            {artist.listeners > 0 && (
              <div
                className="py-3 pr-6 mr-6"
                style={{ borderRight: '1px solid hsl(var(--b4) / 0.3)' }}
              >
                <div className="text-lg font-bold" style={{ color: 'hsl(var(--c1))' }}>
                  <NumberFlow value={artist.listeners} format={{ notation: 'compact' }} />
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--c3))' }}>Monthly Listeners</div>
              </div>
            )}
            {artist.playcount > 0 && (
              <div
                className="py-3 pr-6 mr-6"
                style={{ borderRight: sets.length > 0 ? '1px solid hsl(var(--b4) / 0.3)' : 'none' }}
              >
                <div className="text-lg font-bold" style={{ color: 'hsl(var(--c1))' }}>
                  <NumberFlow value={artist.playcount} format={{ notation: 'compact' }} />
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--c3))' }}>Scrobbles</div>
              </div>
            )}
            {sets.length > 0 && (
              <div className="py-3">
                <div className="text-lg font-bold" style={{ color: 'hsl(var(--c1))' }}>
                  <NumberFlow value={sets.length} />
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
                  {sets.length === 1 ? 'Set' : 'Sets'} on Zephyron
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="px-6 lg:px-10">
          <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-6 lg:px-10 py-5">
        <div className="flex flex-col lg:flex-row gap-5">

          {/* MAIN COLUMN */}
          <div className="flex-1 min-w-0">
            <div key={activeTab} style={{ animation: 'tab-enter 0.18s var(--ease-spring) both' }}>

              {/* ── Home tab ── */}
              {activeTab === 'home' && (
                <>
                  {/* About */}
                  {bio && (
                    <div className="card p-5 mb-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--c1))' }}>About</h3>
                        {hasLongBio && (
                          <button
                            onClick={() => setShowFullBio(!showFullBio)}
                            className="text-xs transition-colors"
                            style={{ color: 'hsl(var(--h3))' }}
                          >
                            {showFullBio ? 'show less' : 'read more'}
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--c2))' }}>{bio}</p>
                    </div>
                  )}

                  {/* Live sets */}
                  {sets.length > 0 && (
                    <div className="card p-5 mb-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--c1))' }}>Live Sets</h3>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>
                          {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                        </span>
                      </div>
                      <SetGrid sets={sets} />
                    </div>
                  )}

                  {/* Similar artists — horizontal scroll row */}
                  {similarArtists.length > 0 && (
                    <div className="card p-5 mb-5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'hsl(var(--c3))' }}>
                        Similar Artists
                      </h3>
                      <div
                        className="flex gap-4 overflow-x-auto pb-1"
                        style={{ scrollbarWidth: 'none' }}
                      >
                        {similarArtists.map((sa: { name: string; url: string }) => (
                          <a
                            key={sa.name}
                            href={sa.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 flex flex-col items-center gap-2 no-underline group"
                            style={{ width: 72 }}
                          >
                            <img
                              src="/placeholder1.png"
                              alt={sa.name}
                              className="w-14 h-14 rounded-full object-cover transition-transform group-hover:scale-105"
                              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}
                            />
                            <span
                              className="text-[10px] text-center leading-tight"
                              style={{
                                color: 'hsl(var(--c3))',
                                maxWidth: 64,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {sa.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Live Sets tab ── */}
              {activeTab === 'sets' && (
                sets.length > 0 ? (
                  <div className="card p-5 mb-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--c1))' }}>Live Sets</h3>
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>
                        {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                      </span>
                    </div>
                    <SetGrid sets={sets} />
                  </div>
                ) : (
                  <div className="card p-8 text-center">
                    <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
                      No sets from {artist.name} on Zephyron yet.
                    </p>
                  </div>
                )
              )}

              {/* ── Biography tab ── */}
              {activeTab === 'bio' && (
                <>
                  {bio && (
                    <div className="card p-5 mb-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--c1))' }}>Biography</h3>
                        {hasLongBio && (
                          <button
                            onClick={() => setShowFullBio(!showFullBio)}
                            className="text-xs transition-colors"
                            style={{ color: 'hsl(var(--h3))' }}
                          >
                            {showFullBio ? 'show less' : 'read more'}
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--c2))' }}>{bio}</p>
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div className="card p-5 mb-5">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--c1))' }}>Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag: string) => <Badge key={tag} variant="tag">{tag}</Badge>)}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:w-[300px] xl:w-[340px] shrink-0 space-y-5">
            {countSocialLinks(artist, ['music']) > 0 && (
              <div className="card p-5">
                <SocialLinks data={artist} categories={['music']} heading="FIND ON" />
              </div>
            )}
            {countSocialLinks(artist, ['social']) > 0 && (
              <div className="card p-5">
                <SocialLinks data={artist} categories={['social']} heading="SOCIAL" />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
