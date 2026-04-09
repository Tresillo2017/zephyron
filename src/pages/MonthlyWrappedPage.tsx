import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { fetchMonthlyWrapped, type MonthlyWrappedData } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function MonthlyWrappedPage() {
  const { yearMonth } = useParams<{ yearMonth: string }>()
  const [wrapped, setWrapped] = useState<MonthlyWrappedData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!yearMonth) {
      setError('Year and month not specified')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Parse yearMonth format (e.g., "2026-04")
    const parts = yearMonth.split('-')
    if (parts.length !== 2) {
      setError('Invalid date format')
      setIsLoading(false)
      return
    }

    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      setError('Invalid year or month')
      setIsLoading(false)
      return
    }

    fetchMonthlyWrapped(year, month)
      .then((data) => {
        setWrapped(data)
        setError(null)
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load monthly data'
        if (errorMessage === 'No data for this month') {
          setError('Not enough listening data for this month')
        } else {
          setError(errorMessage)
        }
        setWrapped(null)
      })
      .finally(() => setIsLoading(false))
  }, [yearMonth])

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
            <Skeleton className="h-12 w-40" />
          </div>

          {/* Hours listened skeleton */}
          <div className="card flex flex-col items-center justify-center py-8">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-10 w-24" />
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
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
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
              Unable to load monthly data
            </p>
            <Link to="/app/profile" className="mt-4">
              <Button variant="primary">Back to Profile</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const monthName = MONTH_NAMES[wrapped.month - 1] || 'Unknown'

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="card flex flex-col items-center justify-center py-12">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            Your Monthly Summary
          </p>
          <p className="text-5xl font-[var(--font-weight-bold)] mt-2" style={{ color: 'hsl(var(--c1))' }}>
            {monthName} {wrapped.year}
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
              {wrapped.top_artists && wrapped.top_artists.length > 0 ? wrapped.top_artists[0] : 'N/A'}
            </p>
          </div>

          {/* Top Genre */}
          <div className="card">
            <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
              TOP GENRE
            </p>
            <p className="text-lg font-[var(--font-weight-bold)] mt-2" style={{ color: 'hsl(var(--h3))' }}>
              {wrapped.top_genre || 'N/A'}
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

        {/* Top 3 Artists */}
        <div className="card">
          <p className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c3))' }}>
            TOP 3 ARTISTS
          </p>
          <div className="space-y-3 mt-4">
            {wrapped.top_artists && wrapped.top_artists.length > 0 ? (
              wrapped.top_artists.slice(0, 3).map((artist, index) => (
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

        {/* Longest Set Link */}
        {wrapped.longest_set && (
          <div className="card">
            <p className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c3))' }}>
              LONGEST SET
            </p>
            <Link
              to={`/app/sets/${wrapped.longest_set.id}`}
              className="block mt-4 p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: 'hsl(var(--b4) / 0.5)',
              }}
            >
              <p className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>
                {wrapped.longest_set.title}
              </p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--c2))' }}>
                by {wrapped.longest_set.artist}
              </p>
            </Link>
          </div>
        )}

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
