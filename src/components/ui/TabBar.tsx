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

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
        >
          {tab.icon && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
