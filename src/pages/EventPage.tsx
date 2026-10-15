import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { fetchEvent, getEventCoverUrl, getEventLogoUrl, getArtistImageUrl } from '../lib/api'
import { useSession } from '../lib/auth-client'
import { Skeleton } from '../components/ui/Skeleton'
import { SetGrid } from '../components/sets/SetGrid'
import { SocialLinks, countSocialLinks } from '../components/ui/SocialLinks'
import { Badge, Button, ContentCard, Section } from '../components/bleh'
import { PageFrame } from '../components/shell'
import { DetailHero } from '../components/detail/DetailHero'
import { DetailTabs, type DetailTab } from '../components/detail/DetailTabs'
import { formatPlayCount } from '../lib/formatTime'
import { getPlaceholder } from '../lib/placeholders'
import type { EventArtist, EventGenreBreakdown, EventEdition } from '../lib/types'
import {
  CalendarFilled,
  EditFilled,
  Group2Filled,
  HeadphoneFilled,
  InformationFilled,
  LayoutGridFilled,
  MapPinFilled,
} from '@mingcute/react/core-filled'
import '../components/detail/detail.css'

/** Extract YouTube video ID from any YouTube URL format */
function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const m = url.match(pattern)
    if (m) return m[1]
  }
  return null
}

type EventTab = 'overview' | 'lineup' | 'sets' | 'info'

const TABS: DetailTab<EventTab>[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGridFilled },
  { id: 'lineup', label: 'Artist Lineup', icon: Group2Filled },
  { id: 'sets', label: 'Sets', icon: HeadphoneFilled },
  { id: 'info', label: 'Info', icon: InformationFilled },
]

/** Format an ISO date string to a readable format like "Jul 19, 2024" */
function formatEventDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

/** Format a date range like "Jul 19 - 21, 2024" or "Jul 19 - Aug 2, 2024" */
function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return ''
  const startFormatted = formatEventDate(start)
  if (!end || end === start) return startFormatted

  try {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')

    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.getDate()}, ${e.getFullYear()}`
    }
    if (s.getFullYear() === e.getFullYear()) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
    }
    return `${startFormatted} - ${formatEventDate(end)}`
  } catch {
    return `${startFormatted} - ${formatEventDate(end)}`
  }
}

/** Format total duration in hours/minutes like "12h 30m" */
function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Avatar + name link to an artist page (used in the lineup grids). */
function PersonLink({ artist, large }: { artist: EventArtist; large?: boolean }) {
  return (
    <Link
      to={`/app/artists/${artist.slug || artist.id}`}
      className={large ? 'dt-person dt-person--lg' : 'dt-person'}
    >
      <span className="dt-person-avatar">
        {artist.id ? (
          <img
            src={getArtistImageUrl(artist.id)}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.src = getPlaceholder('square') }}
          />
        ) : (
          <span className="dt-person-initial">{artist.name.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="dt-person-name">{artist.name}</span>
    </Link>
  )
}

/** Labelled values: location, dates, series and website. */
function EventDetails({
  event,
  year,
  dateLabel,
}: {
  event: any
  year?: number | null
  dateLabel: string
}) {
  const website = event.website as string | undefined
  return (
    <div className="dt-fields">
      {event.location && (
        <div>
          <p className="dt-field-label">Location</p>
          <p className="dt-field-value">{event.location as string}</p>
        </div>
      )}
      {year && (
        <div>
          <p className="dt-field-label">Year</p>
          <p className="dt-field-value dt-field-value--mono">{year}</p>
        </div>
      )}
      {(event.start_date || event.end_date) && (
        <div>
          <p className="dt-field-label">{dateLabel}</p>
          <p className="dt-field-value dt-field-value--mono">{formatDateRange(event.start_date, event.end_date)}</p>
        </div>
      )}
      {event.series && (
        <div>
          <p className="dt-field-label">Series</p>
          <p className="dt-field-value">{event.series as string}</p>
        </div>
      )}
      {website && (
        <div>
          <p className="dt-field-label">Website</p>
          <p className="dt-field-value">
            <a href={website} target="_blank" rel="noopener noreferrer">
              {website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          </p>
        </div>
      )}
    </div>
  )
}

function EmptyCard({ children }: { children: ReactNode }) {
  return <div className="dt-empty"><p>{children}</p></div>
}

export function EventPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const [event, setEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EventTab>('overview')

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setActiveTab('overview')
    fetchEvent(id)
      .then((r) => setEvent(r.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [id])

  // Build edition list including current event, sorted by year descending
  const editions: EventEdition[] = event?.editions || []
  const eventYear: number | null = event?.year ?? null
  const allEditions = useMemo(() => {
    if (!event) return []
    const current: EventEdition = { id: event.id, slug: event.slug, year: eventYear, name: event.name }
    const combined = [current, ...editions.filter((e: EventEdition) => e.id !== current.id)]
    return combined.sort((a, b) => (b.year || 0) - (a.year || 0))
  }, [event, eventYear, editions])

  if (error) return <div className="flex items-center justify-center h-full"><p className="dt-error">{error}</p></div>

  if (isLoading || !event) {
    return (
      <div>
        <div className="dt-skeleton-banner" />
        <div className="px-6 lg:px-10 -mt-24 relative z-10">
          <div className="flex gap-6">
            <Skeleton className="w-[160px] h-[160px] rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-16">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tags: string[] = Array.isArray(event.tags) ? event.tags : []
  const sets = event.sets || []
  const stats = event.stats || { set_count: 0, total_plays: 0, total_duration: 0, artist_count: 0 }
  const genres: EventGenreBreakdown[] = event.genres || []
  const artists: EventArtist[] = event.artists || []
  const maxGenreCount = genres.length > 0 ? genres[0].count : 1
  const aftermovieVideoId = extractYouTubeId(event.aftermovie_url || '')
  const hasSocialLinks = countSocialLinks(event, ['social']) > 0

  const goToEdition = (ed: EventEdition) => {
    if (ed.id !== event.id) navigate(`/app/events/${ed.slug || ed.id}`)
  }

  const editionChips = allEditions.length > 1 && (
    <div className="dt-chips" role="group" aria-label="Editions">
      {allEditions.map((ed) => {
        const isCurrent = ed.id === event.id
        return (
          <button
            key={ed.id}
            type="button"
            className="dt-chip-btn"
            aria-current={isCurrent ? 'true' : undefined}
            onClick={() => goToEdition(ed)}
          >
            {ed.year || '?'}
          </button>
        )
      })}
    </div>
  )

  const socialBlock = hasSocialLinks && (
    <div className="dt-about">
      <SocialLinks data={event} categories={['social']} heading="CONNECT" />
    </div>
  )

  const renderTab = (): { main: ReactNode; side?: ReactNode } => {
    if (activeTab === 'overview') {
      return {
        main: (
          <>
            {genres.length > 0 && (
              <Section title="Genres">
                <div className="dt-genres">
                  {genres.map((g) => (
                    <div key={g.genre}>
                      <div className="dt-genre-head">
                        <span className="dt-genre-name">{g.genre}</span>
                        <span className="dt-genre-count">{g.count} {g.count === 1 ? 'set' : 'sets'}</span>
                      </div>
                      <div className="dt-genre-track">
                        <div className="dt-genre-bar" style={{ width: `${(g.count / maxGenreCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {artists.length > 0 && (
              <Section
                title="Artist Lineup"
                action={artists.length > 6 && (
                  <button type="button" className="dt-link-btn" onClick={() => setActiveTab('lineup')}>
                    View all {artists.length} →
                  </button>
                )}
              >
                <div className="dt-people">
                  {artists.slice(0, 6).map((artist) => <PersonLink key={artist.id} artist={artist} />)}
                </div>
              </Section>
            )}
            {socialBlock}
          </>
        ),
        side: (
          <>
            <Section title="Event stats">
              <div className="dt-grid2">
                <div className="dt-stat-block">
                  <span className="dt-stat-value">{stats.set_count}</span>
                  <span className="dt-stat-label">Sets</span>
                </div>
                <div className="dt-stat-block">
                  <span className="dt-stat-value">{stats.artist_count}</span>
                  <span className="dt-stat-label">Artists</span>
                </div>
                <div className="dt-stat-block">
                  <span className="dt-stat-value">{formatTotalDuration(stats.total_duration)}</span>
                  <span className="dt-stat-label">Total Music</span>
                </div>
                <div className="dt-stat-block">
                  <span className="dt-stat-value">{formatPlayCount(stats.total_plays)}</span>
                  <span className="dt-stat-label">Total Plays</span>
                </div>
              </div>
            </Section>
            <Section title="Details">
              <EventDetails event={event} dateLabel="Date" />
            </Section>
          </>
        ),
      }
    }

    if (activeTab === 'lineup') {
      return {
        main: artists.length > 0 ? (
          <Section
            title="Artist Lineup"
            action={<span className="dt-mono-count">{artists.length} {artists.length === 1 ? 'artist' : 'artists'}</span>}
          >
            <div className="dt-people dt-people--wide">
              {artists.map((artist) => <PersonLink key={artist.id} artist={artist} large />)}
            </div>
          </Section>
        ) : (
          <EmptyCard>No artist lineup data available.</EmptyCard>
        ),
      }
    }

    if (activeTab === 'sets') {
      return {
        main: sets.length > 0 ? (
          <Section
            title="DJ Sets"
            action={<span className="dt-mono-count">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>}
          >
            <SetGrid sets={sets} />
          </Section>
        ) : (
          <EmptyCard>No sets linked to this event yet.</EmptyCard>
        ),
      }
    }

    return {
      main: (
        <>
          {event.description && (
            <Section title="About">
              <p className="dt-prose">{event.description}</p>
            </Section>
          )}
          {tags.length > 0 && (
            <Section title="Tags">
              <div className="dt-tags">
                {tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
              </div>
            </Section>
          )}
          {allEditions.length > 1 && (
            <Section title="Editions">
              <div className="dt-fields">
                {allEditions.map((ed) => {
                  const isCurrent = ed.id === event.id
                  return (
                    <button
                      key={ed.id}
                      type="button"
                      className="dt-edition"
                      aria-current={isCurrent ? 'true' : undefined}
                      onClick={() => goToEdition(ed)}
                    >
                      <span className="dt-edition-year">{ed.year || '?'}</span>
                      <span className="dt-edition-name">{ed.name}</span>
                      {isCurrent && <span className="dt-edition-current">CURRENT</span>}
                    </button>
                  )
                })}
              </div>
            </Section>
          )}
        </>
      ),
      side: (
        <>
          <Section title="Details">
            <EventDetails event={event} year={eventYear} dateLabel="Dates" />
          </Section>
          {socialBlock}
        </>
      ),
    }
  }

  const { main, side } = renderTab()

  return (
    <>
      <DetailHero
        media={
          aftermovieVideoId ? (
            <>
              <iframe
                className="dt-aftermovie"
                src={`https://www.youtube-nocookie.com/embed/${aftermovieVideoId}?autoplay=1&mute=1&loop=1&controls=0&playlist=${aftermovieVideoId}&modestbranding=1&rel=0&showinfo=0&disablekb=1&fs=0&iv_load_policy=3`}
                allow="autoplay; encrypted-media"
                title="Aftermovie"
              />
              {/* Fallback cover shown until iframe loads */}
              {event.cover_image_r2_key && (
                <img src={getEventCoverUrl(event.id)} alt="" className="dt-aftermovie-cover" />
              )}
            </>
          ) : event.cover_image_r2_key ? (
            <img src={getEventCoverUrl(event.id)} alt="" className="dt-hero-media" />
          ) : undefined
        }
        art={
          event.logo_r2_key ? (
            <img src={getEventLogoUrl(event.id)} alt={event.name} />
          ) : event.cover_image_r2_key ? (
            <img src={getEventCoverUrl(event.id)} alt={event.name} />
          ) : (
            <div className="dt-art-fallback">
              <CalendarFilled aria-hidden="true" />
            </div>
          )
        }
        eyebrow={
          <span className="dt-hero-badges">
            <span>Event</span>
            {eventYear && <Badge tone="accent">{eventYear}</Badge>}
          </span>
        }
        title={event.name}
        meta={
          <span className="dt-hero-badges">
            {event.location && (
              <span className="dt-hero-badges">
                <MapPinFilled className="dt-ico--sm" aria-hidden="true" />
                {event.location}
              </span>
            )}
            {(event.start_date || event.end_date) && (
              <span className="dt-mono-count">{formatDateRange(event.start_date, event.end_date)}</span>
            )}
            {event.series && <Badge tone="accent">{event.series}</Badge>}
          </span>
        }
        actions={
          <>
            {editionChips}
            {isAdmin && (
              <Button
                appearance="default"
                size="sm"
                label="Edit"
                to={`/app/admin?tab=events&edit=${event.id}`}
                icon={<EditFilled className="dt-ico--sm" aria-hidden="true" />}
              />
            )}
          </>
        }
      />

      <DetailTabs tabs={TABS} active={activeTab} onChange={setActiveTab} label="Event sections" />

      <PageFrame>
        <ContentCard
          main={
            <div key={activeTab} className="dt-main animate-fade">
              {main}
            </div>
          }
          side={side ? <div className="dt-side">{side}</div> : undefined}
        />
      </PageFrame>
    </>
  )
}
