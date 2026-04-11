import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { getAvatarLarge } from '../../lib/avatar'

interface ProfileHeaderProps {
  user: {
    id: string
    name: string
    email: string | null
    avatar_url: string | null
    bio: string | null
    role: string
  }
  isOwnProfile: boolean
  onEditClick?: () => void
  onAvatarClick?: () => void
}

export function ProfileHeader({
  user,
  isOwnProfile,
  onEditClick,
  onAvatarClick,
}: ProfileHeaderProps) {
  const initial = user.name?.charAt(0).toUpperCase() || '?'
  const isAvatarClickable = isOwnProfile && onAvatarClick

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          className={`w-20 h-20 lg:w-24 lg:h-24 rounded-[var(--card-radius)] overflow-hidden flex items-center justify-center flex-shrink-0 ${
            isAvatarClickable ? 'cursor-pointer hover:opacity-80' : ''
          }`}
          onClick={isAvatarClickable ? onAvatarClick : undefined}
          style={{
            transition: 'opacity var(--trans) var(--ease-out-custom)',
          }}
        >
          {user.avatar_url ? (
            <img
              src={getAvatarLarge(user.avatar_url) || user.avatar_url}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-[var(--font-weight-bold)]"
              style={{
                background: 'hsl(var(--h3) / 0.12)',
                color: 'hsl(var(--h3))',
                fontSize: '2rem',
              }}
            >
              {initial}
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-[var(--font-weight-bold)] text-[hsl(var(--c1))] truncate">
            {user.name}
          </h1>
          {user.bio && (
            <p className="text-sm mt-1 text-[hsl(var(--c2))] truncate">
              {user.bio}
            </p>
          )}
          <div className="mt-2">
            <Badge variant="accent">{user.role}</Badge>
          </div>
          {isOwnProfile && onEditClick && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={onEditClick}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
