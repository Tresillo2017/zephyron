// Shared types for Worker API
export interface DjSet {
  id: string
  title: string
  artist: string
  description: string | null
  genre: string | null
  subgenre: string | null
  venue: string | null
  event: string | null
  event_id: string | null
  recorded_date: string | null
  duration_seconds: number
  r2_key: string // Deprecated for Invidious sets (empty string)
  r2_waveform_key: string | null // Deprecated for Invidious sets
  cover_image_r2_key: string | null
  audio_format: string
  bitrate: number | null
  sample_rate: number | null
  file_size_bytes: number | null
  detection_status: 'pending' | 'processing' | 'complete' | 'failed'
  detection_version: number
  play_count: number
  // Invidious/YouTube fields (v0.2.3+)
  stream_type: 'invidious' | 'r2' | null
  youtube_video_id: string | null
  youtube_channel_id: string | null
  youtube_channel_name: string | null
  youtube_published_at: string | null
  youtube_view_count: number | null
  youtube_like_count: number | null
  storyboard_data: string | null
  keywords: string | null
  youtube_music_tracks: string | null
  // 1001Tracklists fields
  tracklist_1001_url: string | null
  tracklist_1001_id: string | null
  // Video streaming
  youtube_video_stream_url: string | null
  youtube_video_stream_expires: number | null
  created_at: string
  updated_at: string
}

export interface Song {
  id: string
  title: string
  artist: string
  label: string | null
  album: string | null
  cover_art_url: string | null
  cover_art_r2_key: string | null
  spotify_url: string | null
  apple_music_url: string | null
  soundcloud_url: string | null
  beatport_url: string | null
  youtube_url: string | null
  deezer_url: string | null
  bandcamp_url: string | null
  traxsource_url: string | null
  lastfm_url: string | null
  lastfm_track_mbid: string | null
  lastfm_album: string | null
  lastfm_album_art: string | null
  lastfm_duration_ms: number | null
  lastfm_tags: string | null
  lastfm_listeners: number | null
  source: string | null
  external_id: string | null
  created_at: string
  updated_at: string
}

export interface Detection {
  id: string
  set_id: string
  track_title: string
  track_artist: string | null
  start_time_seconds: number
  end_time_seconds: number | null
  confidence: number
  detection_method: string | null
  ml_model_version: string | null
  upvotes: number
  downvotes: number
  is_verified: number
  song_id: string | null
  created_at: string
  updated_at: string
}

export interface Annotation {
  id: string
  detection_id: string | null
  set_id: string
  user_id: string | null
  anonymous_id: string | null
  track_title: string
  track_artist: string | null
  start_time_seconds: number
  end_time_seconds: number | null
  annotation_type: 'correction' | 'new_track' | 'delete'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface Vote {
  id: string
  detection_id: string
  user_id: string | null
  anonymous_id: string | null
  vote: 1 | -1
  created_at: string
}

export interface User {
  id: string
  email: string | null
  name: string  // Display name (editable by user)
  avatar_url: string | null
  bio: string | null
  is_profile_public: boolean
  role: 'listener' | 'annotator' | 'curator' | 'admin'
  created_at: string

  // Deprecated (keep for backward compatibility, remove in Phase 3):
  reputation?: number
  total_annotations?: number
  total_votes?: number
}

export interface PublicUser {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  role: string
  created_at: string
  // Email excluded for privacy
}

export interface Playlist {
  id: string
  user_id: string | null
  anonymous_id: string | null
  title: string
  description: string | null
  is_public: number
  created_at: string
  updated_at: string
}

export interface PlaylistItem {
  id: string
  playlist_id: string
  set_id: string
  position: number
  added_at: string
}

export interface ListenHistory {
  id: string
  user_id: string | null
  anonymous_id: string | null
  set_id: string
  last_position_seconds: number
  listen_count: number
  last_listened_at: string
}

// API response wrappers
export interface ApiResponse<T> {
  data: T
  ok: true
}

export interface ApiError {
  error: string
  ok: false
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  ok: true
}

// Events
export interface EventInfo {
  id: string
  name: string
  slug: string | null
  series: string | null
  description: string | null
  website: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  cover_image_r2_key: string | null
  logo_r2_key: string | null
  tags: string | null
  year: number | null
  created_at: string
  // 1001Tracklists integration
  source_1001_id: string | null
  // Social links
  facebook_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  x_url: string | null
  // Aftermovie
  aftermovie_url: string | null
}

export interface EventArtist {
  id: string
  name: string
  slug: string | null
  image_url: string | null
}

export interface EventGenreBreakdown {
  genre: string
  count: number
}

// Profile API types

export interface UploadAvatarResponse {
  success: true
  avatar_url: string
}

export interface UploadAvatarError {
  error: 'NO_FILE' | 'INVALID_FORMAT' | 'FILE_TOO_LARGE' | 'CORRUPT_IMAGE' | 'UPLOAD_FAILED' | 'RESIZE_FAILED'
  message?: string
}

export interface UpdateProfileSettingsRequest {
  name?: string
  bio?: string
  is_profile_public?: boolean
}

export interface UpdateProfileSettingsResponse {
  success: true
  user: User
}

export interface UpdateProfileSettingsError {
  error: 'DISPLAY_NAME_TOO_SHORT' | 'DISPLAY_NAME_TOO_LONG' | 'DISPLAY_NAME_INVALID' | 'DISPLAY_NAME_TAKEN' | 'BIO_TOO_LONG'
  message?: string
}

export interface GetPublicProfileResponse {
  user: PublicUser
}

export interface GetPublicProfileError {
  error: 'PROFILE_PRIVATE' | 'USER_NOT_FOUND'
}

// Profile Stats types
export interface ProfileStats {
  total_hours: number
  total_sessions: number
  average_session_minutes: number
  longest_session_minutes: number
  top_artists: { artist: string; hours: number }[]
  top_genres: { genre: string; count: number }[]
  discoveries_count: number
  longest_streak_days: number
  listening_heatmap: number[][]
  weekday_pattern: { day: string; hours: number }[]
}

export interface GetStatsResponse {
  stats: ProfileStats
}

export interface GetStatsError {
  error: 'INVALID_USER_ID' | 'USER_NOT_FOUND' | 'PROFILE_PRIVATE' | 'STATS_UNAVAILABLE'
  message?: string
}

// Badge types
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: 'milestone' | 'behavior' | 'genre' | 'time' | 'community' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  checkFn: (userId: string, env: Env) => Promise<boolean>
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface GetBadgesResponse {
  badges: UserBadge[]
}

export interface GetBadgesError {
  error: 'INVALID_USER_ID' | 'USER_NOT_FOUND' | 'PROFILE_PRIVATE'
}

// Activity types
export interface ActivityItem {
  id: string
  user_id: string
  user_name?: string
  user_avatar_url?: string
  activity_type: 'badge_earned' | 'song_liked' | 'playlist_created' |
    'playlist_updated' | 'annotation_approved' | 'milestone_reached'
  metadata: Record<string, any>
  is_public: boolean
  created_at: string
}

export interface GetActivityResponse {
  items: ActivityItem[]
  total: number
  page: number
  hasMore: boolean
}

export interface GetActivityError {
  error: 'UNAUTHORIZED' | 'INVALID_USER_ID' | 'PROFILE_PRIVATE' | 'INVALID_PAGE'
}

// Cloudflare Worker Environment
export interface Env {
  DB: D1Database
  AUDIO_BUCKET: R2Bucket
  AVATARS: R2Bucket
  WRAPPED_IMAGES: R2Bucket
  AUDIO_SESSION: DurableObjectNamespace
  ML_QUEUE: Queue
  COVER_ART_QUEUE: Queue
  FEEDBACK_QUEUE: Queue
  LASTFM_API_KEY: string
  DISCORD_BOT_WEBHOOK_URL: string
  DISCORD_WEBHOOK_SECRET: string
  BETTER_AUTH_URL: string
  BETTER_AUTH_SECRET: string
  INVIDIOUS_BASE_URL: string
  YOUTUBE_API_KEY: string
}
