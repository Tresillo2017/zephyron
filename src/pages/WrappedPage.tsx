import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { fetchWrapped, type WrappedData } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'

export function WrappedPage() {
  const { year } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const [wrapped, setWrapped] = useState<WrappedData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!year) {
      setError('Year not specified')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    fetchWrapped(year)
      .then((data) => {
        setWrapped(data)
        setError(null)
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load Wrapped data'
        if (errorMessage === 'No data for this year') {
          setError('Not enough listening data yet')
        } else {
          setError(errorMessage)
        }
        setWrapped(null)
      })
      .finally(() => setIsLoading(false))
  }, [year])

  if (error) {
    return (
      <div className="px-6 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="card flex flex-col items-center justify-center py-12">
            <p className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
              {error}
            </p>
            <Link to="/app/profile" className="mt-4">
              <Button variant="primary">Back to Profile</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-6 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Hero skeleton */}
          <div className="card flex flex-col items-center justify-center py-12">
            <Skeleton className="h-8 w-24 mb-4" />
            <Skeleton className="h-12 w-32" />
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>

          {/* Top artists skeleton */}
          <div className="card space-y-4">
            <Skeleton className="h-6 w-32" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>

          {/* Download button skeleton */}
          <div className="flex justify-center">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    )
  }

  if (!wrapped) {
    return (
      <div className="px-6 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="card flex flex-col items-center justify-center py-12">
            <p className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
              Unable to load Wrapped data
            </p>
            <Link to="/app/profile" className="mt-4">
              <Button variant="primary">Back to Profile</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleDownloadImage = () => {
    if (wrapped.image_url) {
      window.open(wrapped.image_url, '_blank')
    }
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="card flex flex-col items-center justify-center py-12">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            Zephyron Wrapped
          </p>
          <p className="text-6xl font-[var(--font-weight-bold)] mt-2" style={{ color: 'hsl(var(--c1))' }}>
            {wrapped.year}
          </p>
        </div>

        {/* Main Stats */}
        <div className="card">
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
              Total Hours Listened
            </p>
            <p className="text-5xl font-[var(--font-weight-bold)] mt-2" style={{ color: 'hsl(var(--h3))' }}>
              {wrapped.total_hours}
            </p>
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--c2))' }}>
              hours of electronic music
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Artist */}
          <div className="card">
            <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
              TOP ARTIST
            </p>
            <p className="text-lg font-[var(--font-weight-bold)] mt-2" style={{ color: 'hsl(var(--c1))' }}>
              {wrapped.top_artist?.name || 'N/A'}
            </p>
            {wrapped.top_artist?.hours && (
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--c2))' }}>
                {wrapped.top_artist.hours} hours
              </p>
            )}
          </div>

          {/* Longest Streak */}
          <div className="card">
            <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
              LONGEST STREAK
            </p>
            <p className="text-lg font-[var(--font-weight-bold)] mt-2" style={{ color: 'hsl(var(--h3))' }}>
              {wrapped.longest_streak_days}
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--c2))' }}>
              days
            </p>
          </div>

          {/* Discoveries */}
          <div className="card">
            <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
              NEW DISCOVERIES
            </p>
            <p className="text-lg font-[var(--font-weight-bold)] mt-2" style={{ color: 'hsl(var(--c1))' }}>
              {wrapped.discoveries_count}
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--c2))' }}>
              new tracks
            </p>
          </div>
        </div>

        {/* Top 5 Artists */}
        <div className="card">
          <p className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c3))' }}>
            TOP 5 ARTISTS
          </p>
          <div className="space-y-3 mt-4">
            {wrapped.top_artists && wrapped.top_artists.length > 0 ? (
              wrapped.top_artists.slice(0, 5).map((artist, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'hsl(var(--c1))' }}>
                    <span style={{ color: 'hsl(var(--h3))' }} className="font-[var(--font-weight-medium)] mr-3">
                      #{index + 1}
                    </span>
                    {artist}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs" style={{ color: 'hsl(var(--c2))' }}>
                No artist data available
              </p>
            )}
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-center pt-4">
          {wrapped.image_url ? (
            <Button
              variant="primary"
              onClick={handleDownloadImage}
              className="px-6"
            >
              Download Wrapped Image
            </Button>
          ) : (
            <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
              Image generation in progress
            </div>
          )}
        </div>

        {/* Generated Date */}
        <div className="text-center pt-4">
          <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
            Generated {new Date(wrapped.generated_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
