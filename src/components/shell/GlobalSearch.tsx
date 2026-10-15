import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { SearchFilled } from '@mingcute/react/core-filled'
import { Kbd } from '../bleh'
import { cn } from '../../lib/cn'

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform)

/**
 * Masthead search (sc-dashboard GlobalSearch): 200px item that widens on focus, Cmd/Ctrl+K
 * focuses it. Submitting navigates to /app/search?q= (unchanged Zephyron behaviour).
 * Props:
 * - className: extra classes on the wrapper
 * - autoFocus: focus on mount
 * - onNavigate: called after a submit navigates (e.g. to close a sheet)
 */
interface GlobalSearchProps {
  className?: string
  autoFocus?: boolean
  onNavigate?: () => void
}

export function GlobalSearch({ className, autoFocus, onNavigate }: GlobalSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    onNavigate?.()
    navigate(`/app/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn('sh-search-form', className)}>
      <label className="sh-search">
        <SearchFilled aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          autoFocus={autoFocus}
          autoComplete="off"
          aria-label="Search sets, artists, events"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') inputRef.current?.blur() }}
          placeholder="Search sets, artists, events..."
        />
        <Kbd>{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
      </label>
    </form>
  )
}
