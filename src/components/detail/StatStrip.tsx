import type { ReactNode } from 'react'
import './detail.css'

export interface StatItem {
  key: string
  value: ReactNode
  label: ReactNode
}

/** Horizontal band of headline numbers with inset dividers (artist listeners, scrobbles, sets). */
export function StatStrip({ items, label }: { items: StatItem[]; label: string }) {
  return (
    <dl className="dt-strip" aria-label={label}>
      {items.map((item) => (
        <div key={item.key} className="dt-strip-item">
          <dt className="dt-strip-label">{item.label}</dt>
          <dd className="dt-strip-value">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
