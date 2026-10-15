import type { SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { Badge } from '../bleh'
import { formatDuration, formatPlayCount } from '../../lib/formatTime'
import { getArtistImageUrl, getEventCoverUrl, getEventLogoUrl } from '../../lib/api'
import { getPlaceholder } from '../../lib/placeholders'
import type { DjSetWithDetections } from '../../lib/types'
import type { SetArtistInfo, SetWithSource } from './setModel'

interface SetSidebarProps {
  set: DjSetWithDetections
  artistInfo: SetArtistInfo | null
  artistTags: string[]
}

function fallbackOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = getPlaceholder('square')
}

/** Event banner (linked to the event page) with logo, name and location. */
function EventBanner({ event }: { event: NonNullable<DjSetWithDetections['event_info']> }) {
  return (
    <Link to={`/app/events/${event.slug || event.id}`} className="dt-event">
      {event.cover_image_r2_key ? (
        <img
          src={getEventCoverUrl(event.id)}
          alt={event.name}
          className="dt-event-media"
          loading="lazy"
          onError={fallbackOnError}
        />
      ) : (
        <img src={getPlaceholder('square')} alt="" className="dt-event-media" data-dim="" />
      )}
      <span className="dt-event-scrim" aria-hidden="true" />
      <span className="dt-event-meta">
        {event.logo_r2_key && (
          <span className="dt-event-logo">
            <img src={getEventLogoUrl(event.id)} alt="" loading="lazy" onError={fallbackOnError} />
          </span>
        )}
        <span className="dt-event-text">
          <span className="dt-eyebrow">EVENT</span>
          <span className="dt-event-name">{event.name}</span>
          {event.location && <span className="dt-event-loc">{event.location}</span>}
        </span>
      </span>
    </Link>
  )
}

/** Genre badges, venue / event line and recorded date. */
function SetMetaBlock({ set }: { set: SetWithSource }) {
  const genre = set.genre?.trim()
  const subgenre = set.subgenre?.trim()
  const showEventText = !set.event_info && !!set.event
  return (
    <div className="dt-meta-block">
      <div className="dt-meta-badges">
        {genre && <Badge tone="accent">{set.genre}</Badge>}
        {subgenre && <Badge>{set.subgenre}</Badge>}
      </div>
      {(set.venue || showEventText) && (
        <p className="dt-meta-venue">
          {set.venue}
          {set.venue && showEventText && ' · '}
          {showEventText && set.event}
        </p>
      )}
      {set.recorded_date && <p className="dt-meta-date">{set.recorded_date}</p>}
    </div>
  )
}

/** Duration, plays and track count. */
function SetStats({ set }: { set: DjSetWithDetections }) {
  return (
    <div className="dt-stats">
      <div className="dt-stat-block">
        <span className="dt-stat-value">{formatDuration(set.duration_seconds)}</span>
        <span className="dt-stat-label">Duration</span>
      </div>
      {set.play_count > 0 && (
        <div className="dt-stat-block">
          <span className="dt-stat-value">{formatPlayCount(set.play_count)}</span>
          <span className="dt-stat-label">Plays</span>
        </div>
      )}
      {set.detections.length > 0 && (
        <div className="dt-stat-block">
          <span className="dt-stat-value">{set.detections.length}</span>
          <span className="dt-stat-label">Tracks</span>
        </div>
      )}
    </div>
  )
}

/** About the DJ: avatar, name, listener count, bio and up to four tags. */
function ArtistCard({ artistInfo, artistTags }: { artistInfo: SetArtistInfo; artistTags: string[] }) {
  return (
    <section className="dt-about" aria-labelledby="dt-about-dj">
      <h2 id="dt-about-dj" className="dt-card-title">About the DJ</h2>
      <Link to={`/app/artists/${artistInfo.slug || artistInfo.id}`} className="dt-dj-link">
        <span className="dt-dj-avatar">
          {artistInfo.id ? (
            <img src={getArtistImageUrl(artistInfo.id)} alt={artistInfo.name} onError={fallbackOnError} />
          ) : (
            <span className="dt-dj-initial">{artistInfo.name.charAt(0)}</span>
          )}
        </span>
        <span className="dt-dj-text">
          <span className="dt-dj-name">{artistInfo.name}</span>
          {artistInfo.listeners > 0 && (
            <span className="dt-dj-listeners">{formatPlayCount(artistInfo.listeners)} listeners</span>
          )}
        </span>
      </Link>
      <p className="dt-dj-bio">{artistInfo.bio_summary}</p>
      {artistTags.length > 0 && (
        <div className="dt-dj-tags">
          {artistTags.slice(0, 4).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}
    </section>
  )
}

/** Right column: event + metadata card, stats, description and the DJ card. */
export function SetSidebar({ set, artistInfo, artistTags }: SetSidebarProps) {
  const event = set.event_info
  return (
    <div className="dt-side">
      <div className="dt-side-card">
        {event && <EventBanner event={event} />}
        <SetMetaBlock set={set} />
      </div>

      <SetStats set={set} />

      {set.description && (
        <section className="dt-about" aria-labelledby="dt-about-set">
          <h2 id="dt-about-set" className="dt-card-title">About this set</h2>
          <p>{set.description}</p>
        </section>
      )}

      {artistInfo && artistInfo.bio_summary && <ArtistCard artistInfo={artistInfo} artistTags={artistTags} />}
    </div>
  )
}
