import { Link } from 'react-router'
import changelog from '../../CHANGELOG.md?raw'

export function ChangelogPage() {
  // Parse the raw markdown into sections
  const sections = parseChangelog(changelog)

  return (
    <div className="px-6 lg:px-10 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>Changelog</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--c3))' }}>What's new in Zephyron</p>
        </div>
        <Link
          to="/app"
          className="text-sm no-underline transition-colors"
          style={{ color: 'hsl(var(--c3))' }}
        >
          Back to app
        </Link>
      </div>

      <div className="space-y-8">
        {sections.map((section, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>
                {section.version}
              </h2>
              {section.date && (
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c3))' }}>
                  {section.date}
                </span>
              )}
            </div>

            {section.categories.map((cat, j) => (
              <div key={j} className="mb-4 last:mb-0">
                <h3 className="text-sm font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--h3))' }}>
                  {cat.name}
                </h3>
                <ul className="space-y-1">
                  {cat.items.map((item, k) => (
                    <li key={k} className="flex gap-2 text-sm" style={{ color: 'hsl(var(--c2))' }}>
                      <span style={{ color: 'hsl(var(--c3))' }}>-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ChangelogSection {
  version: string
  date: string | null
  categories: { name: string; items: string[] }[]
}

function parseChangelog(raw: string): ChangelogSection[] {
  const sections: ChangelogSection[] = []
  let current: ChangelogSection | null = null
  let currentCategory: { name: string; items: string[] } | null = null

  for (const line of raw.split('\n')) {
    // Version header: ## [0.1.0] - 2026-03-20 or ## [Unreleased]
    const versionMatch = line.match(/^## \[(.+?)\](?:\s*-\s*(.+))?/)
    if (versionMatch) {
      if (current) sections.push(current)
      current = {
        version: versionMatch[1],
        date: versionMatch[2]?.trim() || null,
        categories: [],
      }
      currentCategory = null
      continue
    }

    // Category header: ### Added, ### Changed, etc.
    const catMatch = line.match(/^### (.+)/)
    if (catMatch && current) {
      currentCategory = { name: catMatch[1], items: [] }
      current.categories.push(currentCategory)
      continue
    }

    // List item: - Something something
    const itemMatch = line.match(/^- (.+)/)
    if (itemMatch && currentCategory) {
      currentCategory.items.push(itemMatch[1])
    }
  }

  if (current) sections.push(current)
  return sections
}
