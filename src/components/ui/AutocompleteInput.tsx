import { useState, useRef, useEffect, useCallback } from 'react'

export interface AutocompleteOption {
  id: string
  label: string
  sublabel?: string
}

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  onSelect: (option: AutocompleteOption) => void
  onClear?: () => void
  fetchOptions: (query: string) => Promise<AutocompleteOption[]>
  placeholder?: string
  selectedId?: string | null
  className?: string
  debounceMs?: number
  /** Called when user clicks "Create new" in the empty dropdown. Receives the current text value. */
  onCreateNew?: (value: string) => void
  createNewLabel?: string
}

/**
 * Autocomplete input — fetches suggestions as the user types,
 * displays a dropdown, and binds a selected option (id + label).
 * Still allows free-text input when no match is selected.
 */
export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  onClear,
  fetchOptions,
  placeholder,
  selectedId,
  className = '',
  debounceMs = 250,
  onCreateNew,
  createNewLabel = 'Create new',
}: AutocompleteInputProps) {
  const [options, setOptions] = useState<AutocompleteOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const [searchDone, setSearchDone] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch options with debounce
  const doSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (query.trim().length < 2) {
        setOptions([])
        setIsOpen(false)
        setSearchDone(false)
        return
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true)
        try {
          const results = await fetchOptions(query.trim())
          setOptions(results)
          setSearchDone(true)
          // Show dropdown if there are results, or if we can create new
          setIsOpen(results.length > 0 || !!onCreateNew)
          setHighlightedIndex(-1)
        } catch {
          setOptions([])
          setIsOpen(false)
          setSearchDone(false)
        } finally {
          setIsLoading(false)
        }
      }, debounceMs)
    },
    [fetchOptions, debounceMs, onCreateNew]
  )

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    // If user edits after selecting, clear the binding
    if (selectedId) {
      onClear?.()
    }
    doSearch(val)
  }

  const handleSelect = (option: AutocompleteOption) => {
    onChange(option.label)
    onSelect(option)
    setIsOpen(false)
    setOptions([])
    setSearchDone(false)
    setHighlightedIndex(-1)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    const totalItems = options.length + (onCreateNew && options.length === 0 ? 1 : 0)
    if (totalItems === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((i) => (i < totalItems - 1 ? i + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((i) => (i > 0 ? i - 1 : totalItems - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex])
        } else if (onCreateNew && options.length === 0 && highlightedIndex === 0) {
          setIsOpen(false)
          onCreateNew(value)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const handleClearBinding = () => {
    onClear?.()
    inputRef.current?.focus()
  }

  const showDropdown = isOpen && (options.length > 0 || (searchDone && onCreateNew && value.trim().length >= 2))

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (options.length > 0 && value.trim().length >= 2) setIsOpen(true) }}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors"
          style={{
            boxShadow: selectedId
              ? 'inset 0 0 0 1px hsl(var(--h3) / 0.4)'
              : 'none',
          }}
        />

        {/* Right-side indicators */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'hsl(var(--c3) / 0.3)', borderTopColor: 'transparent' }} />
          )}
          {selectedId && (
            <button
              type="button"
              onClick={handleClearBinding}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors hover:opacity-80"
              style={{ background: 'hsl(var(--h3) / 0.15)', color: 'hsl(var(--h3))' }}
              title="Linked — click to unlink"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              linked
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto rounded-xl py-1"
          style={{
            background: 'hsl(var(--b4))',
            boxShadow: '0 8px 35px rgba(0,0,0,0.35), inset 0 0 0 1px hsl(var(--b3) / 0.4)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {options.map((option, i) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2"
              style={{
                background: i === highlightedIndex ? 'hsl(var(--h3) / 0.1)' : 'transparent',
                color: i === highlightedIndex ? 'hsl(var(--h3))' : 'hsl(var(--c1))',
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              <span className="truncate flex-1">{option.label}</span>
              {option.sublabel && (
                <span className="text-[10px] flex-shrink-0" style={{ color: 'hsl(var(--c3))' }}>
                  {option.sublabel}
                </span>
              )}
            </button>
          ))}

          {/* "Create new" option when no results and onCreateNew is provided */}
          {options.length === 0 && onCreateNew && (
            <>
              <div className="px-3 py-1.5 text-[11px]" style={{ color: 'hsl(var(--c3))' }}>
                No matches found
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onCreateNew(value)
                }}
                className="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2"
                style={{
                  background: highlightedIndex === 0 ? 'hsl(var(--h3) / 0.1)' : 'transparent',
                  color: 'hsl(var(--h3))',
                }}
                onMouseEnter={() => setHighlightedIndex(0)}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>{createNewLabel} &ldquo;{value.trim()}&rdquo;</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
