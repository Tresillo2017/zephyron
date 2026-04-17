import { SetCard } from './SetCard'
import { SetGridSkeleton } from '../ui/Skeleton'
import type { DjSet } from '../../lib/types'

interface SetGridProps {
  sets: DjSet[]
  isLoading?: boolean
}

export function SetGrid({ sets, isLoading }: SetGridProps) {
  if (isLoading) {
    return <SetGridSkeleton />
  }

  if (sets.length === 0) {
    return (
      <div className="text-center py-20">
        <div
          className="w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center"
          style={{
            background: 'hsl(var(--b4) / 0.3)',
            boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)',
          }}
        >
          <svg className="w-6 h-6" style={{ color: 'hsl(var(--c3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
        </div>
        <p
          className="text-sm font-[var(--font-weight-medium)] mb-1"
          style={{ color: 'hsl(var(--c2))' }}
        >
          No sets yet
        </p>
        <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
          Sets will appear here once they're added to the catalog.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
      {sets.map((set) => (
        <SetCard key={set.id} set={set} />
      ))}
    </div>
  )
}
