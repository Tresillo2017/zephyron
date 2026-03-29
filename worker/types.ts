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
  display_name: string | null
  avatar_url: string | null
  role: 'listener' | 'annotator' | 'curator' | 'admin'
  reputation: number
  total_annotations: number
  total_votes: number
  created_at: string
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
  created_at: string
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
