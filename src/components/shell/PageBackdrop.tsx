import { useEffect, useState } from 'react'

const SWAP_MS = 500

/**
 * Blurred glow behind the page (sc-dashboard PageBackdrop). Fades out, swaps the image and
 * fades back in when `src` changes. Props:
 * - src: image URL, or null for no glow
 * - cssBlur: additionally blur the image in CSS (for pictures that are not pre-blurred)
 */
export function PageBackdrop({ src, cssBlur }: { src: string | null; cssBlur?: boolean }) {
  const [shown, setShown] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (src === shown) return
    setReady(false)
    const timer = setTimeout(() => { setShown(src) }, shown ? SWAP_MS : 0)
    return () => clearTimeout(timer)
  }, [src, shown])

  useEffect(() => {
    if (!shown || shown !== src) return
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    return () => cancelAnimationFrame(frame)
  }, [shown, src])

  return (
    <div className="sh-backdrop" data-ready={ready ? '' : undefined} aria-hidden="true">
      {shown && (
        <div
          className="sh-backdrop-img"
          style={{ backgroundImage: `url(${shown})`, filter: cssBlur ? 'blur(clamp(24px, 3vw, 60px))' : undefined }}
        />
      )}
    </div>
  )
}
