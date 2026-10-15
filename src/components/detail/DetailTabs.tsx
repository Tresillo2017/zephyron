import type { ComponentType } from 'react'
import { cn } from '../../lib/cn'

export interface DetailTab<T extends string> {
  id: T
  label: string
  icon?: ComponentType<{ className?: string }>
}

interface DetailTabsProps<T extends string> {
  tabs: DetailTab<T>[]
  active: T
  onChange: (id: T) => void
  /** Accessible name of the section navigation. */
  label: string
  className?: string
}

/**
 * Stateful tab row under a detail hero, styled as the shell `.sh-tabs` row
 * (accent bar under the active tab, `aria-current` marks it).
 */
export function DetailTabs<T extends string>({ tabs, active, onChange, label, className }: DetailTabsProps<T>) {
  return (
    <nav className={cn('sh-tabs', className)} aria-label={label}>
      <div className="sh-tabs-list">
        {tabs.map(({ id, label: text, icon: Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              type="button"
              className="sh-tab dt-tab"
              aria-pressed={isActive}
              onClick={() => onChange(id)}
            >
              {Icon && <Icon className="sh-tab-icon" aria-hidden="true" />}
              {text}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
