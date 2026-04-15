import type { ReactNode } from 'react'

export interface SidebarTab {
  id: string
  label: string
  icon: string
}

export interface SidebarDropdown {
  id: string
  label: string
  icon: string
  items: SidebarTab[]
  isExpanded?: boolean
  onToggle?: () => void
}

interface PageSidebarProps {
  title: string
  tabs: SidebarTab[]
  dropdowns?: SidebarDropdown[]
  activeTab: string
  onTabChange: (tabId: string) => void
  footer?: ReactNode
}

/**
 * Standardized sidebar navigation component for all pages.
 *
 * Design features:
 * - 200px fixed width
 * - Sticky positioning
 * - HSL-parametric color system
 * - Border-right separator
 * - Support for dropdowns (like Settings in Profile)
 * - Consistent hover/active states
 *
 * @example
 * ```tsx
 * <PageSidebar
 *   title="Admin"
 *   tabs={[
 *     { id: 'sets', label: 'Sets', icon: '...' },
 *     { id: 'users', label: 'Users', icon: '...' },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * ```
 */
export function PageSidebar({
  title,
  tabs,
  dropdowns = [],
  activeTab,
  onTabChange,
  footer,
}: PageSidebarProps) {
  return (
    <aside
      className="w-[200px] shrink-0 px-4 py-6 sticky top-0 h-screen flex flex-col"
      style={{
        borderRight: '1px solid hsl(var(--b4) / 0.25)',
        background: 'hsl(var(--b6))',
      }}
    >
      {/* Title */}
      <h1
        className="text-sm font-[var(--font-weight-bold)] mb-4 px-3"
        style={{ color: 'hsl(var(--c1))' }}
      >
        {title}
      </h1>

      {/* Navigation */}
      <nav className="space-y-1 flex-1">
        {/* Regular tabs */}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeTab === tab.id
                ? 'font-[var(--font-weight-medium)]'
                : ''
            }`}
            style={{
              color: activeTab === tab.id ? 'hsl(var(--c1))' : 'hsl(var(--c2))',
              background: activeTab === tab.id ? 'hsl(var(--b4) / 0.5)' : 'transparent',
            }}
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={tab.icon}
              />
            </svg>
            {tab.label}
          </button>
        ))}

        {/* Dropdowns */}
        {dropdowns.map((dropdown) => {
          const dropdownTabIds = dropdown.items.map(item => item.id)
          const isActive = dropdownTabIds.includes(activeTab)

          return (
            <div key={dropdown.id}>
              <button
                onClick={dropdown.onToggle}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'font-[var(--font-weight-medium)]'
                    : ''
                }`}
                style={{
                  color: isActive
                    ? 'hsl(var(--c1))'
                    : 'hsl(var(--c2))',
                  background: isActive
                    ? 'hsl(var(--b4) / 0.5)'
                    : 'transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={dropdown.icon}
                    />
                  </svg>
                  {dropdown.label}
                </div>
                <svg
                  className="w-3.5 h-3.5 shrink-0 transition-transform"
                  style={{
                    transform: dropdown.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown items */}
              {dropdown.isExpanded && (
                <div className="mt-1 ml-4 space-y-1">
                  {dropdown.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeTab === item.id
                          ? 'font-[var(--font-weight-medium)]'
                          : ''
                      }`}
                      style={{
                        color: activeTab === item.id ? 'hsl(var(--c1))' : 'hsl(var(--c2))',
                        background: activeTab === item.id ? 'hsl(var(--b4) / 0.5)' : 'transparent',
                      }}
                    >
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={item.icon}
                        />
                      </svg>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer (optional) */}
      {footer && (
        <div className="mt-auto pt-4">
          {footer}
        </div>
      )}
    </aside>
  )
}
