import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { TagFilled } from '@mingcute/react/core-filled'
import { useSets, useGenres } from '../hooks/useSets'
import { SetGrid } from '../components/sets/SetGrid'
import {
  ContentCard, Pagination, Section, Select, SideAction, SideActions, Toolbar,
} from '../components/bleh'
import { PageFrame } from '../components/shell'
import { SORT_OPTIONS } from '../lib/constants'
import './library.css'

const PAGE_SIZE = 24

const SORT_CHOICES = SORT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const genreParam = searchParams.get('genre') || undefined
  const sortParam = searchParams.get('sort') || 'newest'
  const pageParam = parseInt(searchParams.get('page') || '1')

  const [currentGenre, setCurrentGenre] = useState(genreParam)
  const [currentSort, setCurrentSort] = useState(sortParam)
  const [currentPage, setCurrentPage] = useState(pageParam)

  const { sets, total, isLoading } = useSets({
    page: currentPage,
    pageSize: PAGE_SIZE,
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

  return (
    <PageFrame>
      <ContentCard
        toolbar={
          <Toolbar>
            <h1 className="zl-toolbar-title">Browse sets</h1>
            {!isLoading && <span className="zl-toolbar-meta">{total} sets</span>}
            <div className="cc-toolbar-fill" />
            <div className="zl-toolbar-trail">
              <Select label="Sort sets" value={currentSort} options={SORT_CHOICES} onChange={handleSortChange} />
            </div>
          </Toolbar>
        }
        main={
          <Section>
            <SetGrid sets={sets} isLoading={isLoading} />
            <Pagination
              page={currentPage - 1}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={(page) => handlePageChange(page + 1)}
            />
          </Section>
        }
        side={
          <Section title="Genres">
            <SideActions>
              <SideAction
                icon={<TagFilled />}
                label="All genres"
                on={!currentGenre}
                onClick={() => handleGenreChange(undefined)}
              />
              {genres.map((g) => (
                <SideAction
                  key={g.genre}
                  icon={<TagFilled />}
                  label={g.genre}
                  note={g.count}
                  on={currentGenre === g.genre}
                  onClick={() => handleGenreChange(g.genre)}
                />
              ))}
            </SideActions>
          </Section>
        }
      />
    </PageFrame>
  )
}
