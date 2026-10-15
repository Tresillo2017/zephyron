import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useSearchParams, Link } from 'react-router'
import {
  CalendarFilled, DiscFilled, MusicFilled, RightFilled, SearchFilled, UserStarFilled,
} from '@mingcute/react/core-filled'
import { searchSets, getCoverUrl, getArtistImageUrl, getEventCoverUrl, getSongCoverUrl } from '../lib/api'
import { getPlaceholder } from '../lib/placeholders'
import { formatTime, formatConfidence } from '../lib/formatTime'
import { ContentCard, EmptyState, Section, Skeleton, Toolbar, ToolbarTabs, SeeMore } from '../components/bleh'
import { PageFrame } from '../components/shell'
import { SetGrid } from '../components/sets/SetGrid'
import type { SearchResults, TopResult } from '../lib/types'
import './library.css'

const TABS = ['all', 'sets', 'tracks', 'artists', 'events'] as const
type Tab = typeof TABS[number]

const TAB_ICONS: Record<Tab, ReactNode> = {
  all: <SearchFilled />,
  sets: <DiscFilled />,
  tracks: <MusicFilled />,
  artists: <UserStarFilled />,
  events: <CalendarFilled />,
}

const TAB_LABELS: Record<Tab, string> = {
  all: 'All',
  sets: 'Sets',
  tracks: 'Tracks',
  artists: 'Artists',
  events: 'Events',
}

const ALL_PREVIEW = { sets: 5, tracks: 5, artists: 5, events: 4 } as const
const SKELETON_TILES = 2
const SKELETON_HEIGHT = 208

// ── Top Result card ───────────────────────────────────────────────────────────

function TopResultCard({ result }: { result: TopResult }) {
  const isRound = result.type === 'artist'
  const coverUrl = result.type === 'set' && result.image_r2_key
    ? getCoverUrl(result.id)
    : result.type === 'artist' && result.image_r2_key
    ? getArtistImageUrl(result.id)
    : result.type === 'event' && result.image_r2_key
    ? getEventCoverUrl(result.id)
    : null

  return (
    <Link to={result.link} className="zl-top">
      <div className="zl-top-art" data-round={isRound ? '' : undefined}>
        <img
          src={coverUrl ?? getPlaceholder(isRound ? 'circle' : 'square')}
          alt=""
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder(isRound ? 'circle' : 'square') }}
        />
      </div>
      <div className="zl-top-body">
        <p className="zl-top-sub">
          {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
          {result.subtitle ? ` · ${result.subtitle}` : ''}
        </p>
        <h3 className="zl-top-title">{result.title}</h3>
      </div>
      {result.tags.length > 0 && (
        <div className="zl-tags">
          {result.tags.map((tag) => <span key={tag} className="zl-tag">#{tag.toLowerCase()}</span>)}
        </div>
      )}
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const activeTab = (searchParams.get('tab') as Tab) || 'all'

  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults(null); return }
    setLoading(true)
    searchSets(query.trim())
      .then((res) => setResults(res.data))
      .catch(() => setResults(null))
      .finally(() => setLoading(false))
  }, [query])

  const setTab = useCallback((tab: Tab) => {
    setSearchParams((prev) => { prev.set('tab', tab); return prev }, { replace: true })
  }, [setSearchParams])

  const totalResults = results
    ? results.sets.length + results.tracks.length + results.artists.length + results.events.length
    : 0

  // Empty state
  if (!query.trim()) {
    return (
      <PageFrame>
        <ContentCard
          toolbar={<Toolbar><h1 className="zl-toolbar-title">Search</h1></Toolbar>}
          main={
            <Section>
              <EmptyState
                icon={<SearchFilled />}
                title="Search sets, artists, tracks and events"
                description="Use the search bar above to get started."
              />
            </Section>
          }
        />
      </PageFrame>
    )
  }

  const show = (tab: Tab) => activeTab === 'all' || activeTab === tab
  const isAll = activeTab === 'all'

  const tabs = TABS.map((tab) => {
    const count = tab === 'all' ? totalResults
      : tab === 'sets' ? (results?.sets.length ?? 0)
      : tab === 'tracks' ? (results?.tracks.length ?? 0)
      : tab === 'artists' ? (results?.artists.length ?? 0)
      : (results?.events.length ?? 0)
    return { key: tab, label: TAB_LABELS[tab], icon: TAB_ICONS[tab], count: tab === activeTab ? undefined : count }
  })

  let body: ReactNode = null
  if (loading) {
    body = (
      <Section>
        <div className="zl-two">
          {Array.from({ length: SKELETON_TILES }).map((_, i) => (
            <Skeleton key={i} height={SKELETON_HEIGHT} borderRadius="var(--card-radius)" />
          ))}
        </div>
      </Section>
    )
  } else if (results) {
    body = (
      <>
        {/* All tab: top result beside the first tracks */}
        {isAll && (results.top_result || results.tracks.length > 0) && (
          <div className="zl-two">
            {results.top_result && (
              <Section title="Top result">
                <TopResultCard result={results.top_result} />
              </Section>
            )}
            {results.tracks.length > 0 && (
              <Section
                title="Tracks"
                action={results.tracks.length > ALL_PREVIEW.tracks
                  ? <SeeMore onClick={() => setTab('tracks')}>See all</SeeMore>
                  : undefined}
              >
                <TrackRows tracks={results.tracks.slice(0, ALL_PREVIEW.tracks)} />
              </Section>
            )}
          </div>
        )}

        {/* Tracks tab: full list */}
        {activeTab === 'tracks' && results.tracks.length > 0 && (
          <Section title="Tracks">
            <TrackRows tracks={results.tracks} />
          </Section>
        )}

        {show('sets') && results.sets.length > 0 && (
          <Section
            title="Sets"
            action={isAll && results.sets.length > ALL_PREVIEW.sets
              ? <SeeMore onClick={() => setTab('sets')}>See all {results.sets.length}</SeeMore>
              : undefined}
          >
            <SetGrid sets={isAll ? results.sets.slice(0, ALL_PREVIEW.sets) : results.sets} />
          </Section>
        )}

        {show('artists') && results.artists.length > 0 && (
          <Section
            title="Artists"
            action={isAll && results.artists.length > ALL_PREVIEW.artists
              ? <SeeMore onClick={() => setTab('artists')}>See all {results.artists.length}</SeeMore>
              : undefined}
          >
            <ul className="zl-square-grid">
              {(isAll ? results.artists.slice(0, ALL_PREVIEW.artists) : results.artists).map((artist) => (
                <li key={artist.id} className="zl-tile-cell">
                  <Link to={`/app/artists/${artist.id}`} className="zl-square-tile">
                    <div className="zl-square-art" data-round="">
                      <img
                        src={getArtistImageUrl(artist.id)}
                        alt=""
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('circle') }}
                      />
                    </div>
                    <span className="zl-square-title">{artist.name}</span>
                    <span className="zl-square-sub">Artist · {artist.set_count} sets</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {show('events') && results.events.length > 0 && (
          <Section
            title="Events"
            action={isAll && results.events.length > ALL_PREVIEW.events
              ? <SeeMore onClick={() => setTab('events')}>See all {results.events.length}</SeeMore>
              : undefined}
          >
            <ul className="zl-square-grid">
              {(isAll ? results.events.slice(0, ALL_PREVIEW.events) : results.events).map((event) => (
                <li key={event.id} className="zl-tile-cell">
                  <Link to={`/app/events/${event.slug || event.id}`} className="zl-square-tile">
                    <div className="zl-square-art">
                      <img
                        src={event.cover_image_r2_key ? getEventCoverUrl(event.id) : getPlaceholder('square')}
                        alt=""
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                      />
                    </div>
                    <span className="zl-square-title">{event.name}</span>
                    <span className="zl-square-sub">
                      {[event.location, event.set_count ? `${event.set_count} sets` : null].filter(Boolean).join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {totalResults === 0 && (
          <Section>
            <EmptyState
              icon={<SearchFilled />}
              title={`No results for “${query}”`}
              description="Try a shorter query or check the spelling."
            />
          </Section>
        )}
      </>
    )
  }

  return (
    <PageFrame>
      <ContentCard
        toolbar={
          <ToolbarTabs tabs={tabs} active={activeTab} onChange={setTab} />
        }
        main={body}
      />
    </PageFrame>
  )
}

function TrackRows({ tracks }: { tracks: SearchResults['tracks'] }) {
  return (
    <div className="zl-rows">
      {tracks.map((track, i) => (
        <Link key={track.id} to={`/app/sets/${track.set_id}`} className="zl-row">
          <span className="zl-row-index">{i + 1}</span>
          <span className="zl-row-thumb">
            <img
              src={track.song_id && track.song_cover_r2_key ? getSongCoverUrl(track.song_id) : getCoverUrl(track.set_id)}
              alt=""
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
            />
          </span>
          <span className="zl-row-main">
            <span className="zl-row-title">{track.track_title}</span>
            <span className="zl-row-sub">
              {track.set_artist} · {formatTime(track.start_time_seconds)}
            </span>
          </span>
          <span className="zl-row-end">{formatConfidence(track.confidence)}</span>
          <span className="zl-tile-chev" aria-hidden="true"><RightFilled /></span>
        </Link>
      ))}
    </div>
  )
}
