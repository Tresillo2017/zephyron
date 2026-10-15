import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '../lib/auth-client'
import { PageSidebar } from '../components/layout/PageSidebar'
import { InviteCodesTab } from '../components/admin/InviteCodesTab'
import { ModerationTab } from '../components/admin/ModerationTab'
import { UsersTab } from '../components/admin/UsersTab'
import { ArtistsTab } from '../components/admin/ArtistsTab'
import { EventsTab } from '../components/admin/EventsTab'
import { SongsTab } from '../components/admin/SongsTab'
import { SetsListTab } from '../components/admin/SetsListTab'


type Tab = 'sets' | 'songs' | 'artists' | 'events' | 'users' | 'invites' | 'moderation'


const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'sets', label: 'Sets', icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
  { id: 'songs', label: 'Songs', icon: 'M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' },
  { id: 'artists', label: 'Artists', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  { id: 'events', label: 'Events', icon: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z' },
  { id: 'users', label: 'Users', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  { id: 'invites', label: 'Invites', icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' },
  { id: 'moderation', label: 'Moderation', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z' },
]

export function AdminPage() {
  const { data: session } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const editId = searchParams.get('edit') || undefined
  const [activeTab, setActiveTab] = useState<Tab>(tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'sets')

  // Sync tab changes to URL
  const handleTabChange = (tabId: string) => {
    const tab = tabId as Tab
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
  }

  // Check admin role
  if (session?.user?.role !== 'admin') {
    return (
      <div className="px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-text-primary mb-2">Access Denied</h2>
        <p className="text-sm text-text-secondary">You need admin privileges to access this page.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <PageSidebar
        title="Admin"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Content */}
      <main className="flex-1 min-w-0 py-6 pr-6 lg:pr-10 pl-6">
        {activeTab === 'sets' && <SetsListTab editId={editId} />}
        {activeTab === 'songs' && <SongsTab />}
        {activeTab === 'artists' && <ArtistsTab editId={editId} />}
        {activeTab === 'events' && <EventsTab editId={editId} />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'invites' && <InviteCodesTab />}
        {activeTab === 'moderation' && <ModerationTab />}
      </main>
    </div>
  )
}
