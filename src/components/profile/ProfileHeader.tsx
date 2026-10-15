import { Hero } from '../shell/Hero'
import { Button, Badge } from '../bleh'
import { getAvatarLarge } from '../../lib/avatar'
import { getPlaceholder } from '../../lib/placeholders'
import './profile.css'

interface ProfileHeaderProps {
  user: {
    id: string
    name: string
    avatar_url: string | null
    banner_url?: string | null
    bio?: string | null
    role?: string | null
  }
  isOwnProfile: boolean
  onEditClick?: () => void
  onAvatarClick?: () => void
  onBannerClick?: () => void
}

/**
 * Profile hero: full-bleed banner, overlapping round avatar, name, bio and actions.
 * Own-profile only actions are shown when the matching handler is passed.
 */
export function ProfileHeader({ user, isOwnProfile, onEditClick, onAvatarClick, onBannerClick }: ProfileHeaderProps) {
  const initial = user.name?.charAt(0).toUpperCase() || '?'
  const avatarSrc = user.avatar_url ? getAvatarLarge(user.avatar_url) || user.avatar_url : null

  const art = avatarSrc ? (
    <img
      src={avatarSrc}
      alt=""
      className="w-full h-full object-cover"
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
    />
  ) : (
    <span className="sh-hero-initial" aria-hidden="true">{initial}</span>
  )

  const artNode = isOwnProfile && onAvatarClick ? (
    <button type="button" className="sh-hero-art-button" onClick={onAvatarClick} aria-label="Change profile picture">
      {art}
    </button>
  ) : art

  const actions = isOwnProfile && (onEditClick || onBannerClick) ? (
    <>
      {onEditClick && <Button label="Edit profile" appearance="primary" size="sm" onClick={onEditClick} />}
      {onBannerClick && (
        <Button label={user.banner_url ? 'Change cover' : 'Add cover'} size="sm" onClick={onBannerClick} />
      )}
    </>
  ) : undefined

  return (
    <Hero
      image={user.banner_url ?? null}
      artShape="avatar"
      art={artNode}
      eyebrow={user.role ? <Badge>{user.role}</Badge> : undefined}
      title={user.name}
      meta={user.bio ? <p className="sh-hero-bio">{user.bio}</p> : undefined}
      actions={actions}
    />
  )
}
