import { create } from 'zustand'
import type { ProfileStats, UserBadge, ActivityItem, ActivityPrivacySettings } from '../lib/types'

interface ProfileStore {
  // Stats state
  stats: ProfileStats | null
  statsLoading: boolean
  statsError: string | null
  statsCachedAt: number | null

  // Badges state
  badges: UserBadge[]
  badgesLoading: boolean
  badgesError: string | null
  badgesCachedAt: number | null

  // Activity state
  activityFeed: ActivityItem[]
  activityPage: number
  activityTotal: number
  activityHasMore: boolean
  activityLoading: boolean
  activityError: string | null
  currentFeedType: 'me' | 'user' | 'community' | null
  currentFeedUserId: string | null
  privacySettings: ActivityPrivacySettings | null

  // Actions
  fetchStats: (userId: string, period?: string) => Promise<void>
  clearStats: () => void
  fetchBadges: (userId: string) => Promise<void>
  clearBadges: () => void
  fetchActivity: (feed: 'me' | 'user' | 'community', userId?: string, page?: number) => Promise<void>
  loadMoreActivity: () => Promise<void>
  fetchPrivacySettings: () => Promise<void>
  updatePrivacySetting: (activityType: string, isVisible: boolean) => Promise<void>
  clearActivity: () => void
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  // Stats initial state
  stats: null,
  statsLoading: false,
  statsError: null,
  statsCachedAt: null,

  // Badges initial state
  badges: [],
  badgesLoading: false,
  badgesError: null,
  badgesCachedAt: null,

  // Activity initial state
  activityFeed: [],
  activityPage: 1,
  activityTotal: 0,
  activityHasMore: false,
  activityLoading: false,
  activityError: null,
  currentFeedType: null,
  currentFeedUserId: null,
  privacySettings: null,

  // Fetch stats with 5-minute caching
  fetchStats: async (userId: string, period: string = 'all') => {
    const now = Date.now()
    const cached = get().statsCachedAt

    // Return cached if less than 5 minutes old
    if (cached && now - cached < 5 * 60 * 1000 && get().stats) {
      return
    }

    set({ statsLoading: true, statsError: null })

    try {
      const url = `/api/profile/${userId}/stats?period=${period}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch stats')
      }

      const data = await response.json()
      set({
        stats: data.stats,
        statsLoading: false,
        statsCachedAt: now
      })
    } catch (error) {
      set({
        statsError: error instanceof Error ? error.message : 'Unknown error',
        statsLoading: false
      })
    }
  },

  clearStats: () => {
    set({
      stats: null,
      statsError: null,
      statsCachedAt: null
    })
  },

  // Fetch badges with 10-minute caching
  fetchBadges: async (userId: string) => {
    const now = Date.now()
    const cached = get().badgesCachedAt

    if (cached && now - cached < 10 * 60 * 1000 && get().badges.length > 0) {
      return
    }

    set({ badgesLoading: true, badgesError: null })

    try {
      const response = await fetch(`/api/profile/${userId}/badges`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch badges')
      }

      const data = await response.json()
      set({
        badges: data.badges,
        badgesLoading: false,
        badgesCachedAt: now
      })
    } catch (error) {
      set({
        badgesError: error instanceof Error ? error.message : 'Unknown error',
        badgesLoading: false
      })
    }
  },

  clearBadges: () => {
    set({
      badges: [],
      badgesError: null,
      badgesCachedAt: null
    })
  },

  // Fetch activity feed
  fetchActivity: async (feed: 'me' | 'user' | 'community', userId?: string, page: number = 1) => {
    set({ activityLoading: true, activityError: null })

    try {
      let url = ''
      if (feed === 'me') {
        url = `/api/activity/me?page=${page}`
      } else if (feed === 'user' && userId) {
        url = `/api/activity/user/${userId}`
      } else if (feed === 'community') {
        url = `/api/activity/community?page=${page}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch activity')
      }

      const data = await response.json()

      set({
        activityFeed: page === 1 ? data.items : [...get().activityFeed, ...data.items],
        activityPage: data.page,
        activityTotal: data.total,
        activityHasMore: data.hasMore,
        activityLoading: false,
        currentFeedType: feed,
        currentFeedUserId: userId || null
      })
    } catch (error) {
      set({
        activityError: error instanceof Error ? error.message : 'Unknown error',
        activityLoading: false
      })
    }
  },

  // Load more activity (pagination)
  loadMoreActivity: async () => {
    const { currentFeedType, currentFeedUserId, activityHasMore, activityPage, activityLoading } = get()

    if (!activityHasMore || activityLoading || !currentFeedType) return

    await get().fetchActivity(currentFeedType, currentFeedUserId || undefined, activityPage + 1)
  },

  // Fetch privacy settings
  fetchPrivacySettings: async () => {
    try {
      const response = await fetch('/api/profile/privacy')

      if (!response.ok) {
        throw new Error('Failed to fetch privacy settings')
      }

      const data = await response.json()
      set({ privacySettings: data.settings })
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error)
    }
  },

  // Update privacy setting
  updatePrivacySetting: async (activityType: string, isVisible: boolean) => {
    try {
      const response = await fetch('/api/profile/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_type: activityType, is_visible: isVisible })
      })

      if (!response.ok) {
        throw new Error('Failed to update privacy setting')
      }

      // Update local state
      const currentSettings = get().privacySettings || {} as ActivityPrivacySettings
      set({
        privacySettings: {
          ...currentSettings,
          [activityType]: isVisible
        }
      })
    } catch (error) {
      console.error('Failed to update privacy setting:', error)
      throw error
    }
  },

  // Clear activity
  clearActivity: () => {
    set({
      activityFeed: [],
      activityPage: 1,
      activityTotal: 0,
      activityHasMore: false,
      activityError: null,
      currentFeedType: null,
      currentFeedUserId: null
    })
  }
}))
