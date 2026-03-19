import type { DjSet, DjSetWithDetections, Detection, SearchResults, Genre, Playlist, PlaylistWithItems, ListenHistoryItem, Annotation } from './types'

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
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
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
}

// Sets
export async function fetchSets(params?: {
  page?: number
  pageSize?: number
  genre?: string
  artist?: string
  sort?: string
}): Promise<{ data: DjSet[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
  if (params?.genre) searchParams.set('genre', params.genre)
  if (params?.artist) searchParams.set('artist', params.artist)
  if (params?.sort) searchParams.set('sort', params.sort)
  const qs = searchParams.toString()
  return fetchApi(`/sets${qs ? `?${qs}` : ''}`)
}

export async function fetchSet(id: string): Promise<{ data: DjSetWithDetections }> {
  return fetchApi(`/sets/${id}`)
}

export async function fetchGenres(): Promise<{ data: Genre[] }> {
  return fetchApi('/sets/genres')
}

export function getStreamUrl(setId: string): string {
  return `${API_BASE}/sets/${setId}/stream`
}

export async function incrementPlayCount(setId: string): Promise<void> {
  await fetchApi(`/sets/${setId}/play`, { method: 'POST' })
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
    youtube_source: 'youtube_api' | 'oembed'
    raw_youtube_title: string
    raw_youtube_channel: string
    raw_youtube_tags: string[]
  }
}> {
  return fetchApi('/admin/sets/from-youtube', { method: 'POST', body: JSON.stringify({ url }) })
}

export async function getSetUploadUrl(filename: string, contentType: string): Promise<{ data: { set_id: string; r2_key: string; upload_endpoint: string; audio_format: string } }> {
  return fetchApi('/admin/sets/upload-url', { method: 'POST', body: JSON.stringify({ filename, content_type: contentType }) })
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
  r2_key: string
  audio_format?: string
  bitrate?: number
  thumbnail_url?: string
  source_url?: string
}): Promise<{ data: { id: string } }> {
  return fetchApi('/admin/sets', { method: 'POST', body: JSON.stringify(data) })
}

export function getCoverUrl(setId: string): string {
  return `${API_BASE}/sets/${setId}/cover`
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

// Waveform
export async function fetchWaveform(setId: string): Promise<{ data: { peaks: number[]; source: string } }> {
  return fetchApi(`/sets/${setId}/waveform`)
}

// Artists
export async function fetchArtists(): Promise<{ data: any[] }> {
  return fetchApi('/artists')
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
