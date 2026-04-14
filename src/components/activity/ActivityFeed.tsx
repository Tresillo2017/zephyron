import { useEffect } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { ActivityItem } from './ActivityItem'
import { ActivityFeedSkeleton } from '../ui/Skeleton'

interface ActivityFeedProps {
  feed: 'me' | 'user' | 'community'
  userId?: string
  limit?: number
  showLoadMore?: boolean
}

export function ActivityFeed({ feed, userId, limit, showLoadMore = false }: ActivityFeedProps) {
  const {
    activityFeed,
    activityLoading,
    activityError,
    activityHasMore,
    fetchActivity,
    loadMoreActivity
  } = useProfileStore()

  useEffect(() => {
    fetchActivity(feed, userId, 1)
  }, [feed, userId, fetchActivity])

  const displayItems = limit ? activityFeed.slice(0, limit) : activityFeed

  if (activityLoading && activityFeed.length === 0) {
    return <ActivityFeedSkeleton count={limit || 5} />
  }

  if (activityError) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Activity feed unavailable
        </div>
      </div>
    )
  }

  if (displayItems.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">📭</div>
        <div className="text-lg font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--c1))' }}>
          No activity yet
        </div>
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Start listening and creating!
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayItems.map(item => (
        <ActivityItem
          key={item.id}
          item={item}
          showUser={feed === 'community'}
        />
      ))}

      {showLoadMore && activityHasMore && (
        <button
          onClick={loadMoreActivity}
          disabled={activityLoading}
          className="w-full py-3 rounded font-[var(--font-weight-medium)] text-sm transition-colors"
          style={{
            backgroundColor: 'hsl(var(--b4))',
            color: 'hsl(var(--c1))'
          }}
        >
          {activityLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
