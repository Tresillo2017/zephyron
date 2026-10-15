import type { CSSProperties } from 'react'
import { DiscFilled } from '@mingcute/react/core-filled'
import { EmptyState } from '../bleh'
import { SetCard } from './SetCard'
import type { DjSet } from '../../lib/types'
import './sets.css'

/** Stagger cap and step, matching the sc-dashboard grids. */
const MAX_STAGGER = 12
const STAGGER_MS = 30

interface SetGridProps {
  sets: DjSet[]
  isLoading?: boolean
}

function SetGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="zl-set-grid" role="status" aria-label="Loading sets">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="zl-set-cell">
          <div className="ui-skeleton" style={{ aspectRatio: '1', height: 'auto', borderRadius: 'var(--card-radius)' }} />
          <div className="ui-skeleton" style={{ height: 14, width: '75%', marginTop: 10 }} />
          <div className="ui-skeleton" style={{ height: 12, width: '50%', marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

export function SetGrid({ sets, isLoading }: SetGridProps) {
  if (isLoading) {
    return <SetGridSkeleton />
  }

  if (sets.length === 0) {
    return (
      <EmptyState
        icon={<DiscFilled />}
        title="No sets yet"
        description="Sets will appear here once they're added to the catalog."
      />
    )
  }

  return (
    <ul className="zl-set-grid">
      {sets.map((set, i) => (
        <li
          key={set.id}
          className="zl-set-cell animate-grid"
          style={{ '--delay': `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms` } as CSSProperties}
        >
          <SetCard set={set} />
        </li>
      ))}
    </ul>
  )
}
