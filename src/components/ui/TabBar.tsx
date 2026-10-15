interface TabItem {
  id: string
  label: string
  icon?: string // SVG path data for a 24x24 viewBox
}

interface TabBarProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (id: string) => void
}

/** Legacy Zephyron tab bar, restyled as the bleh underline tabs (glowing bar on the active tab). */
export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div role="tablist" className="ui-tabs" data-variant="underline">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            className="ui-btn ui-tab"
          >
            {tab.icon && (
              <svg className="h-4 w-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
