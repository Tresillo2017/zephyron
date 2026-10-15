import type { ComponentType, ReactNode } from 'react'
import { BrushFilled, Eye2Filled, InformationFilled, LockFilled, User3Filled } from '@mingcute/react/core-filled'
import { SETTINGS_TABS, type SettingsTab } from '../profileTabs'
import './settings.css'

const ICONS: Record<SettingsTab, ComponentType<{ className?: string; size?: number }>> = {
  privacy: Eye2Filled,
  appearance: BrushFilled,
  security: LockFilled,
  account: User3Filled,
  about: InformationFilled,
}

interface SettingsLayoutProps {
  tab: SettingsTab
  onSelect: (tab: SettingsTab) => void
  children: ReactNode
}

/** Settings body: vertical tab nav on the left (200px), the active tab's panel on the right. */
export function SettingsLayout({ tab, onSelect, children }: SettingsLayoutProps) {
  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">
        {SETTINGS_TABS.map(({ id, label }) => {
          const Icon = ICONS[id]
          return (
            <button
              key={id}
              type="button"
              className="settings-nav-item"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => onSelect(id)}
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </nav>
      <div key={tab} className="settings-panel settings-tab-enter">
        {children}
      </div>
    </div>
  )
}
