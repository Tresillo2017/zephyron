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
