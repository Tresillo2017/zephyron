import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import changelog from '../../CHANGELOG.md?raw'

const LS_KEY = 'zephyron_last_seen_version'
const OPEN_CHANGELOG_EVENT = 'zephyron:open-changelog'

const categoryConfig: Record<string, { color: string }> = {
  'New': { color: 'hsl(var(--h3))' },
  'Improved': { color: 'hsl(180 60% 60%)' },
  'Fixed': { color: 'hsl(140 50% 55%)' },
  'Changed': { color: 'hsl(40 70% 60%)' },
  'Deprecated': { color: 'hsl(30 80% 60%)' },
  'Removed': { color: 'hsl(0 60% 55%)' },
  'Security': { color: 'hsl(330 60% 60%)' },
}

// Helper to open changelog from anywhere
export function openChangelog() {
  window.dispatchEvent(new CustomEvent(OPEN_CHANGELOG_EVENT))
}

export function WhatsNew() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<ChangelogSection | null>(null)

  const openModal = () => {
    const parsed = parseFirstSection(changelog)
    if (parsed) {
      setSection(parsed)
      setOpen(true)
    }
  }

  useEffect(() => {
    const lastSeen = localStorage.getItem(LS_KEY)
    if (lastSeen === __APP_VERSION__) return

    // Parse the first version section from the changelog
    const parsed = parseFirstSection(changelog)
    if (parsed) {
      setSection(parsed)
      setOpen(true)
    }
  }, [])

  // Listen for manual open events
  useEffect(() => {
    window.addEventListener(OPEN_CHANGELOG_EVENT, openModal)
    return () => window.removeEventListener(OPEN_CHANGELOG_EVENT, openModal)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(LS_KEY, __APP_VERSION__)
    setOpen(false)
  }

  if (!section) return null

  return (
    <Modal
      isOpen={open}
      onClose={handleDismiss}
      title={`What's New in v${section.version}`}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Header with date and change count */}
        <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid hsl(var(--b4) / 0.3)' }}>
          {section.date && (
            <span
              className="text-xs font-mono px-2 py-1 rounded-md"
              style={{
                background: 'hsl(var(--b4))',
                color: 'hsl(var(--c2))',
              }}
            >
              {section.date}
            </span>
          )}
          <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>
            {section.categories.reduce((sum, cat) => sum + cat.items.length, 0)} changes
          </span>
        </div>

        {/* Category cards */}
        <div className="space-y-3">
          {section.categories.map((cat, i) => {
            const config = categoryConfig[cat.name] || categoryConfig['Changed']
            return (
              <div key={i} className="card p-4">
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <h3
                    className="text-sm font-[var(--font-weight-bold)] uppercase tracking-wide"
                    style={{ color: config.color }}
                  >
                    {cat.name}
                  </h3>
                  <span
                    className="text-xs font-mono ml-auto px-2 py-0.5 rounded"
                    style={{
                      background: 'hsl(var(--b4))',
                      color: 'hsl(var(--c3))',
                    }}
                  >
                    {cat.items.length}
                  </span>
                </div>

                {/* Items list */}
                <ul className="space-y-2">
                  {cat.items.map((item, j) => (
                    <li key={j} className="flex gap-2.5 text-sm leading-relaxed">
                      <span
                        className="shrink-0 mt-2 w-1 h-1 rounded-full"
                        style={{
                          background: 'hsl(var(--c3))',
                        }}
                      />
                      <span style={{ color: 'hsl(var(--c2))' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Action button */}
        <div className="pt-2">
          <button
            onClick={handleDismiss}
            className="w-full h-[var(--button-height)] rounded-[var(--button-radius)] text-sm font-[var(--font-weight-medium)] cursor-pointer transition-all"
            style={{
              background: 'hsl(var(--h3))',
              color: 'white',
              boxShadow: '0 0 20px hsl(var(--h3) / 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'hsl(var(--h2))'
              e.currentTarget.style.transform = 'scale(0.98)'
              e.currentTarget.style.boxShadow = '0 0 25px hsl(var(--h3) / 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'hsl(var(--h3))'
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = '0 0 20px hsl(var(--h3) / 0.3)'
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  )
}

interface ChangelogSection {
  version: string
  date: string | null
  categories: { name: string; items: string[] }[]
}

function parseFirstSection(raw: string): ChangelogSection | null {
  let current: ChangelogSection | null = null
  let currentCategory: { name: string; items: string[] } | null = null

  for (const line of raw.split('\n')) {
    const versionMatch = line.match(/^## \[(.+?)\](?:\s*-\s*(.+))?/)
    if (versionMatch) {
      // If we already have a section, return it (we only want the first)
      if (current) return current
      current = {
        version: versionMatch[1],
        date: versionMatch[2]?.trim() || null,
        categories: [],
      }
      currentCategory = null
      continue
    }

    const catMatch = line.match(/^### (.+)/)
    if (catMatch && current) {
      currentCategory = { name: catMatch[1], items: [] }
      current.categories.push(currentCategory)
      continue
    }

    const itemMatch = line.match(/^- (.+)/)
    if (itemMatch && currentCategory) {
      currentCategory.items.push(itemMatch[1])
    }
  }

  return current
}
