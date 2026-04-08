import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession, signOut } from '../lib/auth-client'
import { fetchHistory, fetchPlaylists } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatRelativeTime } from '../lib/formatTime'

export function ProfilePage() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const [recentCount, setRecentCount] = useState(0)
  const [playlistCount, setPlaylistCount] = useState(0)

  useEffect(() => {
    fetchHistory().then((r) => setRecentCount(r.data?.length || 0)).catch(() => {})
    fetchPlaylists().then((r) => setPlaylistCount(r.data?.length || 0)).catch(() => {})
  }, [])

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Not signed in.</p>
          <Link to="/login" className="text-sm mt-2 inline-block no-underline hover:underline" style={{ color: 'hsl(var(--h3))' }}>Sign in</Link>
        </div>
      </div>
    )
  }

  const user = session.user as any

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── MAIN COLUMN ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Profile header card */}
          <div className="card">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-[var(--card-radius)] flex items-center justify-center shrink-0 text-3xl font-[var(--font-weight-bold)]"
                style={{ background: 'hsl(var(--h3) / 0.12)', color: 'hsl(var(--h3))' }}
              >
                {user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-[var(--font-weight-bold)] truncate" style={{ color: 'hsl(var(--c1))' }}>
                  {user.name}
                </h1>
                <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--c3))' }}>{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="accent">{user.role || 'user'}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { value: playlistCount, label: 'Playlists', accent: false },
              { value: 0, label: 'Liked Songs', accent: false },
              { value: recentCount, label: 'Sets Listened', accent: false },
            ].map((stat) => (
              <div key={stat.label} className="card !p-4">
                <p className="text-2xl font-[var(--font-weight-bold)]" style={{ color: stat.accent ? 'hsl(var(--h3))' : 'hsl(var(--c1))' }}>
                  {stat.value}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--c3))' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="lg:w-[300px] shrink-0 space-y-5">

          {/* Quick actions */}
          <div className="card">
            <h3 className="text-xs mb-3" style={{ color: 'hsl(var(--c3))' }}>Quick actions</h3>
            <div className="space-y-0.5">
              {[
                { to: '/app/playlists', label: 'My Playlists', count: playlistCount, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                { to: '/app/history', label: 'Listening History', count: recentCount, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                { to: '/app/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors"
                  style={{ color: 'hsl(var(--c2))' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--b3) / 0.4)'; e.currentTarget.style.color = 'hsl(var(--c1))' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'hsl(var(--c2))' }}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--c3))' }}>{item.count}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Account info */}
          <div className="card">
            <h3 className="text-xs mb-3" style={{ color: 'hsl(var(--c3))' }}>Account</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Role</span>
                <span className="text-sm" style={{ color: 'hsl(var(--c1))' }}>{user.role || 'user'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Joined</span>
                <span className="text-sm" style={{ color: 'hsl(var(--c2))' }}>{user.createdAt ? formatRelativeTime(user.createdAt) : 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <Button variant="ghost" onClick={handleSignOut} className="w-full justify-center">
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
