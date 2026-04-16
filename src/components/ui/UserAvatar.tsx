import { getAvatarSmall } from '../../lib/avatar'
import { getPlaceholder } from '../../lib/placeholders'

interface UserAvatarProps {
  avatarUrl?: string | null
  name?: string
  size?: number
  className?: string
}

export function UserAvatar({ avatarUrl, name, size = 32, className = '' }: UserAvatarProps) {
  const initial = name?.charAt(0).toUpperCase() || '?'

  if (avatarUrl) {
    return (
      <img
        src={getAvatarSmall(avatarUrl) || avatarUrl}
        alt={name || 'User avatar'}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('circle') }}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'hsl(var(--h3) / 0.15)',
        color: 'hsl(var(--h3))',
      }}
    >
      {initial}
    </div>
  )
}
