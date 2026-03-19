import { useState, useEffect, useCallback } from 'react'
import { fetchSets, fetchSet, fetchGenres } from '../lib/api'
import type { DjSet, DjSetWithDetections, Genre } from '../lib/types'

interface UseSetsOptions {
  page?: number
  pageSize?: number
  genre?: string
  sort?: string
}

interface UseSetsResult {
  sets: DjSet[]
  total: number
  totalPages: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useSets(options: UseSetsOptions = {}): UseSetsResult {
  const [sets, setSets] = useState<DjSet[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page = 1, pageSize = 20, genre, sort = 'newest' } = options

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchSets({ page, pageSize, genre, sort })
      setSets(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sets')
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, genre, sort])

  useEffect(() => {
    load()
  }, [load])

  return { sets, total, totalPages, isLoading, error, refetch: load }
}

interface UseSetResult {
  set: DjSetWithDetections | null
  isLoading: boolean
  error: string | null
}

export function useSet(id: string | undefined): UseSetResult {
  const [set, setSet] = useState<DjSetWithDetections | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    fetchSet(id)
      .then((result) => setSet(result.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load set'))
      .finally(() => setIsLoading(false))
  }, [id])

  return { set, isLoading, error }
}

export function useGenres() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchGenres()
      .then((result) => setGenres(result.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return { genres, isLoading }
}
