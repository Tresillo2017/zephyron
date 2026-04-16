import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useSets, useGenres } from '../hooks/useSets'
import { SetGrid } from '../components/sets/SetGrid'
import { Button } from '../components/ui/Button'
import { SORT_OPTIONS } from '../lib/constants'

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const genreParam = searchParams.get('genre') || undefined
  const sortParam = searchParams.get('sort') || 'newest'
  const pageParam = parseInt(searchParams.get('page') || '1')

  const [currentGenre, setCurrentGenre] = useState(genreParam)
  const [currentSort, setCurrentSort] = useState(sortParam)
  const [currentPage, setCurrentPage] = useState(pageParam)

  const { sets, totalPages, isLoading } = useSets({
    page: currentPage,
    pageSize: 24,
    genre: currentGenre,
    sort: currentSort,
  })

  const { genres } = useGenres()

  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const handleGenreChange = useCallback((genre: string | undefined) => {
    setCurrentGenre(genre)
    setCurrentPage(1)
    updateParams({ genre, page: undefined })
  }, [updateParams])

  const handleSortChange = useCallback((sort: string) => {
    setCurrentSort(sort)
    setCurrentPage(1)
    updateParams({ sort, page: undefined })
  }, [updateParams])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    updateParams({ page: page.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [updateParams])

  // Memoize genre buttons to prevent re-renders
  const genreButtons = useMemo(() => (
    <>
      <button
        onClick={() => handleGenreChange(undefined)}
        className="px-4 py-2 text-sm rounded-lg transition-all shrink-0"
        style={{
          background: !currentGenre ? 'hsl(var(--h3))' : 'hsl(var(--b4) / 0.3)',
          color: !currentGenre ? 'white' : 'hsl(var(--c2))',
          boxShadow: !currentGenre ? '0 2px 8px hsl(var(--h3) / 0.3)' : 'inset 0 0 0 1px hsl(var(--b4) / 0.3)',
          fontWeight: !currentGenre ? 'var(--font-weight-medium)' : 'var(--font-weight-default)',
        }}
      >
        All
      </button>
      {genres.map((g) => (
        <button
          key={g.genre}
          onClick={() => handleGenreChange(g.genre)}
          className="px-4 py-2 text-sm rounded-lg transition-all shrink-0"
          style={{
            background: currentGenre === g.genre ? 'hsl(var(--h3))' : 'hsl(var(--b4) / 0.3)',
            color: currentGenre === g.genre ? 'white' : 'hsl(var(--c2))',
            boxShadow: currentGenre === g.genre ? '0 2px 8px hsl(var(--h3) / 0.3)' : 'inset 0 0 0 1px hsl(var(--b4) / 0.3)',
            fontWeight: currentGenre === g.genre ? 'var(--font-weight-medium)' : 'var(--font-weight-default)',
          }}
        >
          #{g.genre} <span style={{ opacity: 0.6 }}>({g.count})</span>
        </button>
      ))}
    </>
  ), [genres, currentGenre, handleGenreChange])

  return (
    <div className="px-6 lg:px-10 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-[var(--font-weight-bold)] mb-1"
          style={{ color: 'hsl(var(--c1))' }}
        >
          Browse Sets
        </h1>
        <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
          Explore {sets.length > 0 && `${totalPages * 24}+`} DJ sets across all genres
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Genre filter */}
        <div>
          <h3
            className="text-xs font-mono tracking-wider mb-3 uppercase"
            style={{ color: 'hsl(var(--c3))' }}
          >
            Filter by Genre
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {genreButtons}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tracking-wider uppercase" style={{ color: 'hsl(var(--c3))' }}>
            Sort:
          </span>
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{
              background: 'hsl(var(--b4) / 0.4)',
              color: 'hsl(var(--c1))',
              boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.3)',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Divider */}
      <div
        className="h-px mb-8"
        style={{
          background: 'linear-gradient(to right, hsl(var(--b4) / 0) 0%, hsl(var(--b4) / 0.5) 50%, hsl(var(--b4) / 0) 100%)',
        }}
      />

      {/* Grid */}
      <SetGrid sets={sets} isLoading={isLoading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-12">
          <Button
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            ← Previous
          </Button>
          <span className="text-sm font-mono tabular-nums px-4" style={{ color: 'hsl(var(--c2))' }}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  )
}
