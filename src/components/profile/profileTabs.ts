import type { ExtendedUser } from '../../lib/auth-types'

/** Profile tab ids. `privacy`..`about` live under the Settings tab; the ids are also deep-link targets (`?tab=about`). */
export type ProfileTab =
  | 'overview'
  | 'activity'
  | 'badges'
  | 'playlists'
  | 'liked-songs'
  | 'history'
  | 'privacy'
  | 'appearance'
  | 'security'
  | 'account'
  | 'about'

export const MAIN_TABS: readonly { id: Exclude<ProfileTab, SettingsTab>; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'badges', label: 'Badges' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'liked-songs', label: 'Liked Songs' },
  { id: 'history', label: 'History' },
]

export type SettingsTab = 'privacy' | 'appearance' | 'security' | 'account' | 'about'

export const SETTINGS_TABS: readonly { id: SettingsTab; label: string }[] = [
  { id: 'privacy', label: 'Privacy' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'security', label: 'Security' },
  { id: 'account', label: 'Account' },
  { id: 'about', label: 'About' },
]

const ALL_TABS: readonly ProfileTab[] = [...MAIN_TABS.map((t) => t.id), ...SETTINGS_TABS.map((t) => t.id)]

export function isSettingsTab(tab: ProfileTab): tab is SettingsTab {
  return SETTINGS_TABS.some((t) => t.id === tab)
}

/** Unknown or missing values fall back to Overview. */
export function parseProfileTab(raw: string | null): ProfileTab {
  return ALL_TABS.find((t) => t === raw) ?? 'overview'
}

/** Session user plus the fields the profile reads that the shared type omits. */
export type ProfileUser = ExtendedUser & {
  role?: string | null
  twoFactorEnabled?: boolean | null
}
