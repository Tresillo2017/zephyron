import { create } from 'zustand'
import type { DjSet, Detection, Song } from '../lib/types'
import { fetchStreamUrl, fetchVideoStreamUrl, fetchDetections, incrementPlayCount, startSession, updateSessionProgress, endSession } from '../lib/api'
import { useAuthStore } from './authStore'

interface PlayerState {
  // Current playback
  currentSet: DjSet | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullScreen: boolean
  isLoadingStream: boolean

  // Video
  isVideoMode: boolean
  videoElement: HTMLVideoElement | null
  videoStreamUrl: string | null
  isLoadingVideo: boolean

  // Queue
  queue: DjSet[]
  queueIndex: number

  // Timeline
  detections: Detection[]
  currentDetection: Detection | null
  currentDetections: Detection[]  // all detections active at currentTime (for overlapping tracks)
  currentSong: Song | null

  // Audio element ref
  audioElement: HTMLAudioElement | null

  // Session tracking
  currentSessionId: string | null
  lastProgressUpdate: number | null
  progressUpdateInterval: ReturnType<typeof setInterval> | null

  // Actions
  setAudioElement: (el: HTMLAudioElement) => void
  setVideoElement: (el: HTMLVideoElement | null) => void
  play: (set: DjSet, detections?: Detection[]) => void
  resume: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  seekToDetection: (detection: Detection) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  addToQueue: (set: DjSet) => void
  playNext: () => void
  playPrevious: () => void
  setDetections: (detections: Detection[]) => void
  updateCurrentDetection: () => void
  toggleFullScreen: () => void
  setVideoMode: (enabled: boolean) => void
  loadVideoStream: () => Promise<void>

  // Session tracking actions (internal)
  _startTrackingSession: (setId: string) => Promise<void>
  _endTrackingSession: () => Promise<void>

  // Theater mode
  isTheaterMode: boolean
  setTheaterMode: (enabled: boolean) => void
}

// Read persisted volume from localStorage (fallback 0.8)
function getPersistedVolume(): number {
  try {
    const raw = localStorage.getItem('zephyron_volume')
    if (raw !== null) {
      const v = parseFloat(raw)
      if (!isNaN(v) && v >= 0 && v <= 1) return v
    }
  } catch { /* localStorage unavailable */ }
  return 0.8
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSet: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: getPersistedVolume(),
  isMuted: false,
  isFullScreen: false,
  isLoadingStream: false,
  isTheaterMode: false,
  isVideoMode: false,
  videoElement: null,
  videoStreamUrl: null,
  isLoadingVideo: false,
  queue: [],
  queueIndex: -1,
  detections: [],
  currentDetection: null,
  currentDetections: [],
  currentSong: null,
  audioElement: null,
  currentSessionId: null,
  lastProgressUpdate: null,
  progressUpdateInterval: null,

  setAudioElement: (el) => {
    if (el) {
      // Apply persisted volume immediately when element is registered
      el.volume = get().volume
    }
    set({ audioElement: el })
  },

  setVideoElement: (el) => set({ videoElement: el }),

  play: async (djSet, detections) => {
    const { audioElement, currentSet } = get()
    if (!audioElement) return

    // If same set, just resume
    if (currentSet?.id === djSet.id) {
      audioElement.play().catch(() => {})
      set({ isPlaying: true })
      return
    }

    // End current session before starting new one
    if (currentSet?.id !== djSet.id) {
      await get()._endTrackingSession()
    }

    // New set — resolve the stream URL
    set({
      currentSet: djSet,
      isPlaying: false,
      isLoadingStream: true,
      currentTime: 0,
      detections: detections || [],
      currentDetection: null,
      currentDetections: [],
      isVideoMode: false,
      videoStreamUrl: null,
    })

    // If no detections were passed (e.g. played from a card), fetch them in parallel
    if (!detections || detections.length === 0) {
      fetchDetections(djSet.id)
        .then(({ data }) => {
          // Only apply if we're still on the same set
          if (get().currentSet?.id === djSet.id) {
            set({ detections: data })
            get().updateCurrentDetection()
          }
        })
        .catch((err) => console.error('[player] Failed to fetch detections:', err))
    }

    try {
      const streamData = await fetchStreamUrl(djSet.id)
      const { audioElement: el } = get()
      if (!el) return

      // Check if user changed to a different set while we were loading
      if (get().currentSet?.id !== djSet.id) return

      el.src = streamData.url
      el.load()
      el.play().catch((err) => {
        console.error('[player] Playback failed:', err)
      })

      set({ isPlaying: true, isLoadingStream: false })

      // Track play count (fire and forget)
      incrementPlayCount(djSet.id).catch(() => {})

      // Start session tracking (fire and forget)
      get()._startTrackingSession(djSet.id)
    } catch (err) {
      console.error('[player] Failed to resolve stream URL:', err)
      set({ isLoadingStream: false })

      // Retry: the audio URL may have expired, try re-fetching
      try {
        const streamData = await fetchStreamUrl(djSet.id)
        const { audioElement: el } = get()
        if (!el || get().currentSet?.id !== djSet.id) return

        el.src = streamData.url
        el.load()
        el.play().catch(() => {})
        set({ isPlaying: true })

        // Start session tracking (fire and forget)
        get()._startTrackingSession(djSet.id)
      } catch {
        console.error('[player] Retry also failed')
      }
    }
  },

  resume: () => {
    const { audioElement, videoElement, isVideoMode } = get()
    if (audioElement) {
      audioElement.play().catch(() => {})
      set({ isPlaying: true })
    }
    if (isVideoMode && videoElement) {
      videoElement.play().catch(() => {})
    }
  },

  pause: () => {
    const { audioElement, videoElement, isVideoMode } = get()
    if (audioElement) audioElement.pause()
    if (isVideoMode && videoElement) videoElement.pause()
    set({ isPlaying: false })
    // End session tracking on pause
    get()._endTrackingSession()
  },

  togglePlay: () => {
    const { isPlaying } = get()
    if (isPlaying) {
      get().pause()
    } else {
      get().resume()
    }
  },

  seek: (time) => {
    const { audioElement, videoElement, isVideoMode } = get()
    if (audioElement) {
      audioElement.currentTime = time
      set({ currentTime: time })
      get().updateCurrentDetection()
    }
    if (isVideoMode && videoElement) {
      videoElement.currentTime = time
    }
  },

  seekToDetection: (detection) => {
    get().seek(detection.start_time_seconds)
  },

  setVolume: (volume) => {
    const { audioElement } = get()
    const clampedVolume = Math.max(0, Math.min(1, volume))
    if (audioElement) {
      audioElement.volume = clampedVolume
    }
    set({ volume: clampedVolume, isMuted: clampedVolume === 0 })
    // Persist across sessions
    try { localStorage.setItem('zephyron_volume', String(clampedVolume)) } catch { /* ignore */ }
  },

  toggleMute: () => {
    const { audioElement, isMuted, volume } = get()
    if (audioElement) {
      audioElement.muted = !isMuted
    }
    set({ isMuted: !isMuted })
    if (isMuted && volume === 0) {
      get().setVolume(0.8)
    }
  },

  setCurrentTime: (time) => {
    set({ currentTime: time })
    get().updateCurrentDetection()
  },

  setDuration: (duration) => set({ duration }),

  addToQueue: (djSet) => {
    set((state) => ({ queue: [...state.queue, djSet] }))
  },

  playNext: () => {
    const { queue, queueIndex } = get()
    if (queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1
      set({ queueIndex: nextIndex })
      // play() will handle ending the previous session
      get().play(queue[nextIndex])
    }
  },

  playPrevious: () => {
    const { queue, queueIndex, currentTime } = get()
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      get().seek(0)
      return
    }
    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1
      set({ queueIndex: prevIndex })
      // play() will handle ending the previous session
      get().play(queue[prevIndex])
    }
  },

  setDetections: (detections) => set({ detections }),

  updateCurrentDetection: () => {
    const { currentTime, detections } = get()
    // Find all detections whose time window contains currentTime (for overlapping/simultaneous tracks)
    const active = detections.filter(
      (d) =>
        currentTime >= d.start_time_seconds &&
        (d.end_time_seconds == null || currentTime < d.end_time_seconds)
    )
    const current = active[0] || null
    set({ currentDetection: current, currentDetections: active, currentSong: current?.song || null })
  },

  // Session tracking helper: start a new session
  _startTrackingSession: async (setId: string) => {
    try {
      const isAuthenticated = useAuthStore.getState().isAuthenticated
      if (!isAuthenticated) {
        // Don't track anonymous users
        return
      }

      const response = await startSession(setId)
      const { currentSessionId: _currentSessionId, progressUpdateInterval } = get()

      // Clear existing interval if any
      if (progressUpdateInterval) clearInterval(progressUpdateInterval)

      set({
        currentSessionId: response.session_id,
        lastProgressUpdate: Date.now(),
      })

      // Set up progress update interval (every 30 seconds)
      const interval = setInterval(() => {
        const { currentSessionId: sessionId, currentTime } = get()
        if (sessionId) {
          updateSessionProgress(sessionId, Math.floor(currentTime))
            .catch((err) => console.error('[player] Failed to update session progress:', err))
        }
      }, 30000)

      set({ progressUpdateInterval: interval })
    } catch (err) {
      console.error('[player] Failed to start session:', err)
    }
  },

  // Session tracking helper: end current session
  _endTrackingSession: async () => {
    try {
      const { currentSessionId, currentTime, progressUpdateInterval } = get()

      // Clear progress update interval
      if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval)
      }

      if (currentSessionId) {
        await endSession(currentSessionId, Math.floor(currentTime))
      }

      set({
        currentSessionId: null,
        lastProgressUpdate: null,
        progressUpdateInterval: null,
      })
    } catch (err) {
      console.error('[player] Failed to end session:', err)
      // Still clear session state even if API call fails
      set({
        currentSessionId: null,
        lastProgressUpdate: null,
        progressUpdateInterval: null,
      })
    }
  },

  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),

  setTheaterMode: (enabled) => set({ isTheaterMode: enabled }),

  setVideoMode: (enabled) => {
    const { videoElement, audioElement, isPlaying } = get()
    if (enabled) {
      // Switching to video — sync video time to audio and play
      if (videoElement && audioElement) {
        videoElement.currentTime = audioElement.currentTime
        if (isPlaying) videoElement.play().catch(() => {})
      }
    } else {
      // Switching to audio — pause video to save bandwidth
      if (videoElement) {
        videoElement.pause()
      }
    }
    set({ isVideoMode: enabled })
  },

  loadVideoStream: async () => {
    const { currentSet, videoStreamUrl } = get()
    if (!currentSet?.youtube_video_id) return

    // Check if we already have a valid URL
    if (videoStreamUrl) return

    set({ isLoadingVideo: true })
    try {
      const res = await fetchVideoStreamUrl(currentSet.id)
      if (res.data?.url) {
        set({ videoStreamUrl: res.data.url, isLoadingVideo: false })
      } else {
        set({ isLoadingVideo: false })
      }
    } catch {
      set({ isLoadingVideo: false })
    }
  },
}))
