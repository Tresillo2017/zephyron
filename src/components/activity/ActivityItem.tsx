import type { CSSProperties, ReactNode } from 'react'
import { CheckCircleFilled, FolderFilled, HeartFilled, Headphone2Filled, MusicFilled, StarFilled, TrophyFilled } from '@mingcute/react/core-filled'
import type { ActivityItem as ActivityItemType } from '../../lib/types'

interface ActivityItemProps {
  item: ActivityItemType
  showUser?: boolean
  index?: number
}

const ACTIVITY_ICON: Record<string, ReactNode> = {
  badge_earned: <TrophyFilled />,
  song_liked: <HeartFilled />,
  playlist_created: <FolderFilled />,
  playlist_updated: <FolderFilled />,
  annotation_approved: <CheckCircleFilled />,
  milestone_reached: <StarFilled />,
  set_listened: <Headphone2Filled />,
}

const NAME = 'font-medium text-heading'
const ACCENT = 'font-medium text-accent-2'

export function ActivityItem({ item, showUser = false, index = 0 }: ActivityItemProps) {
  const getActivityIcon = (): ReactNode => ACTIVITY_ICON[item.activity_type] ?? <MusicFilled />

  const getActivityText = (): ReactNode => {
    const { activity_type, metadata } = item
    const userName = showUser && item.user_name ? item.user_name : 'You'

    switch (activity_type) {
      case 'badge_earned':
        return (
          <>
            <span className={NAME}>{userName}</span> earned{' '}
            <span className={ACCENT}>
              {metadata.badge_name}
            </span>{' '}
            badge
          </>
        )
      case 'song_liked':
        return (
          <>
            <span className={NAME}>{userName}</span> liked{' '}
            <span className={NAME}>{metadata.song_title}</span>
            {metadata.song_artist && ` - ${metadata.song_artist}`}
          </>
        )
      case 'playlist_created':
        return (
          <>
            <span className={NAME}>{userName}</span> created playlist{' '}
            <span className={NAME}>{metadata.playlist_title}</span>
          </>
        )
      case 'playlist_updated':
        return (
          <>
            <span className={NAME}>{userName}</span> added{' '}
            <span className={NAME}>{metadata.set_title}</span> to{' '}
            {metadata.playlist_title}
          </>
        )
      case 'annotation_approved':
        return (
          <>
            <span className={NAME}>{userName}</span> added{' '}
            <span className={NAME}>{metadata.track_title}</span> to{' '}
            {metadata.set_title}
          </>
        )
      case 'milestone_reached':
        return (
          <>
            <span className={NAME}>{userName}</span> reached{' '}
            <span className={ACCENT}>
              {metadata.milestone}
            </span>
          </>
        )
      case 'set_listened':
        return (
          <>
            <span className={NAME}>{userName}</span> listened to{' '}
            <span className={NAME}>{metadata.title}</span>
            {metadata.artist && ` by ${metadata.artist}`}
          </>
        )
      default:
        return null
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      className="animate-item flex items-start gap-3 rounded-item px-3 py-2.5 transition-colors duration-200 ease-bleh hover:bg-b4/40"
      style={{ '--delay': `${index * 30}ms` } as CSSProperties}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-item bg-b4/50 text-accent-2 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
        {getActivityIcon()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] leading-[18px] text-text">
          {getActivityText()}
        </div>
        <div className="mt-0.5 text-[12px] leading-[16px] text-muted">
          {getTimeAgo(item.created_at)}
        </div>
      </div>
    </div>
  )
}
