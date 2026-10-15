/** Primary app sections shared by the masthead, the mobile bar and the tab rows. */
export interface ShellNavItem {
  to: string
  label: string
  /** Exact-match active state (Home). */
  end?: boolean
}

/** The four links the masthead exposed before the port. */
export const PRIMARY_NAV: readonly ShellNavItem[] = [
  { to: '/app', label: 'Home', end: true },
  { to: '/app/browse', label: 'Browse' },
  { to: '/app/artists', label: 'Artists' },
  { to: '/app/events', label: 'Events' },
]

export const REPORT_ISSUE_URL = 'https://github.com/Tresillo2017/zephyron/issues/new?template=bug_report.yml'
