import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Modal } from './ui/Modal'
import changelog from '../../CHANGELOG.md?raw'

const LS_KEY = 'zephyron_last_seen_version'

export function WhatsNew() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<ChangelogSection | null>(null)

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

  const handleDismiss = () => {
    localStorage.setItem(LS_KEY, __APP_VERSION__)
    setOpen(false)
  }

  if (!section) return null

  return (
    <Modal isOpen={open} onClose={handleDismiss} title={`What's New in v${section.version}`}>
      <div className="space-y-4">
        {section.date && (
          <span className="text-xs font-mono px-2 py-0.5 rounded inline-block" style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c3))' }}>
            {section.date}
          </span>
        )}

        {section.categories.map((cat, i) => (
          <div key={i}>
            <h3 className="text-sm font-[var(--font-weight-medium)] mb-1.5" style={{ color: 'hsl(var(--h3))' }}>
              {cat.name}
            </h3>
            <ul className="space-y-1">
              {cat.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm" style={{ color: 'hsl(var(--c2))' }}>
                  <span className="shrink-0" style={{ color: 'hsl(var(--c3))' }}>-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <Link
            to="/app/changelog"
            onClick={handleDismiss}
            className="flex-1 text-center px-4 py-2 rounded-lg text-sm no-underline transition-colors"
            style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c2))' }}
          >
            Full Changelog
          </Link>
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors"
            style={{ background: 'hsl(var(--h3))', color: 'white' }}
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
