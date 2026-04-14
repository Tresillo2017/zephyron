import type { UserBadge, Badge } from '../../lib/types'

interface BadgeCardProps {
  userBadge?: UserBadge  // If earned
  badge?: Badge          // If locked
  locked?: boolean
}

export function BadgeCard({ userBadge, badge, locked = false }: BadgeCardProps) {
  const badgeDef = userBadge?.badge || badge
  if (!badgeDef) return null

  const formattedDate = userBadge
    ? new Date(userBadge.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '?????'

  return (
    <div
      className="card p-4 flex flex-col items-center text-center relative cursor-pointer hover:scale-105 transition-transform"
      title={badgeDef.description}
      style={{
        opacity: locked ? 0.5 : 1
      }}
    >
      {locked && (
        <div className="absolute top-2 right-2 text-xs">🔒</div>
      )}

      <div
        className="text-4xl mb-2"
        style={{ filter: locked ? 'grayscale(100%)' : 'none' }}
      >
        {badgeDef.icon}
      </div>

      <div
        className="text-sm font-[var(--font-weight-bold)] mb-1 line-clamp-2"
        style={{ color: 'hsl(var(--c1))' }}
      >
        {badgeDef.name}
      </div>

      <div
        className="text-xs font-mono"
        style={{ color: 'hsl(var(--c3))' }}
      >
        {formattedDate}
      </div>
    </div>
  )
}
