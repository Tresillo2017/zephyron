import NumberFlow from '@number-flow/react'
import { Button, Card, Section, StatCard } from '../../bleh'
import { ProfileStatsSection } from '../ProfileStatsSection'
import { ActivityFeed } from '../../activity/ActivityFeed'

interface OverviewTabProps {
  userId: string
  playlistCount: number
  likedSongsTotal: number
  recentCount: number
  /** Hours listened this month; null while loading or on error. */
  monthHours: number | null
  onViewAll: () => void
}

export function OverviewTab({ userId, playlistCount, likedSongsTotal, recentCount, monthHours, onViewAll }: OverviewTabProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const showWrapped = now.getMonth() + 1 === 12

  return (
    <div className="flex flex-col gap-5">
      {monthHours !== null && (
        <Card className="flex flex-col gap-2">
          <p className="text-[13px] text-muted">This month</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums" style={{ color: 'oklch(var(--h3))' }}>
              <NumberFlow value={Math.round(monthHours * 10) / 10} format={{ maximumFractionDigits: 1 }} />
            </span>
            <span className="mb-1 text-sm text-muted">hours listened</span>
          </div>
        </Card>
      )}

      {showWrapped && (
        <Card className="flex flex-col gap-3">
          <h3 className="text-[16px] font-medium">Your {currentYear} Wrapped</h3>
          <p className="text-sm text-muted">See your year in electronic music</p>
          <div>
            <Button label="View Wrapped" appearance="primary" to={`/app/wrapped/${currentYear}`} />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Playlists" value={playlistCount} />
        <StatCard label="Liked songs" value={likedSongsTotal} />
        <StatCard label="Sets listened" value={recentCount} />
      </div>

      <ProfileStatsSection userId={userId} />

      <Section title="Recent activity" action={<Button label="View all" appearance="subtle" size="sm" onClick={onViewAll} />}>
        <ActivityFeed feed="me" limit={3} />
      </Section>
    </div>
  )
}
