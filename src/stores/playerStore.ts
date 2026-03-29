import { create } from 'zustand'
import type { DjSet, Detection } from '../lib/types'
import { fetchStreamUrl, incrementPlayCount, updateListenPosition } from '../lib/api'

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

  // Queue
  queue: DjSet[]
  queueIndex: number

  // Timeline
  detections: Detection[]
  currentDetection: Detection | null

  // Audio element ref
  audioElement: HTMLAudioElement | null

  // Actions
  setAudioElement: (el: HTMLAudioElement) => void
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
  savePosition: () => void
  toggleFullScreen: () => void
}

// Debounce position saving
let savePositionTimeout: ReturnType<typeof setTimeout> | null = null

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSet: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isFullScreen: false,
  isLoadingStream: false,
  queue: [],
  queueIndex: -1,
  detections: [],
  currentDetection: null,
  audioElement: null,

  setAudioElement: (el) => set({ audioElement: el }),

  play: async (djSet, detections) => {
    const { audioElement, currentSet } = get()
    if (!audioElement) return

    // If same set, just resume
    if (currentSet?.id === djSet.id) {
      audioElement.play().catch(() => {})
      set({ isPlaying: true })
      return
    }

    // New set — resolve the stream URL
    set({
      currentSet: djSet,
      isPlaying: false,
      isLoadingStream: true,
      currentTime: 0,
      detections: detections || [],
      currentDetection: null,
    })

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
      } catch {
        console.error('[player] Retry also failed')
      }
    }
  },

  resume: () => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.play().catch(() => {})
      set({ isPlaying: true })
    }
  },

  pause: () => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.pause()
      set({ isPlaying: false })
    }
    get().savePosition()
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
    const { audioElement } = get()
    if (audioElement) {
      audioElement.currentTime = time
      set({ currentTime: time })
      get().updateCurrentDetection()
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

    // Debounced position save
    if (savePositionTimeout) clearTimeout(savePositionTimeout)
    savePositionTimeout = setTimeout(() => get().savePosition(), 10000)
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
      get().play(queue[prevIndex])
    }
  },

  setDetections: (detections) => set({ detections }),

  updateCurrentDetection: () => {
    const { currentTime, detections } = get()
    // Find which detection we're currently in
    const current = detections.find(
      (d) =>
        currentTime >= d.start_time_seconds &&
        (d.end_time_seconds == null || currentTime < d.end_time_seconds)
    )
    set({ currentDetection: current || null })
  },

  savePosition: () => {
    const { currentSet, currentTime } = get()
    if (currentSet && currentTime > 0) {
      updateListenPosition(currentSet.id, currentTime).catch(() => {})
    }
  },

  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
}))
