import { useRef, useEffect, useCallback, useMemo } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import type { Detection } from '../../lib/types'

interface WaveformProps {
  peaks: number[]
  duration: number
  detections?: Detection[]
  height?: number
  className?: string
}

const DETECTION_COLORS = [
  'rgba(139, 92, 246, 0.12)',
  'rgba(167, 139, 250, 0.10)',
  'rgba(139, 92, 246, 0.08)',
  'rgba(167, 139, 250, 0.14)',
]

export function Waveform({
  peaks,
  duration,
  detections = [],
  height = 80,
  className = '',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const seek = usePlayerStore((s) => s.seek)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const progress = duration > 0 ? currentTime / duration : 0

  const downsampledPeaks = useMemo(() => {
    if (!containerRef.current || peaks.length === 0) return peaks
    const width = containerRef.current.clientWidth || 800
    const barCount = Math.floor(width / 3)
    if (peaks.length <= barCount) return peaks

    const result: number[] = []
    const chunkSize = peaks.length / barCount
    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * chunkSize)
      const end = Math.floor((i + 1) * chunkSize)
      let max = 0
      for (let j = start; j < end && j < peaks.length; j++) {
        if (peaks[j] > max) max = peaks[j]
      }
      result.push(max)
    }
    return result
  }, [peaks])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const barWidth = 2
    const gap = 1
    const step = barWidth + gap
    const barCount = Math.floor(w / step)
    const centerY = h / 2

    ctx.clearRect(0, 0, w, h)

    // Draw detection regions
    for (let i = 0; i < detections.length; i++) {
      const det = detections[i]
      const x1 = (det.start_time_seconds / duration) * w
      const x2 = det.end_time_seconds
        ? (det.end_time_seconds / duration) * w
        : (i + 1 < detections.length
          ? (detections[i + 1].start_time_seconds / duration) * w
          : w)
      ctx.fillStyle = DETECTION_COLORS[i % DETECTION_COLORS.length]
      ctx.fillRect(x1, 0, x2 - x1, h)
    }

    // Draw bars
    const peaksToUse = downsampledPeaks.length > 0 ? downsampledPeaks : peaks
    for (let i = 0; i < barCount; i++) {
      const peakIndex = Math.floor((i / barCount) * peaksToUse.length)
      const peak = peaksToUse[peakIndex] || 0
      const barHeight = Math.max(2, peak * (h * 0.8))
      const x = i * step
      const progressX = progress * w

      ctx.fillStyle = x < progressX ? '#8b5cf6' : '#3f3f46'
      const halfBar = barHeight / 2
      ctx.fillRect(x, centerY - halfBar, barWidth, barHeight)
    }

    // Playhead
    if (duration > 0) {
      const playheadX = progress * w
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, h)
      ctx.stroke()
    }
  }, [peaks, downsampledPeaks, progress, duration, detections])

  useEffect(() => {
    if (!isPlaying) { draw(); return }
    let raf: number
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [draw, isPlaying])

  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  useEffect(() => { draw() }, [draw])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (duration <= 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      seek((x / rect.width) * duration)
    },
    [duration, seek]
  )

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full cursor-pointer"
        style={{ height: `${height}px` }}
      />
    </div>
  )
}
