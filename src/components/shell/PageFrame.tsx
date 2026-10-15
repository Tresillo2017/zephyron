import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Content column under the hero/tab row (sc-dashboard AppShell `.sh-page`).
 * Props:
 * - children: page body
 * - full: drop the cards-width cap (wide grids, players)
 * - className: extra classes on the frame
 */
interface PageFrameProps {
  children: ReactNode
  full?: boolean
  className?: string
}

export function PageFrame({ children, full, className }: PageFrameProps) {
  return (
    <div className={cn('sh-frame', className)} data-full={full ? '' : undefined}>
      {children}
    </div>
  )
}
