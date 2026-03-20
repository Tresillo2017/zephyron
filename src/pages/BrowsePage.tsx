import { useState } from 'react'
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
    pageSize: 20,
    genre: currentGenre,
    sort: currentSort,
  })

  const { genres } = useGenres()

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
    }
    setSearchParams(newParams)
  }

  const handleGenreChange = (genre: string | undefined) => {
    setCurrentGenre(genre)
    setCurrentPage(1)
    updateParams({ genre, page: undefined })
  }

  const handleSortChange = (sort: string) => {
    setCurrentSort(sort)
    setCurrentPage(1)
    updateParams({ sort, page: undefined })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    updateParams({ page: page.toString() })
    window.scrollTo(0, 0)
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <h1 className="text-2xl font-bold text-text-primary mb-8">Browse Sets</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        {/* Genre filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={!currentGenre ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleGenreChange(undefined)}
          >
            All
          </Button>
          {genres.map((g) => (
            <Button
              key={g.genre}
              variant={currentGenre === g.genre ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleGenreChange(g.genre)}
            >
              {g.genre} ({g.count})
            </Button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs text-text-muted">Sort:</span>
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="bg-surface-overlay border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <SetGrid sets={sets} isLoading={isLoading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <Button
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
