import { Link } from 'react-router'
import {
  AddFilled, CalendarFilled, DiscFilled, HeartFilled, HistoryFilled, PlaylistFilled, SearchFilled, UserStarFilled,
} from '@mingcute/react/core-filled'
import { useSets } from '../hooks/useSets'
import { useSession } from '../lib/auth-client'
import { GENRES } from '../lib/constants'
import { SetGrid } from '../components/sets/SetGrid'
import { ContentCard, CtaStrip, Section, SideAction, SideActions, SeeMore } from '../components/bleh'
import { PageFrame } from '../components/shell'
import './library.css'

const RECENT_PAGE_SIZE = 15
const CHIP_COUNT = 10

function greetingFor(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage() {
  const { sets, isLoading } = useSets({ pageSize: RECENT_PAGE_SIZE, sort: 'newest' })
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0]
  const greeting = `${greetingFor(new Date().getHours())}${firstName ? `, ${firstName}` : ''}`

  return (
    <PageFrame>
      <header className="zl-greeting">
        <h1 className="zl-greeting-title font-head">{greeting}</h1>
        <p className="zl-greeting-sub">AI-detected tracklists, community-verified. Every set, every track.</p>
      </header>

      <ContentCard
        top={
          <CtaStrip
            items={[
              { icon: <DiscFilled />, title: 'Browse the catalog', body: 'Every set, filtered by genre', to: '/app/browse' },
              { icon: <UserStarFilled />, title: 'Find artists', body: 'DJs and producers on Zephyron', to: '/app/artists' },
              { icon: <AddFilled />, title: 'Request a set', body: 'Missing one? Send it to the team', to: '/app/request-set' },
            ]}
          />
        }
        main={
          <>
            <Section
              title="Recent sets"
              icon={<DiscFilled />}
              action={<SeeMore to="/app/browse">View all</SeeMore>}
            >
              <SetGrid sets={sets} isLoading={isLoading} />
            </Section>
            <Section title="Explore by genre" action={<SeeMore to="/app/browse">All genres</SeeMore>}>
              <div className="zl-chips">
                {GENRES.slice(0, CHIP_COUNT).map((genre) => (
                  <Link key={genre} to={`/app/browse?genre=${encodeURIComponent(genre)}`} className="ui-btn ui-chip">
                    {genre}
                  </Link>
                ))}
              </div>
            </Section>
          </>
        }
        side={
          <Section title="Quick links">
            <SideActions>
              <SideAction icon={<SearchFilled />} label="Search" to="/app/search" />
              <SideAction icon={<DiscFilled />} label="Browse sets" to="/app/browse" />
              <SideAction icon={<UserStarFilled />} label="Artists" to="/app/artists" />
              <SideAction icon={<CalendarFilled />} label="Festivals & events" to="/app/events" />
              <SideAction icon={<PlaylistFilled />} label="Playlists" to="/app/playlists" />
              <SideAction icon={<HeartFilled />} label="Liked songs" to="/app/liked-songs" />
              <SideAction icon={<HistoryFilled />} label="Listening history" to="/app/history" />
            </SideActions>
          </Section>
        }
      />
    </PageFrame>
  )
}
