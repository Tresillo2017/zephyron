import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { fetchWrapped, type WrappedData } from '../lib/api'
import { Button, Section } from '../components/bleh'
import { RecapMessage, RecapPage, RecapRank, RecapSkeleton, RecapStat } from '../components/detail/RecapParts'
import { WarningFilled } from '@mingcute/react/core-filled'

export function WrappedPage() {
  const { year } = useParams<{ year: string }>()
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
    return <RecapMessage icon={<WarningFilled />} title={error} />
  }

  if (isLoading) {
    return <RecapSkeleton />
  }

  if (!wrapped) {
    return <RecapMessage icon={<WarningFilled />} title="Unable to load Wrapped data" />
  }

  const handleDownloadImage = () => {
    if (wrapped.image_url) {
      window.open(wrapped.image_url, '_blank')
    }
  }

  return (
    <RecapPage eyebrow="Zephyron Wrapped" title={wrapped.year}>
      <RecapStat large label="Total Hours Listened" value={wrapped.total_hours} sub="hours of electronic music" />

      <div className="dt-grid3">
        <RecapStat
          label="TOP ARTIST"
          value={wrapped.top_artist?.name || 'N/A'}
          sub={wrapped.top_artist?.hours ? `${wrapped.top_artist.hours} hours` : undefined}
        />
        <RecapStat label="LONGEST STREAK" value={wrapped.longest_streak_days} accent sub="days" />
        <RecapStat label="NEW DISCOVERIES" value={wrapped.discoveries_count} sub="new tracks" />
      </div>

      <Section title="Top 5 Artists">
        <RecapRank items={(wrapped.top_artists ?? []).slice(0, 5)} emptyText="No artist data available" />
      </Section>

      <div className="dt-center">
        {wrapped.image_url ? (
          <Button appearance="primary" label="Download Wrapped Image" onClick={handleDownloadImage} />
        ) : (
          <p className="dt-recap-sub">Image generation in progress</p>
        )}
        <p className="dt-recap-sub">Generated {new Date(wrapped.generated_at).toLocaleDateString()}</p>
      </div>
    </RecapPage>
  )
}
