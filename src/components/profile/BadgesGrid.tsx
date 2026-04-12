import { useEffect, useState } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { BadgeCard } from './BadgeCard'
import { BADGE_DEFINITIONS } from '../../lib/badgeDefinitions'
import type { Badge } from '../../lib/types'
import { BadgesGridSkeleton } from '../ui/Skeleton'

// Convert badge definitions to full Badge type (frontend doesn't need checkFn)
const ALL_BADGES: Badge[] = BADGE_DEFINITIONS.map(b => ({
  ...b
} as Badge))

interface BadgesGridProps {
  userId: string
}

export function BadgesGrid({ userId }: BadgesGridProps) {
  const { badges, badgesLoading, badgesError, fetchBadges } = useProfileStore()
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchBadges(userId)
  }, [userId, fetchBadges])

  if (badgesLoading) {
    return <BadgesGridSkeleton />
  }

  if (badgesError) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Badges unavailable
        </div>
      </div>
    )
  }

  const earnedBadgeIds = new Set(badges.map(b => b.badge_id))
  const earnedBadges = badges
  const lockedBadges = ALL_BADGES.filter(b => !earnedBadgeIds.has(b.id))

  // Apply filter
  const filteredEarned = filter === 'all'
    ? earnedBadges
    : earnedBadges.filter(b => b.badge?.category === filter)

  const filteredLocked = filter === 'all'
    ? lockedBadges
    : lockedBadges.filter(b => b.category === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-2xl font-[var(--font-weight-bold)]"
          style={{ color: 'hsl(var(--c1))' }}
        >
          Achievement Badges
        </h2>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1 rounded text-sm"
          style={{
            backgroundColor: 'hsl(var(--b4))',
            color: 'hsl(var(--c1))',
            border: 'none'
          }}
        >
          <option value="all">All</option>
          <option value="milestone">Milestones</option>
          <option value="behavior">Behavior</option>
          <option value="genre">Genres</option>
          <option value="community">Community</option>
          <option value="special">Special</option>
        </select>
      </div>

      {earnedBadges.length === 0 && (
        <div className="card p-8 text-center mb-6">
          <div className="text-4xl mb-4">🏆</div>
          <div className="text-lg font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--c1))' }}>
            No badges yet
          </div>
          <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
            Keep listening to earn achievements!
          </div>
        </div>
      )}

      {filteredEarned.length > 0 && (
        <div className="mb-6">
          <h3
            className="text-sm font-[var(--font-weight-bold)] mb-3"
            style={{ color: 'hsl(var(--c2))' }}
          >
            Earned ({filteredEarned.length}/{ALL_BADGES.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredEarned.map(userBadge => (
              <BadgeCard key={userBadge.id} userBadge={userBadge} />
            ))}
          </div>
        </div>
      )}

      {filteredLocked.length > 0 && (
        <div>
          <h3
            className="text-sm font-[var(--font-weight-bold)] mb-3"
            style={{ color: 'hsl(var(--c2))' }}
          >
            Locked ({filteredLocked.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredLocked.map(badge => (
              <BadgeCard key={badge.id} badge={badge} locked />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
