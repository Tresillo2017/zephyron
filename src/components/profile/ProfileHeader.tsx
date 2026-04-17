import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { getAvatarLarge } from '../../lib/avatar'
import { getPlaceholder } from '../../lib/placeholders'

interface ProfileHeaderProps {
  user: {
    id: string
    name: string
    email: string | null
    avatar_url: string | null
    banner_url?: string | null
    bio: string | null
    role: string
  }
  isOwnProfile: boolean
  onEditClick?: () => void
  onAvatarClick?: () => void
  onBannerClick?: () => void
}

export function ProfileHeader({
  user,
  isOwnProfile,
  onEditClick,
  onAvatarClick,
  onBannerClick,
}: ProfileHeaderProps) {
  const initial = user.name?.charAt(0).toUpperCase() || '?'
  const isAvatarClickable = isOwnProfile && onAvatarClick
  const isBannerClickable = isOwnProfile && onBannerClick

  return (
    <div>
      {/* Banner */}
      <div
        className={`relative h-[200px] overflow-hidden rounded-t-[var(--card-radius)] ${isBannerClickable ? 'group cursor-pointer' : ''}`}
        onClick={isBannerClickable ? onBannerClick : undefined}
      >
        {user.banner_url ? (
          <img
            src={user.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--h3) / 0.08) 0%, hsl(var(--b5)) 50%, hsl(var(--h3) / 0.05) 100%)',
            }}
          />
        )}

        {/* Bottom fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, hsl(var(--b6)) 0%, transparent 60%)' }}
        />

        {/* Change cover overlay — shown on hover for own profile */}
        {isBannerClickable && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-[var(--font-weight-medium)]"
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(8px)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {user.banner_url ? 'Change cover' : 'Add cover'}
            </div>
          </div>
        )}
      </div>

      {/* Header — overlapping banner */}
      <div className="relative -mt-[80px] z-10">
        <div className="px-6">
          <div className="flex items-end gap-5 mb-4">
            {/* Avatar */}
            <div
              className={`relative w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-[var(--card-radius)] overflow-hidden flex-shrink-0 ${
                isAvatarClickable ? 'cursor-pointer group/avatar' : ''
              }`}
              onClick={isAvatarClickable ? onAvatarClick : undefined}
              style={{
                boxShadow: 'var(--subtle-shadow)',
                transition: 'opacity var(--trans) var(--ease-out-custom)',
              }}
            >
              {user.avatar_url ? (
                <img
                  src={getAvatarLarge(user.avatar_url) || user.avatar_url}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-[var(--font-weight-bold)]"
                  style={{
                    background: 'hsl(var(--h3) / 0.15)',
                    color: 'hsl(var(--h3))',
                    fontSize: '3rem',
                  }}
                >
                  {initial}
                </div>
              )}

              {/* Avatar hover overlay */}
              {isAvatarClickable && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.4)' }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="pb-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>Profile</p>
                <Badge variant="accent">{user.role}</Badge>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-[var(--font-weight-bold)] leading-tight mb-1"
                style={{ color: 'hsl(var(--c1))' }}
              >
                {user.name}
              </h1>
              {user.bio && (
                <p className="text-sm mt-1 line-clamp-2" style={{ color: 'hsl(var(--c2))' }}>
                  {user.bio}
                </p>
              )}
            </div>

            {/* Edit button */}
            {isOwnProfile && onEditClick && (
              <div className="pb-2 flex items-end">
                <Button variant="secondary" size="sm" onClick={onEditClick}>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
