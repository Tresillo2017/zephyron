// Frontend shared types — mirrors worker/types.ts for the client

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
  r2_key: string // Deprecated for Invidious sets
  r2_waveform_key: string | null // Deprecated for Invidious sets
  cover_image_r2_key: string | null
  video_preview_r2_key: string | null
  audio_format: string
  bitrate: number | null
  sample_rate: number | null
  file_size_bytes: number | null
  detection_status: 'pending' | 'processing' | 'complete' | 'failed'
  detection_version: number
  play_count: number
  // Invidious/YouTube fields (v0.2.3+)
  stream_type: 'invidious' | 'r2' | 'soundcloud' | 'hearthis' | null
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
  song: Song | null
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
  lastfm_album_art: string | null
  lastfm_album: string | null
  lastfm_tags: string | null
  lastfm_listeners: number | null
  source?: string | null
  external_id?: string | null
  detection_count?: number
  like_count?: number
  created_at?: string
  updated_at?: string
}

export interface DjSetWithDetections extends DjSet {
  detections: Detection[]
  artist_info?: {
    id: string
    name: string
    slug: string | null
    image_url: string | null
    bio_summary: string | null
    tags: string | null
    lastfm_url: string | null
    listeners: number
  } | null
  set_artists?: {
    id: string
    name: string
    slug: string | null
    image_url: string | null
    position: number
  }[]
  event_info?: EventInfo | null
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
  tags: string[] | null
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

export interface EventEdition {
  id: string
  slug: string | null
  year: number | null
  name: string
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

export interface Playlist {
  id: string
  user_id: string | null
  anonymous_id: string | null
  title: string
  description: string | null
  is_public: number
  item_count?: number
  created_at: string
  updated_at: string
}

export interface PlaylistWithItems extends Playlist {
  items: PlaylistItem[]
}

export interface PlaylistItem {
  id: string
  playlist_id: string
  set_id: string
  position: number
  added_at: string
  // Joined fields
  title?: string
  artist?: string
  genre?: string
  duration_seconds?: number
  cover_image_r2_key?: string | null
  play_count?: number
}

export interface ListenHistoryItem {
  id: string
  user_id: string | null
  anonymous_id: string | null
  set_id: string
  last_position_seconds: number
  listen_count: number
  last_listened_at: string
  // Joined fields
  title?: string
  artist?: string
  genre?: string
  duration_seconds?: number
  cover_image_r2_key?: string | null
}

export interface SearchResults {
  sets: DjSet[]
  tracks: (Detection & { set_title: string; set_artist: string })[]
  events: (EventInfo & { set_count: number })[]
}

export interface Genre {
  genre: string
  count: number
}
