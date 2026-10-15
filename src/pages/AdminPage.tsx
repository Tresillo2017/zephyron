import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '../lib/auth-client'
import { ContentCard, EmptyState, ToolbarTabs } from '../components/bleh'
import { InviteCodesTab } from '../components/admin/InviteCodesTab'
import { ModerationTab } from '../components/admin/ModerationTab'
import { UsersTab } from '../components/admin/UsersTab'
import { ArtistsTab } from '../components/admin/ArtistsTab'
import { EventsTab } from '../components/admin/EventsTab'
import { SongsTab } from '../components/admin/SongsTab'
import { SetsListTab } from '../components/admin/SetsListTab'

type Tab = 'sets' | 'songs' | 'artists' | 'events' | 'users' | 'invites' | 'moderation'

const TABS: { key: Tab; label: string }[] = [
  { key: 'sets', label: 'Sets' },
  { key: 'songs', label: 'Songs' },
  { key: 'artists', label: 'Artists' },
  { key: 'events', label: 'Events' },
  { key: 'users', label: 'Users' },
  { key: 'invites', label: 'Invites' },
  { key: 'moderation', label: 'Moderation' },
]

export function AdminPage() {
  const { data: session } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const editId = searchParams.get('edit') || undefined
  const [activeTab, setActiveTab] = useState<Tab>(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : 'sets')

  // Sync tab changes to URL
  const handleTabChange = (tabId: string) => {
    const tab = tabId as Tab
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
  }

  // Check admin role
  if (session?.user?.role !== 'admin') {
    return (
      <main className="px-6 py-6 lg:px-10">
        <ContentCard
          main={
            <EmptyState
              title="Access denied"
              description="You need admin privileges to access this page."
            />
          }
        />
      </main>
    )
  }

  return (
    <main className="px-6 py-6 lg:px-10">
      <h1 className="sr-only">Admin</h1>
      <ContentCard
        toolbar={<ToolbarTabs tabs={TABS} active={activeTab} onChange={handleTabChange} />}
        main={
          <>
            {activeTab === 'sets' && <SetsListTab editId={editId} />}
            {activeTab === 'songs' && <SongsTab />}
            {activeTab === 'artists' && <ArtistsTab editId={editId} />}
            {activeTab === 'events' && <EventsTab editId={editId} />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'invites' && <InviteCodesTab />}
            {activeTab === 'moderation' && <ModerationTab />}
          </>
        }
      />
    </main>
  )
}
