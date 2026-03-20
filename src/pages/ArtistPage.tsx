import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { fetchArtist } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { TabBar } from '../components/ui/TabBar'
import { SetGrid } from '../components/sets/SetGrid'
import { formatPlayCount } from '../lib/formatTime'

const TABS = [
  { id: 'home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'sets', label: 'Live Sets', icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z' },
  { id: 'bio', label: 'Biography', icon: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12' },
  { id: 'similar', label: 'Similar Artists', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
]

export function ArtistPage() {
  const { id } = useParams<{ id: string }>()
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
    return (
      <div>
        <div className="h-[280px] bg-surface-raised" />
        <div className="px-6 -mt-24 relative z-10 max-w-[1300px] mx-auto">
          <div className="flex gap-6">
            <Skeleton className="w-[180px] h-[180px] rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-16">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
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
      {/* ═══ BANNER — full photo, minimal gradient ═══ */}
      <div className="relative h-[280px] overflow-hidden">
        {artist.background_url ? (
          <img src={artist.background_url} alt="" className="w-full h-full object-cover object-top" />
        ) : artist.image_url ? (
          <img src={artist.image_url} alt="" className="w-full h-full object-cover scale-150 blur-[30px] opacity-40" />
        ) : (
          <div className="w-full h-full bg-surface-raised" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
      </div>

      {/* ═══ HEADER — overlapping banner ═══ */}
      <div className="relative -mt-[100px] z-10">
        <div className="px-6 lg:px-10">
          <div className="flex items-end gap-5 mb-5">
            <div className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] rounded-[var(--card-radius)] overflow-hidden flex-shrink-0 bg-surface-overlay"
              style={{ boxShadow: 'var(--subtle-shadow)' }}>
              {artist.image_url ? (
                <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/15 to-surface-overlay">
                  <span className="text-5xl font-bold text-text-muted/30">{artist.name?.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="pb-2">
              <p className="text-sm text-text-secondary banner-text mb-1">Artist</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary leading-tight banner-text">{artist.name}</h1>
            </div>
          </div>
        </div>

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

            {/* Home tab or Bio tab */}
            {(activeTab === 'home' || activeTab === 'bio') && (
              <>
                {/* About */}
                {bio && (
                  <div className="card p-5 mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-text-primary">About</h3>
                      {hasLongBio && (
                        <button onClick={() => setShowFullBio(!showFullBio)} className="text-xs text-accent hover:text-accent-hover transition-colors">
                          {showFullBio ? 'show less' : 'read more'}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{bio}</p>
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="card p-5 mb-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag: string) => (
                        <Badge key={tag} variant="tag">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Sets tab or Home tab */}
            {(activeTab === 'home' || activeTab === 'sets') && sets.length > 0 && (
              <div className="card p-5 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">Live Sets on Zephyron</h3>
                  <span className="text-xs text-text-muted font-mono">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>
                </div>
                <SetGrid sets={sets} />
              </div>
            )}

            {/* Similar Artists tab */}
            {activeTab === 'similar' && similarArtists.length > 0 && (
              <div className="card p-5 mb-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Similar Artists</h3>
                <div className="space-y-1">
                  {similarArtists.map((sa: { name: string; url: string }) => (
                    <a
                      key={sa.name}
                      href={sa.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors no-underline"
                    >
                      <div className="w-10 h-10 bg-surface-overlay rounded-lg flex items-center justify-center text-text-muted text-sm font-bold shrink-0">
                        {sa.name.charAt(0)}
                      </div>
                      <span className="text-sm text-text-secondary hover:text-text-primary transition-colors">{sa.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for tabs with no content */}
            {activeTab === 'sets' && sets.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-text-muted text-sm">No sets from {artist.name} on Zephyron yet.</p>
              </div>
            )}
            {activeTab === 'similar' && similarArtists.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-text-muted text-sm">No similar artist data available.</p>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="lg:w-[300px] xl:w-[340px] shrink-0 space-y-5">

            {/* Stats */}
            <div className="card p-5">
              <div className="flex gap-6">
                {artist.listeners > 0 && (
                  <div className="stat-block">
                    <span className="stat-value">{formatPlayCount(artist.listeners)}</span>
                    <span className="stat-label">Listeners</span>
                  </div>
                )}
                {artist.playcount > 0 && (
                  <div className="stat-block">
                    <span className="stat-value">{formatPlayCount(artist.playcount)}</span>
                    <span className="stat-label">Scrobbles</span>
                  </div>
                )}
                {sets.length > 0 && (
                  <div className="stat-block">
                    <span className="stat-value">{sets.length}</span>
                    <span className="stat-label">{sets.length === 1 ? 'Set' : 'Sets'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* External links */}
            {artist.lastfm_url && (
              <div className="card p-5">
                <h3 className="text-xs text-text-muted mb-3">Find on</h3>
                <div className="flex flex-wrap gap-2">
                  <a href={artist.lastfm_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors no-underline shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]">
                    Last.fm
                  </a>
                </div>
              </div>
            )}

            {/* Tags (also in sidebar for quick reference) */}
            {tags.length > 0 && activeTab !== 'home' && (
              <div className="card p-5">
                <h3 className="text-xs text-text-muted mb-3">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, 6).map((tag: string) => (
                    <Badge key={tag} variant="tag">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
