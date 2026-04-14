import { useEffect } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { StatsGrid } from './StatsGrid'
import { TopArtistsList } from './TopArtistsList'
import { ListeningHeatmap } from './ListeningHeatmap'
import { WeekdayChart } from './WeekdayChart'
import { ProfileStatsSkeleton } from '../ui/Skeleton'

interface ProfileStatsSectionProps {
  userId: string
}

export function ProfileStatsSection({ userId }: ProfileStatsSectionProps) {
  const { stats, statsLoading, statsError, fetchStats } = useProfileStore()

  useEffect(() => {
    fetchStats(userId)
  }, [userId, fetchStats])

  if (statsLoading) {
    return <ProfileStatsSkeleton />
  }

  if (statsError) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>
          Stats unavailable
        </div>
        <button
          onClick={() => fetchStats(userId)}
          className="px-4 py-2 rounded text-sm font-[var(--font-weight-medium)]"
          style={{
            backgroundColor: 'hsl(var(--h3))',
            color: 'white'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats || stats.total_sessions === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <div className="text-lg font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--c1))' }}>
          No listening history yet
        </div>
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Start listening to see your stats
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2
        className="text-2xl font-[var(--font-weight-bold)] mb-4"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Listening Statistics
      </h2>

      <StatsGrid
        totalHours={stats.total_hours}
        streakDays={stats.longest_streak_days}
        discoveries={stats.discoveries_count}
      />

      <TopArtistsList artists={stats.top_artists} />

      {stats.top_genres.length > 0 && (
        <div className="mb-6">
          <span className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
            Top Genres:{' '}
          </span>
          {stats.top_genres.map(g => (
            <span
              key={g.genre}
              className="inline-block px-2 py-1 rounded text-xs mr-2"
              style={{
                backgroundColor: 'hsl(var(--h3) / 0.2)',
                color: 'hsl(var(--h3))'
              }}
            >
              #{g.genre}
            </span>
          ))}
        </div>
      )}

      <ListeningHeatmap data={stats.listening_heatmap} />

      <WeekdayChart data={stats.weekday_pattern} />

      <div className="card p-4">
        <div className="flex items-center justify-center gap-8 text-sm">
          <span style={{ color: 'hsl(var(--c2))' }}>
            Avg Session: <span style={{ color: 'hsl(var(--c1))' }}>{stats.average_session_minutes} min</span>
          </span>
          <span style={{ color: 'hsl(var(--c3))' }}>•</span>
          <span style={{ color: 'hsl(var(--c2))' }}>
            Longest: <span style={{ color: 'hsl(var(--c1))' }}>{Math.floor(stats.longest_session_minutes / 60)}h {Math.floor(stats.longest_session_minutes % 60)}min</span>
          </span>
        </div>
      </div>
    </div>
  )
}
