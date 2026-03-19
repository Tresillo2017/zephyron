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
  recorded_date: string | null
  duration_seconds: number
  r2_key: string
  r2_waveform_key: string | null
  cover_image_r2_key: string | null
  audio_format: string
  bitrate: number | null
  sample_rate: number | null
  file_size_bytes: number | null
  detection_status: 'pending' | 'processing' | 'complete' | 'failed'
  detection_version: number
  play_count: number
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
  created_at: string
  updated_at: string
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
}

export interface Genre {
  genre: string
  count: number
}
