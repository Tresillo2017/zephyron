import { useLocation, useNavigationType, Outlet } from 'react-router'

type AnimationKey = 'enter' | 'open' | 'back' | 'fade'

/** Pick an animation based on where we're going and how we got there */
function resolveAnimation(pathname: string, navType: string): AnimationKey {
  // Browser back/forward — slide from above
  if (navType === 'POP') return 'back'
  // Redirects (RequireAuth, RedirectIfAuth) — quick opacity only
  if (navType === 'REPLACE') return 'fade'
  // Opening a detail page from a list — expand/open feel
  if (/\/app\/(sets|artists|events|playlists)\/[^/]+/.test(pathname)) return 'open'
  // Everything else — standard slide-up
  return 'enter'
}

const ANIMATIONS: Record<AnimationKey, string> = {
  enter: 'page-enter 0.22s var(--ease-spring) both',
  open:  'page-open 0.28s var(--ease-spring) both',
  back:  'page-back 0.18s var(--ease-spring) both',
  fade:  'fade-in 0.15s ease both',
}

export function PageTransition() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const animation = ANIMATIONS[resolveAnimation(pathname, navType)]

  return (
    <div key={pathname} style={{ animation }}>
      <Outlet />
    </div>
  )
}
