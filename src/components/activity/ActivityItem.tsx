import React from 'react'
import type { ActivityItem as ActivityItemType } from '../../lib/types'

interface ActivityItemProps {
  item: ActivityItemType
  showUser?: boolean
}

export function ActivityItem({ item, showUser = false }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (item.activity_type) {
      case 'badge_earned': return '🏆'
      case 'song_liked': return '❤️'
      case 'playlist_created': return '📁'
      case 'playlist_updated': return '📁'
      case 'annotation_approved': return '✅'
      case 'milestone_reached': return '🎉'
      default: return '•'
    }
  }

  const getActivityText = () => {
    const { activity_type, metadata } = item
    const userName = showUser && item.user_name ? item.user_name : 'You'

    switch (activity_type) {
      case 'badge_earned':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> earned{' '}
            <span className="font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--h3))' }}>
              {metadata.badge_name}
            </span>{' '}
            badge
          </>
        )
      case 'song_liked':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> liked{' '}
            <span className="font-[var(--font-weight-medium)]">{metadata.song_title}</span>
            {metadata.song_artist && ` - ${metadata.song_artist}`}
          </>
        )
      case 'playlist_created':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> created playlist{' '}
            <span className="font-[var(--font-weight-medium)]">{metadata.playlist_title}</span>
          </>
        )
      case 'playlist_updated':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> added{' '}
            <span className="font-[var(--font-weight-medium)]">{metadata.set_title}</span> to{' '}
            {metadata.playlist_title}
          </>
        )
      case 'annotation_approved':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> added{' '}
            <span className="font-[var(--font-weight-medium)]">{metadata.track_title}</span> to{' '}
            {metadata.set_title}
          </>
        )
      case 'milestone_reached':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> reached{' '}
            <span className="font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--h3))' }}>
              {metadata.milestone}
            </span>
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
    <div className="card p-4 flex items-start gap-3">
      <div className="text-2xl">{getActivityIcon()}</div>
      <div className="flex-1">
        <div className="text-sm mb-1" style={{ color: 'hsl(var(--c1))' }}>
          {getActivityText()}
        </div>
        <div className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
          {getTimeAgo(item.created_at)}
        </div>
      </div>
    </div>
  )
}
