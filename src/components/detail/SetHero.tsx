import type { ReactNode, SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { ArrowRightFilled, EditFilled } from '@mingcute/react/core-filled'
import { Button } from '../bleh'
import { DetailHero } from './DetailHero'
import type { DjSetWithDetections } from '../../lib/types'
import { getCoverUrl, getVideoPreviewUrl } from '../../lib/api'
import { getPlaceholder } from '../../lib/placeholders'
import type { SetArtist, SetArtistInfo } from './setModel'

interface SetHeroProps {
  set: DjSetWithDetections
  artistInfo: SetArtistInfo | null
  setArtists: SetArtist[]
  /** Badge shown next to "DJ Set" (e.g. "No source" or the external platform). */
  sourceBadge: string | null
  isAdmin: boolean
}

function fallbackOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = getPlaceholder('square')
}

function SetBannerMedia({ set }: { set: DjSetWithDetections }) {
  if (set.video_preview_r2_key) {
    return (
      <video
        src={getVideoPreviewUrl(set.id)}
        autoPlay
        muted
        loop
        playsInline
        className="dt-hero-media"
        poster={set.cover_image_r2_key ? getCoverUrl(set.id) : undefined}
      />
    )
  }
  if (set.cover_image_r2_key) {
    return <img src={getCoverUrl(set.id)} alt="" className="dt-hero-media" />
  }
  return <img src={getPlaceholder('square')} alt="" className="dt-hero-media" data-dim="" />
}

function ArtistLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="dt-artist-link">
      {children}
      <ArrowRightFilled className="dt-chev" aria-hidden="true" />
    </Link>
  )
}

function SetArtistLine({ set, artistInfo, setArtists }: Pick<SetHeroProps, 'set' | 'artistInfo' | 'setArtists'>) {
  if (setArtists.length > 1) {
    return (
      <div className="dt-artist-line">
        {setArtists.map((a, i) => (
          <span key={a.id} className="dt-artist-item">
            <ArtistLink to={`/app/artists/${a.slug || a.id}`}>{a.name}</ArtistLink>
            {i < setArtists.length - 1 && <span className="dt-amp">&amp;</span>}
          </span>
        ))}
      </div>
    )
  }
  if (artistInfo) {
    return <ArtistLink to={`/app/artists/${artistInfo.slug || artistInfo.id}`}>{set.artist}</ArtistLink>
  }
  return <p className="dt-artist-line">{set.artist}</p>
}

/** Banner, overlapping cover art, title, artist line and the admin edit action. */
export function SetHero({ set, artistInfo, setArtists, sourceBadge, isAdmin }: SetHeroProps) {
  return (
    <DetailHero
      media={<SetBannerMedia set={set} />}
      art={
        set.cover_image_r2_key ? (
          <img src={getCoverUrl(set.id)} alt={set.title} onError={fallbackOnError} />
        ) : (
          <img src={getPlaceholder('square')} alt="" data-dim="" />
        )
      }
      eyebrow={
        <span className="dt-hero-badges">
          <span>DJ Set</span>
          {sourceBadge && <span className="dt-chip">{sourceBadge}</span>}
        </span>
      }
      title={set.title}
      meta={<SetArtistLine set={set} artistInfo={artistInfo} setArtists={setArtists} />}
      actions={
        isAdmin && (
          <Button
            appearance="default"
            size="sm"
            label="Edit"
            to={`/app/admin?tab=sets&edit=${set.id}`}
            icon={<EditFilled className="dt-ico--sm" aria-hidden="true" />}
          />
        )
      }
    />
  )
}
