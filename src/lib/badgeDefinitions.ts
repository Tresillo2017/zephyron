import type { Badge } from './types'

// Frontend-only badge definitions (metadata only, no checkFn)
export const BADGE_DEFINITIONS: Omit<Badge, 'checkFn'>[] = [
  // Milestone Badges
  { id: 'early_adopter', name: 'Early Adopter', description: 'Joined in the first month of beta', icon: '🌟', category: 'special', rarity: 'legendary' },
  { id: 'sets_100', name: '100 Sets', description: 'Listen to 100 sets', icon: '💯', category: 'milestone', rarity: 'common' },
  { id: 'sets_1000', name: '1000 Sets', description: 'Listen to 1000 sets', icon: '🎉', category: 'milestone', rarity: 'rare' },
  { id: 'hours_100', name: '100 Hours', description: 'Listen to 100 hours of music', icon: '⏰', category: 'milestone', rarity: 'common' },
  { id: 'hours_1000', name: '1000 Hours', description: 'Listen to 1000 hours of music', icon: '🔥', category: 'milestone', rarity: 'epic' },
  { id: 'likes_100', name: '100 Likes', description: 'Like 100 songs', icon: '❤️', category: 'milestone', rarity: 'common' },
  { id: 'playlists_10', name: 'Playlist Creator', description: 'Create 10 playlists', icon: '📁', category: 'milestone', rarity: 'common' },

  // Behavior Pattern Badges
  { id: 'night_owl', name: 'Night Owl', description: 'Listen to 10+ sets after midnight (12am-6am)', icon: '🦉', category: 'behavior', rarity: 'rare' },
  { id: 'marathon_listener', name: 'Marathon Listener', description: 'Complete a single listening session over 4 hours', icon: '🏃', category: 'behavior', rarity: 'rare' },
  { id: 'daily_devotee', name: 'Daily Devotee', description: 'Listen for 7 consecutive days', icon: '🔥', category: 'behavior', rarity: 'rare' },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: '80%+ of listening happens on weekends', icon: '🎉', category: 'behavior', rarity: 'common' },
  { id: 'commute_companion', name: 'Commute Companion', description: '80%+ of listening happens during commute hours (7-9am or 5-7pm)', icon: '🚗', category: 'behavior', rarity: 'common' },

  // Genre Exploration Badges
  { id: 'genre_explorer', name: 'Genre Explorer', description: 'Listen to 10+ different genres', icon: '🎭', category: 'genre', rarity: 'common' },
  { id: 'techno_head', name: 'Techno Head', description: 'Listen to 100+ hours of techno', icon: '⚡', category: 'genre', rarity: 'rare' },
  { id: 'house_master', name: 'House Master', description: 'Listen to 100+ hours of house music', icon: '🏠', category: 'genre', rarity: 'rare' },
  { id: 'trance_traveler', name: 'Trance Traveler', description: 'Listen to 100+ hours of trance', icon: '🌌', category: 'genre', rarity: 'rare' },
  { id: 'melodic_maven', name: 'Melodic Maven', description: 'Listen to 100+ hours of melodic techno or progressive', icon: '🎵', category: 'genre', rarity: 'rare' },

  // Community Badges
  { id: 'curator', name: 'Curator', description: 'Create 10+ playlists', icon: '🎨', category: 'community', rarity: 'common' },
  { id: 'annotator', name: 'Annotator', description: 'Have 10+ annotations approved', icon: '✍️', category: 'community', rarity: 'common' },
  { id: 'detective', name: 'Detective', description: 'Have 50+ corrections approved', icon: '🔍', category: 'community', rarity: 'rare' },

  // Special Badges
  { id: 'wrapped_viewer', name: 'Wrapped Viewer', description: 'View your annual Wrapped', icon: '🎁', category: 'special', rarity: 'common' },
  { id: 'festival_fanatic', name: 'Festival Fanatic', description: 'Listen to sets from 5+ different festival events', icon: '🎪', category: 'special', rarity: 'common' }
]

export function getBadgeById(badgeId: string): Omit<Badge, 'checkFn'> | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === badgeId)
}
