import { useEffect, useRef } from 'react'

/**
 * Ambilight effect — draws the current video frame onto a low-res canvas
 * at 60fps using requestAnimationFrame. The canvas is styled with CSS
 * blur + saturate to create a reactive color glow behind the video.
 *
 * This is the same technique used by YouTube's ambient mode and Philips Ambilight.
 * The GPU handles the blur shader — the JS only does a cheap drawImage per frame.
 */
export function useAmbilight(
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement | null,
  active: boolean
): void {
  const rafRef = useRef<number>(0)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  // Get canvas context once
  useEffect(() => {
    if (canvasElement) {
      ctxRef.current = canvasElement.getContext('2d', { willReadFrequently: false })
    } else {
      ctxRef.current = null
    }
  }, [canvasElement])

  useEffect(() => {
    if (!active || !videoElement || !canvasElement || !ctxRef.current) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const ctx = ctxRef.current
    const w = canvasElement.width
    const h = canvasElement.height

    const draw = () => {
      // Only draw if video has data and is playing
      if (videoElement.readyState >= 2 && !videoElement.paused) {
        try {
          ctx.drawImage(videoElement, 0, 0, w, h)
        } catch {
          // CORS or other error — skip this frame
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [active, videoElement, canvasElement])
}
