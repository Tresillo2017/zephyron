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
  sort?: 'created_at' | 'duration_seconds' | 'updated_at'
  order?: 'asc' | 'desc'
  artist?: string
}): Promise<{
  sets: DjSet[]
  pagination: { page: number; pageSize: number; totalPages: number; totalCount: number }
}> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', params.page.toString())
  if (params?.pageSize) query.set('pageSize', params.pageSize.toString())
  if (params?.genre) query.set('genre', params.genre)
  if (params?.sort) query.set('sort', params.sort)
  if (params?.order) query.set('order', params.order)
  if (params?.artist) query.set('artist', params.artist)

  return fetchApi(`/sets?${query}`)
}

export async function fetchSet(id: string): Promise<DjSet> {
  const data = await fetchApi<{ data: DjSet }>(`/sets/${id}`)
  return data.data
}

export async function fetchSetWithDetections(id: string): Promise<DjSetWithDetections> {
  const data = await fetchApi<{ data: DjSetWithDetections }>(`/sets/${id}/detections`)
  return data.data
}

// Detections
export async function fetchDetections(setId: string): Promise<Detection[]> {
  const data = await fetchApi<{ data: Detection[] }>(`/sets/${setId}/detections`)
  return data.data
}

// Search
export async function search(query: string, filters?: {
  genre?: string
  year_min?: number
  year_max?: number
}): Promise<SearchResults> {
  const params = new URLSearchParams({ q: query })
  if (filters?.genre) params.set('genre', filters.genre)
  if (filters?.year_min) params.set('year_min', filters.year_min.toString())
  if (filters?.year_max) params.set('year_max', filters.year_max.toString())

  const data = await fetchApi<{ data: SearchResults }>(`/search?${params}`)
  return data.data
}

// Admin
export async function uploadSet(formData: FormData): Promise<{ data: DjSet }> {
  const res = await fetch(`${API_BASE}/admin/sets/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Upload failed' }))
    throw new Error(error.message || 'Failed to upload set')
  }

  return res.json()
}

export async function updateSet(id: string, updates: Partial<DjSet>): Promise<DjSet> {
  const data = await fetchApi<{ data: DjSet }>(`/admin/sets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return data.data
}

export async function deleteSet(id: string): Promise<void> {
  await fetchApi(`/admin/sets/${id}`, { method: 'DELETE' })
}

export async function fetchAdminSets(params?: {
  page?: number
  pageSize?: number
  status?: 'processing' | 'active' | 'archived'
}): Promise<{
  sets: DjSet[]
  pagination: { page: number; pageSize: number; totalPages: number; totalCount: number }
}> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', params.page.toString())
  if (params?.pageSize) query.set('pageSize', params.pageSize.toString())
  if (params?.status) query.set('status', params.status)

  return fetchApi(`/admin/sets?${query}`)
}

export async function triggerCoverExtraction(setId: string): Promise<{ data: { message: string } }> {
  return fetchApi(`/admin/sets/${setId}/extract-cover`, {
    method: 'POST',
  })
}

export async function triggerWaveformGeneration(setId: string): Promise<{ data: { message: string } }> {
  return fetchApi(`/admin/sets/${setId}/generate-waveform`, {
    method: 'POST',
  })
}

export async function deleteDetection(detectionId: string): Promise<void> {
  await fetchApi(`/admin/detections/${detectionId}`, {
    method: 'DELETE',
  })
}

// Songs
export async function fetchSong(id: string): Promise<Song> {
  const data = await fetchApi<{ data: Song }>(`/songs/${id}`)
  return data.data
}

export async function likeSong(songId: string): Promise<void> {
  await fetchApi(`/songs/${songId}/like`, { method: 'POST' })
}

export async function unlikeSong(songId: string): Promise<void> {
  await fetchApi(`/songs/${songId}/like`, { method: 'DELETE' })
}

export async function fetchLikedSongs(): Promise<Song[]> {
  const data = await fetchApi<{ data: Song[] }>('/songs/liked')
  return data.data
}

// Genres
export async function fetchGenres(): Promise<Genre[]> {
  const data = await fetchApi<{ data: Genre[] }>('/genres')
  return data.data
}

// Playlists
export async function fetchPlaylists(): Promise<Playlist[]> {
  const data = await fetchApi<{ data: Playlist[] }>('/playlists')
  return data.data
}

export async function fetchPlaylist(id: string): Promise<PlaylistWithItems> {
  const data = await fetchApi<{ data: PlaylistWithItems }>(`/playlists/${id}`)
  return data.data
}

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const data = await fetchApi<{ data: Playlist }>('/playlists', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  })
  return data.data
}

export async function updatePlaylist(id: string, updates: { name?: string; description?: string }): Promise<Playlist> {
  const data = await fetchApi<{ data: Playlist }>(`/playlists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return data.data
}

export async function deletePlaylist(id: string): Promise<void> {
  await fetchApi(`/playlists/${id}`, { method: 'DELETE' })
}

export async function addToPlaylist(playlistId: string, setId: string): Promise<void> {
  await fetchApi(`/playlists/${playlistId}/items`, {
    method: 'POST',
    body: JSON.stringify({ set_id: setId }),
  })
}

export async function removeFromPlaylist(playlistId: string, setId: string): Promise<void> {
  await fetchApi(`/playlists/${playlistId}/items/${setId}`, { method: 'DELETE' })
}

export async function reorderPlaylistItem(playlistId: string, setId: string, newPosition: number): Promise<void> {
  await fetchApi(`/playlists/${playlistId}/items/${setId}/position`, {
    method: 'PUT',
    body: JSON.stringify({ position: newPosition }),
  })
}

// History
export async function fetchHistory(): Promise<ListenHistoryItem[]> {
  const data = await fetchApi<{ data: ListenHistoryItem[] }>('/history')
  return data.data
}

export async function addToHistory(setId: string): Promise<void> {
  await fetchApi('/history', {
    method: 'POST',
    body: JSON.stringify({ set_id: setId }),
  })
}

// Annotations
export async function fetchAnnotations(detectionId: string): Promise<Annotation[]> {
  const data = await fetchApi<{ data: Annotation[] }>(`/detections/${detectionId}/annotations`)
  return data.data
}

export async function createAnnotation(
  detectionId: string,
  field: string,
  value: string,
  reason?: string
): Promise<Annotation> {
  const data = await fetchApi<{ data: Annotation }>(`/detections/${detectionId}/annotations`, {
    method: 'POST',
    body: JSON.stringify({ field, value, reason }),
  })
  return data.data
}

export async function voteAnnotation(annotationId: string, voteType: 'upvote' | 'downvote'): Promise<void> {
  await fetchApi(`/annotations/${annotationId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote_type: voteType }),
  })
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  await fetchApi(`/annotations/${annotationId}`, { method: 'DELETE' })
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchArtistSets(artistId: string): Promise<{ data: any[] }> {
  return fetchApi(`/artists/${artistId}/sets`)
}

export async function uploadAvatar(file: File): Promise<{ success: true; avatar_url: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/profile/avatar/upload`, {
    method: 'POST',
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

// Session tracking

export interface SessionResponse {
  session_id: string
  started_at: string
}

export async function startSession(setId: string): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ set_id: setId }),
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Failed to start session')
  }

  return res.json()
}

export async function updateSessionProgress(
  sessionId: string,
  positionSeconds: number
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position_seconds: positionSeconds }),
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Failed to update progress')
  }

  return res.json()
}

export async function endSession(
  sessionId: string,
  positionSeconds: number
): Promise<{ ok: boolean; qualifies: boolean }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position_seconds: positionSeconds }),
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Failed to end session')
  }

  return res.json()
}

// Wrapped analytics

export interface WrappedData {
  year: number
  total_hours: number
  top_artists: string[]
  top_artist: { name: string; hours: number } | null
  top_genre: string | null
  discoveries_count: number
  longest_streak_days: number
  image_url: string | null
  generated_at: string
}

export async function fetchWrapped(year: string | number): Promise<WrappedData> {
  const res = await fetch(`${API_BASE}/wrapped/${year}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('No data for this year')
    }
    throw new Error('Failed to fetch Wrapped data')
  }

  return res.json()
}

export interface MonthlyWrappedData {
  year: number
  month: number
  total_hours: number
  top_artists: string[]
  top_genre: string | null
  longest_set: { id: string; title: string; artist: string } | null
  discoveries_count: number
  generated_at: string
}

export async function fetchMonthlyWrapped(year: number, month: number): Promise<MonthlyWrappedData> {
  const yearMonth = `${year}-${month.toString().padStart(2, '0')}`
  const res = await fetch(`${API_BASE}/wrapped/monthly/${yearMonth}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('No data for this month')
    }
    throw new Error('Failed to fetch monthly data')
  }

  return res.json()
}
