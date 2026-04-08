import type { DjSet, DjSetWithDetections, Detection, Song, SearchResults, Genre, Playlist, PlaylistWithItems, ListenHistoryItem, Annotation, User, PublicUser } from './types'

const API_BASE = '/api'

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const anonId = localStorage.getItem('zephyron_anonymous_id')
  if (anonId) {
    headers['X-Anonymous-Id'] = anonId
  }
  return headers
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...getHeaders(),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error((error as { error: string }).error || `HTTP ${response.status}`)
    }

    return response.json()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// Sets
export async function fetchSets(params?: {
  page?: number
  pageSize?: number
  genre?: string
  artist?: string
  sort?: string
  search?: string
  event_id?: string
  event?: string
  stream_type?: string
  detection_status?: string
  has_source?: string
}): Promise<{ data: DjSet[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
  if (params?.genre) searchParams.set('genre', params.genre)
  if (params?.artist) searchParams.set('artist', params.artist)
  if (params?.sort) searchParams.set('sort', params.sort)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.event_id) searchParams.set('event_id', params.event_id)
  if (params?.event) searchParams.set('event', params.event)
  if (params?.stream_type) searchParams.set('stream_type', params.stream_type)
  if (params?.detection_status) searchParams.set('detection_status', params.detection_status)
  if (params?.has_source) searchParams.set('has_source', params.has_source)
  const qs = searchParams.toString()
  return fetchApi(`/sets${qs ? `?${qs}` : ''}`)
}

export async function fetchSet(id: string): Promise<{ data: DjSetWithDetections }> {
  return fetchApi(`/sets/${id}`)
}

export async function fetchGenres(): Promise<{ data: Genre[] }> {
  return fetchApi('/sets/genres')
}

// Stream URL — resolves the audio stream URL for a set.
// For Invidious sets: returns a fresh YouTube audio URL (expires ~6h).
// For legacy R2 sets: returns the Worker stream endpoint.
export interface StreamUrlResponse {
  url: string
  type: string
  bitrate?: string
  container?: string
  encoding?: string
  audioQuality?: string
  source: 'invidious' | 'r2'
}

export async function fetchStreamUrl(setId: string): Promise<StreamUrlResponse> {
  const res = await fetchApi<{ data: StreamUrlResponse }>(`/sets/${setId}/stream-url`)
  return res.data
}

// Legacy stream URL (for R2 sets that use the proxy endpoint)
export function getLegacyStreamUrl(setId: string): string {
  return `${API_BASE}/sets/${setId}/stream`
}

export async function incrementPlayCount(setId: string): Promise<void> {
  await fetchApi(`/sets/${setId}/play`, { method: 'POST' })
}

// Storyboard data for thumbnail scrubber
export interface StoryboardData {
  url: string
  templateUrl: string
  width: number
  height: number
  count: number
  interval: number
  storyboardWidth: number
  storyboardHeight: number
  storyboardCount: number
}

export async function fetchStoryboard(setId: string): Promise<StoryboardData | null> {
  const res = await fetchApi<{ data: StoryboardData | null }>(`/sets/${setId}/storyboard`)
  return res.data
}

// Search
export async function searchSets(q: string, genre?: string): Promise<{ data: SearchResults }> {
  const searchParams = new URLSearchParams()
  if (q) searchParams.set('q', q)
  if (genre) searchParams.set('genre', genre)
  return fetchApi(`/search?${searchParams}`)
}

// Detections
export async function fetchDetections(setId: string): Promise<{ data: Detection[] }> {
  return fetchApi(`/detections/set/${setId}`)
}

export async function voteDetection(detectionId: string, vote: 1 | -1): Promise<{ ok: boolean; action: string }> {
  return fetchApi(`/detections/${detectionId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
  })
}

// Annotations
export async function createAnnotation(data: {
  detection_id?: string
  set_id: string
  track_title: string
  track_artist?: string
  start_time_seconds: number
  end_time_seconds?: number
  annotation_type: 'correction' | 'new_track' | 'delete'
}): Promise<{ data: { id: string } }> {
  return fetchApi('/annotations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchAnnotations(setId: string): Promise<{ data: Annotation[] }> {
  return fetchApi(`/annotations/set/${setId}`)
}

// Playlists
export async function fetchPlaylists(): Promise<{ data: Playlist[] }> {
  return fetchApi('/playlists')
}

export async function createPlaylist(title: string, description?: string): Promise<{ data: { id: string; title: string } }> {
  return fetchApi('/playlists', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  })
}

export async function fetchPlaylist(id: string): Promise<{ data: PlaylistWithItems }> {
  return fetchApi(`/playlists/${id}`)
}

export async function addToPlaylist(playlistId: string, setId: string): Promise<void> {
  await fetchApi(`/playlists/${playlistId}/items`, {
    method: 'POST',
    body: JSON.stringify({ set_id: setId }),
  })
}

export async function removeFromPlaylist(playlistId: string, setId: string): Promise<void> {
  await fetchApi(`/playlists/${playlistId}/items/${setId}`, {
    method: 'DELETE',
  })
}

// History
export async function fetchHistory(): Promise<{ data: ListenHistoryItem[] }> {
  return fetchApi('/history')
}

export async function updateListenPosition(setId: string, positionSeconds: number): Promise<void> {
  await fetchApi('/history', {
    method: 'POST',
    body: JSON.stringify({ set_id: setId, position_seconds: positionSeconds }),
  })
}

// Admin / ML Pipeline
export async function triggerDetection(setId: string): Promise<{ data: { job_id: string; status: string } }> {
  return fetchApi(`/admin/sets/${setId}/detect`, { method: 'POST' })
}

export async function getDetectionStatus(setId: string): Promise<{ data: Record<string, unknown> }> {
  return fetchApi(`/admin/sets/${setId}/detect/status`)
}

export async function fetchMLStats(): Promise<{
  data: {
    totalDetections: number
    confirmedCorrect: number
    corrected: number
    falsePositives: number
    missedTracks: number
    accuracyRate: number
    promptVersion: number
    feedbackPending: number
  }
}> {
  return fetchApi('/admin/ml/stats')
}

export async function evolvePrompt(): Promise<{ data: { evolved: boolean; new_version?: number; reason?: string } }> {
  return fetchApi('/admin/ml/evolve', { method: 'POST' })
}

export async function fetchDetectionJobs(): Promise<{
  data: {
    id: string
    set_id: string
    status: string
    total_segments: number
    completed_segments: number
    detections_found: number
    error_message: string | null
    set_title: string
    set_artist: string
    created_at: string
    completed_at: string | null
  }[]
}> {
  return fetchApi('/admin/jobs')
}

export async function redetectLowConfidence(setId: string): Promise<{ data: { requeued: boolean; job_id?: string; reason?: string } }> {
  return fetchApi(`/admin/sets/${setId}/redetect-low`, { method: 'POST' })
}

// Admin / Beta management
export async function generateInviteCode(options?: { max_uses?: number; expires_in_days?: number; note?: string }): Promise<{ data: { id: string; code: string; max_uses: number; expires_at: string | null } }> {
  return fetchApi('/admin/invite-codes', { method: 'POST', body: JSON.stringify(options || {}) })
}

export async function fetchInviteCodes(): Promise<{ data: { id: string; code: string; max_uses: number; used_count: number; expires_at: string | null; note: string | null; created_at: string }[] }> {
  return fetchApi('/admin/invite-codes')
}

export async function revokeInviteCode(id: string): Promise<void> {
  await fetchApi(`/admin/invite-codes/${id}`, { method: 'DELETE' })
}

export async function fetchYoutubeMetadata(url: string): Promise<{
  data: {
    title: string
    artist: string
    description: string
    genre: string
    subgenre: string
    venue: string
    event: string
    recorded_date: string
    duration_seconds: number
    thumbnail_url: string
    source_url: string
    has_tracklist: boolean
    llm_extracted: boolean
    data_source: 'invidious'
    // Invidious-specific fields
    youtube_video_id: string
    youtube_channel_id: string
    youtube_channel_name: string
    youtube_published_at: string
    youtube_view_count: number
    youtube_like_count: number
    keywords: string[]
    storyboard_data: string | null
    music_tracks: { song: string; artist: string; album: string; license: string }[]
    // Raw data for admin reference
    raw_title: string
    raw_channel: string
    raw_keywords: string[]
    raw_genre: string
  }
}> {
  return fetchApi('/admin/sets/from-youtube', { method: 'POST', body: JSON.stringify({ url }) })
}

export async function adminCreateSet(data: {
  id?: string
  title: string
  artist: string
  description?: string
  genre?: string
  subgenre?: string
  venue?: string
  event?: string
  recorded_date?: string
  duration_seconds: number
  thumbnail_url?: string
  source_url?: string
  // Stream source type
  stream_type?: 'youtube' | 'soundcloud' | 'hearthis'
  // Invidious-specific fields
  youtube_video_id?: string
  youtube_channel_id?: string
  youtube_channel_name?: string
  youtube_published_at?: string
  youtube_view_count?: number
  youtube_like_count?: number
  storyboard_data?: string
  keywords?: string[]
  youtube_music_tracks?: string
  // 1001Tracklists
  tracklist_1001_url?: string
  // Pre-linked artist/event IDs (from autocomplete)
  artist_id?: string
  event_id?: string
  // Multiple artists
  artist_ids?: string[]
}): Promise<{ data: { id: string } }> {
  return fetchApi('/admin/sets', { method: 'POST', body: JSON.stringify(data) })
}

export function getCoverUrl(setId: string): string {
  return `${API_BASE}/sets/${setId}/cover`
}

export function getVideoPreviewUrl(setId: string): string {
  return `${API_BASE}/sets/${setId}/video`
}

export async function fetchPendingAnnotations(): Promise<{ data: any[] }> {
  return fetchApi('/admin/annotations/pending')
}

export async function moderateAnnotation(id: string, action: 'approve' | 'reject'): Promise<void> {
  await fetchApi(`/admin/annotations/${id}/moderate`, { method: 'POST', body: JSON.stringify({ action }) })
}

export async function deleteSetAdmin(id: string): Promise<void> {
  await fetchApi(`/admin/sets/${id}`, { method: 'DELETE' })
}

export async function batchSetsAdmin(params: {
  ids: string[]
  action: 'delete' | 'update' | 'detect' | 'redetect'
  updates?: Record<string, unknown>
}): Promise<{ data: { deleted?: number; updated?: number; queued?: number } }> {
  return fetchApi('/admin/sets/batch', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function updateSetAdmin(id: string, data: Record<string, unknown>): Promise<void> {
  await fetchApi(`/admin/sets/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

// Listeners (live count)
export async function fetchListenerCount(setId: string): Promise<{ data: { listeners: number } }> {
  return fetchApi(`/sets/${setId}/listeners`)
}

export async function joinListeners(setId: string, listenerId: string): Promise<{ data: { listeners: number } }> {
  return fetchApi(`/sets/${setId}/listeners/join`, {
    method: 'POST',
    body: JSON.stringify({ listener_id: listenerId }),
  })
}

export async function heartbeatListener(setId: string, listenerId: string): Promise<{ data: { listeners: number } }> {
  return fetchApi(`/sets/${setId}/listeners/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ listener_id: listenerId }),
  })
}

export async function leaveListeners(setId: string, listenerId: string): Promise<void> {
  await fetchApi(`/sets/${setId}/listeners/leave`, {
    method: 'POST',
    body: JSON.stringify({ listener_id: listenerId }),
  })
}

// Semantic search
export async function fetchSimilarSets(setId: string): Promise<{ data: DjSet[] }> {
  return fetchApi(`/search/similar/${setId}`)
}

export async function searchByTrack(query: string): Promise<{ data: { tracks: { set_id: string; track_title: string; score: number }[]; sets: DjSet[] } }> {
  return fetchApi(`/search/by-track?q=${encodeURIComponent(query)}`)
}

// Waveform (legacy — kept for R2 sets)
export async function fetchWaveform(setId: string): Promise<{ data: { peaks: number[]; source: string } }> {
  return fetchApi(`/sets/${setId}/waveform`)
}

// Artists
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchArtists(q?: string): Promise<{ data: any[] }> {
  const params = q ? `?q=${encodeURIComponent(q)}` : ''
  return fetchApi(`/artists${params}`)
}

export async function fetchArtist(id: string): Promise<{ data: any }> {
  return fetchApi(`/artists/${id}`)
}

export async function syncArtistAdmin(id: string): Promise<void> {
  await fetchApi(`/admin/artists/${id}/sync`, { method: 'POST' })
}

export async function updateArtistAdmin(id: string, data: Record<string, unknown>): Promise<void> {
  await fetchApi(`/admin/artists/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteArtistAdmin(id: string): Promise<void> {
  await fetchApi(`/admin/artists/${id}`, { method: 'DELETE' })
}

export async function createArtistAdmin(data: Record<string, unknown>): Promise<{ data: { id: string; slug: string } }> {
  return fetchApi('/admin/artists', { method: 'POST', body: JSON.stringify(data) })
}

// Events
export async function fetchEvents(q?: string): Promise<{ data: any[] }> {
  const params = q ? `?q=${encodeURIComponent(q)}` : ''
  return fetchApi(`/events${params}`)
}

export async function fetchEvent(id: string): Promise<{ data: any }> {
  return fetchApi(`/events/${id}`)
}

export function getEventCoverUrl(id: string): string {
  return `${API_BASE}/events/${id}/cover`
}

export function getEventLogoUrl(id: string): string {
  return `${API_BASE}/events/${id}/logo`
}

export async function createEventAdmin(data: Record<string, unknown>): Promise<{ data: { id: string; slug: string } }> {
  return fetchApi('/admin/events', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateEventAdmin(id: string, data: Record<string, unknown>): Promise<void> {
  await fetchApi(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function uploadEventCoverAdmin(id: string, file: File): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': file.type || 'image/jpeg',
  }
  const anonId = localStorage.getItem('zephyron_anonymous_id')
  if (anonId) headers['X-Anonymous-Id'] = anonId

  const resp = await fetch(`${API_BASE}/admin/events/${id}/cover`, {
    method: 'PUT',
    headers,
    body: file,
  })
  if (!resp.ok) {
    const err = await resp.text().catch(() => 'Upload failed')
    throw new Error(err)
  }
}

export async function uploadEventLogoAdmin(id: string, file: File): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': file.type || 'image/png',
  }
  const anonId = localStorage.getItem('zephyron_anonymous_id')
  if (anonId) headers['X-Anonymous-Id'] = anonId

  const resp = await fetch(`${API_BASE}/admin/events/${id}/logo`, {
    method: 'PUT',
    headers,
    body: file,
  })
  if (!resp.ok) {
    const err = await resp.text().catch(() => 'Upload failed')
    throw new Error(err)
  }
}

export async function deleteEventAdmin(id: string): Promise<void> {
  await fetchApi(`/admin/events/${id}`, { method: 'DELETE' })
}

export async function linkSetToEvent(eventId: string, setId: string): Promise<void> {
  await fetchApi(`/admin/events/${eventId}/link-set`, { method: 'POST', body: JSON.stringify({ set_id: setId }) })
}

export async function unlinkSetFromEvent(eventId: string, setId: string): Promise<void> {
  await fetchApi(`/admin/events/${eventId}/unlink-set`, { method: 'POST', body: JSON.stringify({ set_id: setId }) })
}

export async function fetchEvent1001Sets(eventId: string): Promise<{
  data: { html: string; fallback_required: boolean }
  error: string | null
  ok: boolean
}> {
  return fetchApi(`/admin/events/${eventId}/fetch-1001tl-sets`, { method: 'POST' })
}

// ═══════════════════════════════════════════
// SET REQUEST PETITIONS
// ═══════════════════════════════════════════

export async function submitSetRequest(data: {
  name: string
  artist: string
  source_type?: 'youtube' | 'soundcloud' | 'hearthis'
  source_url?: string
  event?: string
  genre?: string
  notes?: string
}): Promise<{ data: { id: string }; ok: boolean }> {
  return fetchApi('/petitions', { method: 'POST', body: JSON.stringify(data) })
}

// ═══════════════════════════════════════════
// SOURCE REQUESTS
// ═══════════════════════════════════════════

export async function submitSourceRequest(
  setId: string,
  data: {
    source_type: 'youtube' | 'soundcloud' | 'hearthis'
    source_url: string
    notes?: string
  }
): Promise<{ data: { id: string }; ok: boolean }> {
  return fetchApi(`/sets/${setId}/request-source`, { method: 'POST', body: JSON.stringify(data) })
}

// ═══════════════════════════════════════════
// SONGS
// ═══════════════════════════════════════════

export async function fetchSong(id: string): Promise<{ data: Song }> {
  return fetchApi(`/songs/${id}`)
}

export function getSongCoverUrl(songId: string): string {
  return `${API_BASE}/songs/${songId}/cover`
}

// Song likes (authenticated)
export async function likeSong(songId: string): Promise<{ ok: boolean; liked: boolean }> {
  return fetchApi(`/songs/${songId}/like`, { method: 'POST' })
}

export async function unlikeSong(songId: string): Promise<{ ok: boolean; liked: boolean }> {
  return fetchApi(`/songs/${songId}/like`, { method: 'DELETE' })
}

export async function fetchLikedSongs(page = 1): Promise<{
  data: (Song & { liked_at: string; like_count: number; set_id: string | null })[]
  total: number
  page: number
  pageSize: number
  ok: boolean
}> {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return fetchApi(`/users/me/liked-songs${qs ? `?${qs}` : ''}`)
}

export async function getSongLikeStatus(songId: string): Promise<{ ok: boolean; liked: boolean }> {
  return fetchApi(`/songs/${songId}/like-status`)
}

// Admin: Songs
export async function fetchSongsAdmin(q?: string, page = 1): Promise<{ data: Song[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return fetchApi(`/admin/songs${qs ? `?${qs}` : ''}`)
}

export async function updateSongAdmin(id: string, data: Record<string, unknown>): Promise<void> {
  await fetchApi(`/admin/songs/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteSongAdmin(id: string): Promise<void> {
  await fetchApi(`/admin/songs/${id}`, { method: 'DELETE' })
}

export async function cacheSongCoverAdmin(id: string): Promise<void> {
  await fetchApi(`/admin/songs/${id}/cache-cover`, { method: 'POST' })
}

export async function enrichSongAdmin(id: string): Promise<void> {
  await fetchApi(`/admin/songs/${id}/enrich`, { method: 'POST' })
}

// ═══════════════════════════════════════════
// 1001TRACKLISTS
// ═══════════════════════════════════════════

export interface Track1001Preview {
  position: number
  title: string
  artist: string
  label?: string
  artwork_url?: string
  cue_time?: string
  start_seconds?: number
  duration_seconds?: number
  genre?: string
  track_url?: string
  track_content_id?: string
  is_continuation?: boolean
  is_identified?: boolean
  is_mashup?: boolean
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  beatport_url?: string
  youtube_url?: string
  deezer_url?: string
  bandcamp_url?: string
  traxsource_url?: string
}

export async function fetch1001Tracklists(setId: string): Promise<{
  data: {
    tracks: Track1001Preview[]
    tracklist_id: string
    source: string
    count: number
    fallback_required: boolean
  }
  error: string | null
  ok: boolean
}> {
  return fetchApi(`/admin/sets/${setId}/fetch-1001tracklists`, { method: 'POST' })
}

export async function parse1001TracklistsHtml(setId: string, html: string): Promise<{
  data: {
    tracks: Track1001Preview[]
    tracklist_id: string
    source: string
    count: number
  }
  ok: boolean
}> {
  return fetchApi(`/admin/sets/${setId}/parse-1001tracklists-html`, {
    method: 'POST',
    body: JSON.stringify({ html }),
  })
}

export async function import1001Tracklists(setId: string, tracks: Track1001Preview[]): Promise<{
  data: { imported: number; set_id: string }
  ok: boolean
}> {
  return fetchApi(`/admin/sets/${setId}/import-1001tracklists`, {
    method: 'POST',
    body: JSON.stringify({ tracks }),
  })
}

// ═══════════════════════════════════════════
// VIDEO STREAMING
// ═══════════════════════════════════════════

export async function fetchVideoStreamUrl(setId: string): Promise<{
  data: {
    url: string
    quality?: string
    resolution?: string
    expires_at: number
    source: string
  } | null
  ok: boolean
}> {
  return fetchApi(`/sets/${setId}/video-stream-url`)
}

// User profile
export async function updateUsername(username: string): Promise<{ ok: boolean; username: string }> {
  return fetchApi('/user/username', {
    method: 'PATCH',
    body: JSON.stringify({ username }),
  })
}

// ═══════════════════════════════════════════
// ADMIN: SOURCE REQUESTS
// ═══════════════════════════════════════════

export interface SourceRequest {
  id: string
  set_id: string
  user_id: string | null
  source_type: 'youtube' | 'soundcloud' | 'hearthis'
  source_url: string
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  set_title: string
  set_artist: string
  set_stream_type: string | null
  user_name: string | null
  user_email: string | null
}

export async function fetchAdminSourceRequests(status = 'pending'): Promise<{ data: SourceRequest[]; total: number; ok: boolean }> {
  return fetchApi(`/admin/source-requests?status=${status}`)
}

export async function approveAdminSourceRequest(id: string): Promise<{ data: { id: string; set_id: string; stream_type: string; source_url: string }; ok: boolean }> {
  return fetchApi(`/admin/source-requests/${id}/approve`, { method: 'POST' })
}

export async function rejectAdminSourceRequest(id: string): Promise<{ data: { id: string; status: string }; ok: boolean }> {
  return fetchApi(`/admin/source-requests/${id}/reject`, { method: 'POST' })
}

// ═══════════════════════════════════════════
// ADMIN: SET REQUESTS
// ═══════════════════════════════════════════

export interface SetRequest {
  id: string
  user_id: string | null
  title: string
  artist: string
  source_type: 'youtube' | 'soundcloud' | 'hearthis' | null
  source_url: string | null
  event: string | null
  genre: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'duplicate'
  admin_notes: string | null
  created_at: string
  user_name: string | null
  user_email: string | null
}

export async function fetchAdminSetRequests(status = 'pending'): Promise<{ data: SetRequest[]; total: number; ok: boolean }> {
  return fetchApi(`/admin/set-requests?status=${status}`)
}

export async function approveAdminSetRequest(id: string): Promise<{ data: { id: string; status: string }; ok: boolean }> {
  return fetchApi(`/admin/set-requests/${id}/approve`, { method: 'POST' })
}

export async function rejectAdminSetRequest(id: string): Promise<{ data: { id: string; status: string }; ok: boolean }> {
  return fetchApi(`/admin/set-requests/${id}/reject`, { method: 'POST' })
}

// ═══════════════════════════════════════════
// PROFILE MANAGEMENT
// ═══════════════════════════════════════════

export async function uploadAvatar(file: File): Promise<{ success: true; avatar_url: string }> {
  const formData = new FormData()
  formData.append('avatar', file)

  const anonId = localStorage.getItem('zephyron_anonymous_id')
  const headers: Record<string, string> = {}
  if (anonId) {
    headers['X-Anonymous-Id'] = anonId
  }

  const res = await fetch(`${API_BASE}/profile/avatar/upload`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Upload failed' }))
    throw new Error(error.message || 'Failed to upload avatar')
  }

  return res.json()
}

export async function updateProfileSettings(settings: {
  name?: string
  bio?: string
  is_profile_public?: boolean
}): Promise<{ success: true; user: User }> {
  const res = await fetch(`${API_BASE}/profile/settings`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(settings),
    credentials: 'include',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Update failed' }))
    throw new Error(error.message || 'Failed to update profile settings')
  }

  return res.json()
}

export async function getPublicProfile(userId: string): Promise<{ user: PublicUser }> {
  const res = await fetch(`${API_BASE}/profile/${userId}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch profile' }))
    throw new Error(error.error || 'Failed to fetch public profile')
  }

  return res.json()
}
