import { useEffect } from 'react'
import { Headphone2Filled } from '@mingcute/react/core-filled'
import { useProfileStore } from '../../stores/profileStore'
import { ActivityItem } from './ActivityItem'
import { Button, Card, EmptyState, Skeleton } from '../bleh'

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
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading activity">
        {Array.from({ length: limit || 5 }, (_, i) => (
          <Skeleton key={i} height={56} />
        ))}
      </div>
    )
  }

  if (activityError) {
    return (
      <Card>
        <EmptyState title="Activity feed unavailable" />
      </Card>
    )
  }

  if (displayItems.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Headphone2Filled />}
          title="No activity yet"
          description="Start listening and creating!"
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {displayItems.map((item, i) => (
          <li key={item.id}>
            <ActivityItem
              item={item}
              showUser={feed === 'community'}
              index={i}
            />
          </li>
        ))}
      </ul>

      {showLoadMore && activityHasMore && (
        <Button
          label={activityLoading ? 'Loading...' : 'Load More'}
          onClick={loadMoreActivity}
          disabled={activityLoading}
          className="mt-2 w-full"
        />
      )}
    </div>
  )
}
