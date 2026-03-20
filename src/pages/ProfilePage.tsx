import { Link } from 'react-router'
import { useSession, signOut } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export function ProfilePage() {
  const { data: session } = useSession()

  if (!session?.user) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-text-muted text-sm">Not signed in.</p>
        <Link to="/login" className="text-accent text-sm mt-2 inline-block no-underline hover:underline">
          Sign in
        </Link>
      </div>
    )
  }

  const user = session.user as any

  const tier =
    (user.reputation || 0) >= 500 ? { name: 'Expert', color: 'text-accent' }
      : (user.reputation || 0) >= 100 ? { name: 'Contributor', color: 'text-warning' }
      : (user.reputation || 0) >= 10 ? { name: 'Active', color: 'text-text-primary' }
      : { name: 'Newcomer', color: 'text-text-muted' }

  return (
    <div className="px-5 sm:px-8 py-8 sm:py-12 max-w-4xl mx-auto">
      {/* Profile header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center text-accent text-2xl font-bold">
            {user.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{user.name}</h1>
            <p className="text-sm text-text-secondary">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="accent">{user.role || 'user'}</Badge>
              <span className={`text-sm font-medium ${tier.color}`}>{tier.name}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-raised border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent">{user.reputation || 0}</p>
          <p className="text-xs text-text-muted">Reputation</p>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{user.totalAnnotations || user.total_annotations || 0}</p>
          <p className="text-xs text-text-muted">Annotations</p>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{user.totalVotes || user.total_votes || 0}</p>
          <p className="text-xs text-text-muted">Votes</p>
        </div>
      </div>

      {/* Reputation breakdown */}
      <div className="bg-surface-raised border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">How reputation works</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between text-text-secondary">
            <span>Annotation approved</span>
            <span className="text-accent">+10 pts</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Vote on detection</span>
            <span className="text-accent">+1 pt</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Correction confirmed</span>
            <span className="text-accent">+25 pts</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Annotation rejected</span>
            <span className="text-danger">-5 pts</span>
          </div>
        </div>
      </div>
    </div>
  )
}
