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
        <svg className="w-12 h-12 text-text-muted/20 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
        </svg>
        <p className="text-text-muted text-sm">No sets found</p>
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
