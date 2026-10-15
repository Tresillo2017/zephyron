import { useLocation, useNavigationType, Outlet } from 'react-router'

/**
 * Keyed wrapper around the routed page. Enter uses the bleh `grid` entrance (animate-page);
 * redirects (REPLACE) only fade. Both come from motion.css, which drops them under reduced
 * motion, so no JS check is needed. The key remounts the subtree on every path change.
 */
export function PageTransition() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const entrance = navType === 'REPLACE' ? 'animate-fade' : 'animate-page'

  return (
    <div key={pathname} className={entrance}>
      <Outlet />
    </div>
  )
}
