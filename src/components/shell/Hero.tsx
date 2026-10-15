import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Full-bleed 280px banner with a bottom-only gradient and an overlapping avatar or cover.
 * Place it directly after the masthead (it pulls itself under the glass bar).
 * Props:
 * - image: banner photo URL (null = plain canvas)
 * - art: overlapping image/avatar (e.g. <img/> or <UserAvatar/>)
 * - artShape: 'cover' (square, default) | 'avatar' (round)
 * - eyebrow: small line above the title
 * - title: primary heading (rendered as h1)
 * - meta: secondary line (counts, dates)
 * - actions: button row
 */
interface HeroProps {
  image?: string | null
  art?: ReactNode
  artShape?: 'cover' | 'avatar'
  eyebrow?: ReactNode
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function Hero({ image, art, artShape = 'cover', eyebrow, title, meta, actions, className }: HeroProps) {
  const bannerStyle: CSSProperties | undefined = image ? { backgroundImage: `url(${image})` } : undefined
  return (
    <section className={cn('sh-hero', className)} data-art={artShape}>
      <div className="sh-hero-banner" style={bannerStyle} aria-hidden="true" />
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
