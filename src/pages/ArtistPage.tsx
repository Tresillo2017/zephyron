import { useState, useEffect, type SyntheticEvent } from 'react'
import { useParams } from 'react-router'
import { fetchArtist, getArtistImageUrl } from '../lib/api'
import { useSession } from '../lib/auth-client'
import { getPlaceholder } from '../lib/placeholders'
import { ArtistBannerSkeleton } from '../components/ui/Skeleton'
import { FollowButton } from '../components/artists/FollowButton'
import { SetGrid } from '../components/sets/SetGrid'
import { SocialLinks, countSocialLinks } from '../components/ui/SocialLinks'
import { Badge, Button, ContentCard } from '../components/bleh'
import { PageFrame } from '../components/shell'
import { DetailHero } from '../components/detail/DetailHero'
import { DetailTabs, type DetailTab } from '../components/detail/DetailTabs'
import { DetailCard } from '../components/detail/DetailCard'
import { StatStrip, type StatItem } from '../components/detail/StatStrip'
import { Home1Filled, HeadphoneFilled, FileFilled, EditFilled } from '@mingcute/react/core-filled'
import NumberFlow from '@number-flow/react'
import '../components/detail/detail.css'

type ArtistTab = 'home' | 'sets' | 'bio'

const TABS: DetailTab<ArtistTab>[] = [
  { id: 'home', label: 'Home', icon: Home1Filled },
  { id: 'sets', label: 'Live Sets', icon: HeadphoneFilled },
  { id: 'bio', label: 'Biography', icon: FileFilled },
]

function onImageError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = getPlaceholder('square')
}

export function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [artist, setArtist] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ArtistTab>('home')
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
    return <div className="flex items-center justify-center h-full"><p className="dt-error">{error}</p></div>
  }

  if (isLoading || !artist) {
    return <ArtistBannerSkeleton />
  }

  const tags: string[] = Array.isArray(artist.tags) ? artist.tags : []
  const similarArtists: { name: string; url: string }[] = Array.isArray(artist.similar_artists) ? artist.similar_artists : []
  const sets = artist.sets || []
  const bio = showFullBio ? (artist.bio_full || artist.bio_summary) : artist.bio_summary
  const hasLongBio = artist.bio_full && artist.bio_full.length > (artist.bio_summary?.length || 0) + 50
  const hasStats = artist.listeners > 0 || artist.playcount > 0 || sets.length > 0
  const hasMusicLinks = countSocialLinks(artist, ['music']) > 0
  const hasSocialLinks = countSocialLinks(artist, ['social']) > 0

  const bioToggle = hasLongBio && (
    <button type="button" className="dt-link-btn" onClick={() => setShowFullBio(!showFullBio)}>
      {showFullBio ? 'show less' : 'read more'}
    </button>
  )

  const statItems: StatItem[] = [
    ...(artist.listeners > 0
      ? [{ key: 'listeners', value: <NumberFlow value={artist.listeners} format={{ notation: 'compact' }} />, label: 'Monthly Listeners' }]
      : []),
    ...(artist.playcount > 0
      ? [{ key: 'scrobbles', value: <NumberFlow value={artist.playcount} format={{ notation: 'compact' }} />, label: 'Scrobbles' }]
      : []),
    ...(sets.length > 0
      ? [{ key: 'sets', value: <NumberFlow value={sets.length} />, label: `${sets.length === 1 ? 'Set' : 'Sets'} on Zephyron` }]
      : []),
  ]

  const setsCard = (
    <DetailCard
      title="Live Sets"
      action={<span className="dt-mono-count">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>}
    >
      <SetGrid sets={sets} />
    </DetailCard>
  )

  const renderMain = () => {
    if (activeTab === 'home') {
      return (
        <>
          {bio && (
            <DetailCard title="About" action={bioToggle}>
              <p className="dt-prose">{bio}</p>
            </DetailCard>
          )}
          {sets.length > 0 && setsCard}
          {similarArtists.length > 0 && (
            <DetailCard title="Similar Artists">
              <div className="dt-similar">
                {similarArtists.map((sa) => (
                  <a key={sa.name} href={sa.url} target="_blank" rel="noopener noreferrer" className="dt-similar-item">
                    <img
                      src={getPlaceholder('circle')}
                      alt={sa.name}
                      className="dt-similar-avatar"
                      onError={(e) => { e.currentTarget.src = getPlaceholder('circle') }}
                    />
                    <span className="dt-similar-name">{sa.name}</span>
                  </a>
                ))}
              </div>
            </DetailCard>
          )}
        </>
      )
    }

    if (activeTab === 'sets') {
      return sets.length > 0 ? (
        setsCard
      ) : (
        <div className="dt-empty-card">
          <p>No sets from {artist.name} on Zephyron yet.</p>
        </div>
      )
    }

    return (
      <>
        {bio && (
          <DetailCard title="Biography" action={bioToggle}>
            <p className="dt-prose">{bio}</p>
          </DetailCard>
        )}
        {tags.length > 0 && (
          <DetailCard title="Tags">
            <div className="dt-tags">
              {tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
            </div>
          </DetailCard>
        )}
      </>
    )
  }

  const side = hasMusicLinks || hasSocialLinks ? (
    <div className="dt-side">
      {hasMusicLinks && (
        <div className="dt-about">
          <SocialLinks data={artist} categories={['music']} heading="FIND ON" />
        </div>
      )}
      {hasSocialLinks && (
        <div className="dt-about">
          <SocialLinks data={artist} categories={['social']} heading="SOCIAL" />
        </div>
      )}
    </div>
  ) : undefined

  return (
    <>
      <DetailHero
        artShape="avatar"
        media={
          artist.background_url ? (
            <img
              src={artist.background_url}
              alt=""
              className="dt-hero-media"
              onError={onImageError}
            />
          ) : (
            <img
              src={artist.id ? getArtistImageUrl(artist.id) : getPlaceholder('square')}
              alt=""
              className="dt-hero-media"
              data-dim=""
              onError={onImageError}
            />
          )
        }
        art={
          <img
            src={artist.id ? getArtistImageUrl(artist.id) : getPlaceholder('square')}
            alt={artist.name}
            onError={onImageError}
          />
        }
        eyebrow="Artist"
        title={artist.name}
        meta={tags.length > 0 ? (
          <div className="dt-tags">
            {tags.slice(0, 4).map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
        ) : undefined}
        actions={
          <>
            <FollowButton artistId={artist.id} />
            {isAdmin && (
              <Button
                appearance="default"
                size="sm"
                label="Edit"
                to={`/app/admin?tab=artists&edit=${artist.id}`}
                icon={<EditFilled className="dt-ico--sm" aria-hidden="true" />}
              />
            )}
          </>
        }
      />

      <DetailTabs tabs={TABS} active={activeTab} onChange={setActiveTab} label="Artist sections" />

      <PageFrame>
        <ContentCard
          top={hasStats ? <StatStrip items={statItems} label="Artist statistics" /> : undefined}
          main={
            <div key={activeTab} className="dt-main animate-fade">
              {renderMain()}
            </div>
          }
          side={side}
        />
      </PageFrame>
    </>
  )
}
