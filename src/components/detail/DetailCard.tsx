import type { ReactNode } from 'react'
import './detail.css'

interface DetailCardProps {
  title: ReactNode
  /** Optional right-aligned control in the title row (e.g. "read more"). */
  action?: ReactNode
  id?: string
  children: ReactNode
}

/** Rounded bleh card with a 14px title row, used for sidebar and content blocks. */
export function DetailCard({ title, action, id, children }: DetailCardProps) {
  const titleId = id ? `${id}-title` : undefined
  return (
    <section className="dt-about" aria-labelledby={titleId}>
      <div className="dt-card-head">
        <h2 id={titleId} className="dt-card-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
