import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import './detail.css'

/**
 * Same markup and geometry as the shell `Hero` (`.sh-hero*` classes), plus a `media` slot so a
 * banner can be a video or an image with opacity. The bottom-only gradient comes from
 * `.sh-hero-banner::after`. Place it directly after the masthead.
 */
interface DetailHeroProps {
  /** Banner media (img/video, absolutely positioned via `.dt-hero-media`). */
  media?: ReactNode
  art?: ReactNode
  artShape?: 'cover' | 'avatar'
  eyebrow?: ReactNode
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function DetailHero({ media, art, artShape = 'cover', eyebrow, title, meta, actions, className }: DetailHeroProps) {
  return (
    <section className={cn('sh-hero', className)} data-art={artShape}>
      <div className="sh-hero-banner" aria-hidden="true">
        {media}
      </div>
      <div className="sh-hero-body">
        {art && <div className="sh-hero-art">{art}</div>}
        <div className="sh-hero-text">
          {eyebrow && <p className="sh-hero-eyebrow">{eyebrow}</p>}
          <h1 className="sh-hero-title font-head">{title}</h1>
          {meta && <div className="sh-hero-meta">{meta}</div>}
          {actions && <div className="sh-hero-actions">{actions}</div>}
        </div>
      </div>
    </section>
  )
}
