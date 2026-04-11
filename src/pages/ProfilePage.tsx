import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession, signOut, getSession } from '../lib/auth-client'
import { fetchHistory, fetchPlaylists, fetchMonthlyWrapped } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatRelativeTime } from '../lib/formatTime'
import { TabBar } from '../components/ui/TabBar'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfilePictureUpload } from '../components/profile/ProfilePictureUpload'
import { ProfileStatsSection } from '../components/profile/ProfileStatsSection'
import { BadgesGrid } from '../components/profile/BadgesGrid'
import { ActivityFeed } from '../components/activity/ActivityFeed'

export function ProfilePage() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const [recentCount, setRecentCount] = useState(0)
  const [playlistCount, setPlaylistCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'badges' | 'playlists' | 'about'>('overview')
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [currentMonthStats, setCurrentMonthStats] = useState<{ total_hours: number } | null>(null)

  useEffect(() => {
    fetchHistory().then((r) => setRecentCount(r.data?.length || 0)).catch(() => {})
    fetchPlaylists().then((r) => setPlaylistCount(r.data?.length || 0)).catch(() => {})

    // Fetch current month stats
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    fetchMonthlyWrapped(currentYear, currentMonth)
      .then((data) => setCurrentMonthStats({ total_hours: data.total_hours }))
      .catch(() => {})
  }, [])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'badges', label: 'Badges' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'about', label: 'About' },
  ]

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

  // Initialize avatarUrl from user data
  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url)
    }
  }, [user?.avatar_url])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Quick Stats Section */}
        {currentMonthStats && (
          <div className="card">
            <h3 className="text-sm font-[var(--font-weight-medium)] mb-4" style={{ color: 'hsl(var(--c1))' }}>
              This Month
            </h3>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--h3))' }}>
                {Math.round(currentMonthStats.total_hours * 10) / 10}
              </p>
              <p className="text-sm mb-1" style={{ color: 'hsl(var(--c2))' }}>
                hours listened
              </p>
            </div>
          </div>
        )}

        {/* Wrapped CTA Section */}
        <div className="card">
          <h3 className="text-sm font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--c1))' }}>
            Your {new Date().getFullYear()} Wrapped
          </h3>
          <p className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>
            See your year in electronic music
          </p>
          <Link to={`/app/wrapped/${new Date().getFullYear()}`} className="no-underline">
            <Button variant="primary" className="w-full justify-center">
              View Wrapped
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <ProfileHeader
          user={{
            ...user,
            avatar_url: avatarUrl,
          }}
          isOwnProfile={true}
          onEditClick={() => navigate('/app/settings?tab=profile')}
          onAvatarClick={() => setShowAvatarUpload(true)}
        />

        {/* TabBar */}
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
        />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { value: playlistCount, label: 'Playlists' },
                { value: 0, label: 'Liked Songs' },
                { value: recentCount, label: 'Sets Listened' },
              ].map((stat) => (
                <div key={stat.label} className="card !p-4">
                  <p className="text-2xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--c3))' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Listening Statistics */}
            <ProfileStatsSection userId={user.id} />

            {/* Recent Activity Placeholder */}
            <div className="card">
              <h3 className="text-sm font-[var(--font-weight-medium)] mb-3" style={{ color: 'hsl(var(--c1))' }}>
                Recent Activity
              </h3>
              <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
                Activity feed coming in Phase 3
              </p>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <ActivityFeed feed="user" userId={user.id} limit={5} />
        )}

        {activeTab === 'badges' && (
          <BadgesGrid userId={user.id} />
        )}

        {activeTab === 'playlists' && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>
                Playlists
              </h3>
              <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
                {playlistCount} {playlistCount === 1 ? 'playlist' : 'playlists'}
              </span>
            </div>
            <p className="text-sm mb-3" style={{ color: 'hsl(var(--c3))' }}>
              Manage your playlists
            </p>
            <Link
              to="/app/playlists"
              className="inline-flex items-center gap-2 text-sm no-underline hover:underline"
              style={{ color: 'hsl(var(--h3))' }}
            >
              View all playlists
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="card">
            <h3 className="text-sm font-[var(--font-weight-medium)] mb-4" style={{ color: 'hsl(var(--c1))' }}>
              About
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Role</span>
                <Badge variant="accent">{user.role || 'user'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Joined</span>
                <span className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
                  {user.createdAt ? formatRelativeTime(user.createdAt) : 'Unknown'}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid hsl(var(--b4) / 0.25)' }}>
              <Button variant="ghost" onClick={handleSignOut} className="w-full justify-center">
                Sign out
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <ProfilePictureUpload
          currentAvatarUrl={avatarUrl}
          onUploadSuccess={async (url) => {
            setAvatarUrl(url)
            // Refresh session to update avatar in TopNav
            await getSession()
          }}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}
    </div>
  )
}
