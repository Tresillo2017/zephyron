// Auth store is now a thin wrapper around Better Auth's useSession hook.
// This file re-exports the auth client for convenience and provides
// a simple Zustand store for non-React contexts (like the API client headers).

import { create } from 'zustand'

interface AuthState {
  /** Whether the user is authenticated (derived from Better Auth session) */
  isAuthenticated: boolean
  /** Set by the session hook when it resolves */
  setAuthenticated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}))
