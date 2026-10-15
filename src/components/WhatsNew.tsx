import { useState, useEffect } from 'react'
import { Modal, Button, Badge } from './bleh'
import './shell/dialogs.css'
import changelog from '../../CHANGELOG.md?raw'

const LS_KEY = 'zephyron_last_seen_version'
const OPEN_CHANGELOG_EVENT = 'zephyron:open-changelog'

const categoryConfig: Record<string, { tone: 'accent' | 'success' | 'warning' | 'error' | 'new' | 'neutral' }> = {
  'New': { tone: 'accent' },
  'Improved': { tone: 'new' },
  'Fixed': { tone: 'success' },
  'Changed': { tone: 'warning' },
  'Deprecated': { tone: 'warning' },
  'Removed': { tone: 'error' },
  'Security': { tone: 'error' },
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
  if (!open) return null

  const total = section.categories.reduce((sum, cat) => sum + cat.items.length, 0)

  return (
    <Modal
      title={`What's New in v${section.version}`}
      description={section.date ?? undefined}
      onClose={handleDismiss}
      width={560}
      footer={<Button appearance="primary" label="Got it" onClick={handleDismiss} />}
    >
      <div className="wn-meta">
        <Badge>{total} {total === 1 ? 'change' : 'changes'}</Badge>
      </div>
      <div className="wn-cats">
        {section.categories.map((cat, i) => {
          const config = categoryConfig[cat.name] || categoryConfig['Changed']
          return (
            <section key={i} className="wn-cat">
              <header className="wn-cat-head">
                <Badge tone={config.tone}>{cat.name}</Badge>
                <span className="wn-cat-count">{cat.items.length}</span>
              </header>
              <ul className="wn-items">
                {cat.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </section>
          )
        })}
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
