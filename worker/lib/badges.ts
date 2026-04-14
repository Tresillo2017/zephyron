import type { Badge } from '../types'

export const BADGE_DEFINITIONS: Badge[] = [
  // ─── MILESTONE BADGES ────────────────────────────────────────────────
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined in the first month of beta',
    icon: '🌟',
    category: 'special',
    rarity: 'legendary',
    checkFn: async (userId, env) => {
      const user = await env.DB.prepare('SELECT created_at FROM user WHERE id = ?')
        .bind(userId).first() as { created_at: string } | null
      if (!user) return false
      return new Date(user.created_at) < new Date('2026-02-01')
    }
  },
  {
    id: 'sets_100',
    name: '100 Sets',
    description: 'Listen to 100 sets',
    icon: '💯',
    category: 'milestone',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(DISTINCT set_id) as count FROM listening_sessions WHERE user_id = ? AND qualifies = 1'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 100
    }
  },
  {
    id: 'sets_1000',
    name: '1000 Sets',
    description: 'Listen to 1000 sets',
    icon: '🎉',
    category: 'milestone',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(DISTINCT set_id) as count FROM listening_sessions WHERE user_id = ? AND qualifies = 1'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 1000
    }
  },
  {
    id: 'hours_100',
    name: '100 Hours',
    description: 'Listen to 100 hours of music',
    icon: '⏰',
    category: 'milestone',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT SUM(duration_seconds) as total FROM listening_sessions WHERE user_id = ?'
      ).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },
  {
    id: 'hours_1000',
    name: '1000 Hours',
    description: 'Listen to 1000 hours of music',
    icon: '🔥',
    category: 'milestone',
    rarity: 'epic',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT SUM(duration_seconds) as total FROM listening_sessions WHERE user_id = ?'
      ).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 1000
    }
  },
  {
    id: 'likes_100',
    name: '100 Likes',
    description: 'Like 100 songs',
    icon: '❤️',
    category: 'milestone',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM user_song_likes WHERE user_id = ?'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 100
    }
  },
  {
    id: 'playlists_10',
    name: 'Playlist Creator',
    description: 'Create 10 playlists',
    icon: '📁',
    category: 'milestone',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM playlists WHERE user_id = ?'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },

  // ─── BEHAVIOR PATTERN BADGES ─────────────────────────────────────────
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Listen to 10+ sets after midnight (12am-6am)',
    icon: '🦉',
    category: 'behavior',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM listening_sessions
        WHERE user_id = ?
          AND CAST(strftime('%H', started_at) as INTEGER) >= 0
          AND CAST(strftime('%H', started_at) as INTEGER) < 6
      `).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },
  {
    id: 'marathon_listener',
    name: 'Marathon Listener',
    description: 'Complete a single listening session over 4 hours',
    icon: '🏃',
    category: 'behavior',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT MAX(duration_seconds) as max_duration FROM listening_sessions WHERE user_id = ?'
      ).bind(userId).first() as { max_duration: number } | null
      return (result?.max_duration || 0) >= 4 * 3600
    }
  },
  {
    id: 'daily_devotee',
    name: 'Daily Devotee',
    description: 'Listen for 7 consecutive days',
    icon: '🔥',
    category: 'behavior',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      // Check if user has 7-day streak
      const result = await env.DB.prepare(
        'SELECT MAX(longest_streak_days) as streak FROM user_annual_stats WHERE user_id = ?'
      ).bind(userId).first() as { streak: number } | null
      return (result?.streak || 0) >= 7
    }
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: '80%+ of listening happens on weekends',
    icon: '🎉',
    category: 'behavior',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT
          SUM(CASE WHEN CAST(strftime('%w', started_at) AS INTEGER) IN (0, 6) THEN duration_seconds ELSE 0 END) as weekend,
          SUM(duration_seconds) as total
        FROM listening_sessions
        WHERE user_id = ?
      `).bind(userId).first() as { weekend: number; total: number } | null
      if (!result || result.total === 0) return false
      return (result.weekend / result.total) >= 0.8
    }
  },
  {
    id: 'commute_companion',
    name: 'Commute Companion',
    description: '80%+ of listening happens during commute hours (7-9am or 5-7pm)',
    icon: '🚗',
    category: 'behavior',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT
          SUM(CASE WHEN CAST(strftime('%H', started_at) AS INTEGER) IN (7, 8, 17, 18) THEN duration_seconds ELSE 0 END) as commute,
          SUM(duration_seconds) as total
        FROM listening_sessions
        WHERE user_id = ?
      `).bind(userId).first() as { commute: number; total: number } | null
      if (!result || result.total === 0) return false
      return (result.commute / result.total) >= 0.8
    }
  },

  // ─── GENRE EXPLORATION BADGES ────────────────────────────────────────
  {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    description: 'Listen to 10+ different genres',
    icon: '🎭',
    category: 'genre',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT COUNT(DISTINCT s.genre) as count
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND s.genre IS NOT NULL
      `).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },
  {
    id: 'techno_head',
    name: 'Techno Head',
    description: 'Listen to 100+ hours of techno',
    icon: '⚡',
    category: 'genre',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT SUM(ls.duration_seconds) as total
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND LOWER(s.genre) LIKE '%techno%'
      `).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },
  {
    id: 'house_master',
    name: 'House Master',
    description: 'Listen to 100+ hours of house music',
    icon: '🏠',
    category: 'genre',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT SUM(ls.duration_seconds) as total
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND LOWER(s.genre) LIKE '%house%'
      `).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },
  {
    id: 'trance_traveler',
    name: 'Trance Traveler',
    description: 'Listen to 100+ hours of trance',
    icon: '🌌',
    category: 'genre',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT SUM(ls.duration_seconds) as total
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND LOWER(s.genre) LIKE '%trance%'
      `).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },
  {
    id: 'melodic_maven',
    name: 'Melodic Maven',
    description: 'Listen to 100+ hours of melodic techno or progressive',
    icon: '🎵',
    category: 'genre',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT SUM(ls.duration_seconds) as total
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND (LOWER(s.genre) LIKE '%melodic%' OR LOWER(s.genre) LIKE '%progressive%')
      `).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },

  // ─── COMMUNITY BADGES ────────────────────────────────────────────────
  {
    id: 'curator',
    name: 'Curator',
    description: 'Create 10+ playlists',
    icon: '🎨',
    category: 'community',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM playlists WHERE user_id = ?'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },
  {
    id: 'annotator',
    name: 'Annotator',
    description: 'Have 10+ annotations approved',
    icon: '✍️',
    category: 'community',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM annotations WHERE user_id = ? AND status = ?'
      ).bind(userId, 'approved').first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },
  {
    id: 'detective',
    name: 'Detective',
    description: 'Have 50+ corrections approved',
    icon: '🔍',
    category: 'community',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM annotations WHERE user_id = ? AND annotation_type = ? AND status = ?'
      ).bind(userId, 'correction', 'approved').first() as { count: number } | null
      return (result?.count || 0) >= 50
    }
  },

  // ─── SPECIAL BADGES ──────────────────────────────────────────────────
  {
    id: 'wrapped_viewer',
    name: 'Wrapped Viewer',
    description: 'View your annual Wrapped',
    icon: '🎁',
    category: 'special',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM wrapped_images WHERE user_id = ?'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 1
    }
  },
  {
    id: 'festival_fanatic',
    name: 'Festival Fanatic',
    description: 'Listen to sets from 5+ different festival events',
    icon: '🎪',
    category: 'special',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT COUNT(DISTINCT s.event_id) as count
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND s.event_id IS NOT NULL
      `).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 5
    }
  }
]

// Helper to find badge by ID
export function getBadgeById(badgeId: string): Badge | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === badgeId)
}
