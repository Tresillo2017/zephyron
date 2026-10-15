import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { fetchMonthlyWrapped, type MonthlyWrappedData } from '../lib/api'
import { Section } from '../components/bleh'
import {
  RecapLink,
  RecapMessage,
  RecapPage,
  RecapRank,
  RecapSkeleton,
  RecapStat,
} from '../components/detail/RecapParts'
import { ChartBarFilled, WarningFilled } from '@mingcute/react/core-filled'

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
    // Determine if it's a "no data" error vs a real error
    const isNoData = error.includes('Not enough listening data') || error.includes('No data')

    return isNoData ? (
      <RecapMessage
        icon={<ChartBarFilled />}
        title="No Data Yet"
        body="You don't have enough listening activity for this month yet. Start listening to some sets to generate your monthly wrapped!"
      />
    ) : (
      <RecapMessage icon={<WarningFilled />} title="Unable to Load" body={error} />
    )
  }

  if (isLoading) {
    return <RecapSkeleton />
  }

  if (!wrapped) {
    return <RecapMessage icon={<WarningFilled />} title="Unable to load monthly data" />
  }

  const monthName = MONTH_NAMES[wrapped.month - 1] || 'Unknown'

  return (
    <RecapPage eyebrow="Your Monthly Summary" title={`${monthName} ${wrapped.year}`}>
      <RecapStat large label="Total Hours Listened" value={wrapped.total_hours} sub="hours of electronic music" />

      <div className="dt-grid3">
        <RecapStat label="TOP ARTIST" value={wrapped.top_artists && wrapped.top_artists.length > 0 ? wrapped.top_artists[0] : 'N/A'} />
        <RecapStat label="TOP GENRE" value={wrapped.top_genre || 'N/A'} accent />
        <RecapStat label="NEW DISCOVERIES" value={wrapped.discoveries_count} sub="new tracks" />
      </div>

      <Section title="Top 3 Artists">
        <RecapRank items={(wrapped.top_artists ?? []).slice(0, 3)} emptyText="No artist data available" />
      </Section>

      {wrapped.longest_set && (
        <Section title="Longest Set">
          <RecapLink
            to={`/app/sets/${wrapped.longest_set.id}`}
            title={wrapped.longest_set.title}
            subtitle={`by ${wrapped.longest_set.artist}`}
          />
        </Section>
      )}

      <p className="dt-recap-sub dt-center">Generated {new Date(wrapped.generated_at).toLocaleDateString()}</p>
    </RecapPage>
  )
}
