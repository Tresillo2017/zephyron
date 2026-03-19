import { useState, useEffect, useRef } from 'react'
import { getStreamUrl } from '../lib/api'

const TARGET_PEAKS = 800

/**
 * Hook that computes real waveform peaks using the Web Audio API.
 * Fetches the audio stream URL, decodes it, and extracts amplitude peaks.
 * Falls back to a generated waveform if decoding fails.
 */
export function useWaveform(setId: string | undefined): {
  peaks: number[]
  isLoading: boolean
} {
  const [peaks, setPeaks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!setId) {
      setPeaks([])
      return
    }

    // Abort previous fetch if set changes
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    // Start with a generated waveform immediately
    setPeaks(generatePlaceholderPeaks(setId))

    computeWaveform(setId, controller.signal)
      .then((realPeaks) => {
        if (!controller.signal.aborted && realPeaks.length > 0) {
          setPeaks(realPeaks)
        }
      })
      .catch(() => {
        // Keep placeholder on failure
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [setId])

  return { peaks, isLoading }
}

/**
 * Fetch the first ~2MB of audio and decode it with Web Audio API
 * to extract amplitude peaks. We only need the start of the file
 * to get a representative waveform shape — most DJ sets have
 * consistent energy levels throughout.
 *
 * For a full waveform, we fetch the whole file but use a range request
 * to avoid downloading 100MB+ just for visualization.
 */
async function computeWaveform(setId: string, signal: AbortSignal): Promise<number[]> {
  const url = getStreamUrl(setId)

  // Fetch first ~3MB for a quick waveform preview
  // This covers ~30 seconds of 128kbps audio, enough for the shape
  const response = await fetch(url, {
    headers: { Range: 'bytes=0-3145727' },
    signal,
  })

  if (!response.ok && response.status !== 206) {
    throw new Error(`Fetch failed: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength < 1000) {
    throw new Error('Audio data too small')
  }

  // Decode the audio data using Web Audio API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const channelData = audioBuffer.getChannelData(0) // Use first channel

    // Compute peaks by dividing the samples into TARGET_PEAKS windows
    const samplesPerPeak = Math.floor(channelData.length / TARGET_PEAKS)
    const rawPeaks: number[] = []

    for (let i = 0; i < TARGET_PEAKS; i++) {
      const start = i * samplesPerPeak
      const end = Math.min(start + samplesPerPeak, channelData.length)
      let max = 0
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j])
        if (abs > max) max = abs
      }
      rawPeaks.push(max)
    }

    // Normalize to 0-1
    const maxPeak = Math.max(...rawPeaks, 0.001)
    return rawPeaks.map((p) => p / maxPeak)
  } finally {
    audioContext.close()
  }
}

/**
 * Generate deterministic placeholder peaks based on set ID.
 * Shown instantly while real waveform is computing.
 */
function generatePlaceholderPeaks(setId: string): number[] {
  let seed = 0
  for (let i = 0; i < setId.length; i++) {
    seed = ((seed << 5) - seed + setId.charCodeAt(i)) | 0
  }

  const peaks: number[] = []
  for (let i = 0; i < TARGET_PEAKS; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const base = (seed / 0x7fffffff) * 0.5 + 0.2
    const beat = Math.sin(i * 0.12) * 0.12 + Math.sin(i * 0.04) * 0.08
    peaks.push(Math.max(0.05, Math.min(1, base + beat)))
  }
  return peaks
}
