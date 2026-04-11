import { create } from 'zustand'
import type { ProfileStats } from '../lib/types'

interface ProfileStore {
  // Stats state
  stats: ProfileStats | null
  statsLoading: boolean
  statsError: string | null
  statsCachedAt: number | null

  // Actions
  fetchStats: (userId: string, period?: string) => Promise<void>
  clearStats: () => void
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  // Initial state
  stats: null,
  statsLoading: false,
  statsError: null,
  statsCachedAt: null,

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
  }
}))
