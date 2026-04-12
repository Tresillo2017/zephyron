interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-surface-raised rounded ${className}`}
    />
  )
}

export function SetCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function SetGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SetCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProfileStatsSkeleton() {
  return (
    <div className="space-y-5">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-5">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Top Artists */}
      <div className="card p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

export function BadgesGridSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="card p-4 flex flex-col items-center">
            <Skeleton className="w-16 h-16 rounded-full mb-3" />
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PlaylistCardSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function PlaylistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PlaylistCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function SearchResultSkeleton() {
  return (
    <div className="space-y-6">
      {/* Artists */}
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="w-24 h-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Sets */}
      <div>
        <Skeleton className="h-6 w-24 mb-4" />
        <SetGridSkeleton count={4} />
      </div>
    </div>
  )
}

export function ArtistBannerSkeleton() {
  return (
    <div>
      <div className="h-[280px] bg-surface-raised animate-pulse" />
      <div className="px-6 lg:px-10 -mt-[100px] relative z-10">
        <div className="flex items-end gap-5 mb-6">
          <Skeleton className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] rounded-xl flex-shrink-0" />
          <div className="pb-2 flex-1 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SetBannerSkeleton() {
  return (
    <div>
      <div className="h-[280px] bg-surface-raised animate-pulse" />
      <div className="px-6 lg:px-10 -mt-[100px] relative z-10">
        <div className="flex items-end gap-5 mb-6">
          <Skeleton className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] rounded-xl flex-shrink-0" />
          <div className="pb-2 flex-1 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function HistoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
        >
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

export function ArtistCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton className="w-32 h-32 rounded-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function ArtistGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ArtistCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-28 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}
