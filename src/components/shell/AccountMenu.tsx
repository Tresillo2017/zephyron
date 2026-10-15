import { useNavigate } from 'react-router'
import { DownSmallFilled, ExitFilled, Home1Filled, NewsFilled, BugFilled, User1Filled, UserStarFilled } from '@mingcute/react/core-filled'
import { useSession, signOut } from '../../lib/auth-client'
import { UserAvatar } from '../ui/UserAvatar'
import { MenuItem, MenuSeparator, Popout, usePopout } from '../bleh'
import { openChangelog } from '../WhatsNew'
import { REPORT_ISSUE_URL } from './navItems'

/**
 * Account dropdown (sc-dashboard AccountMenu): avatar + name trigger, glass menu with the
 * user header, nav links, changelog, report issue and sign out. Props:
 * - variant: 'masthead' (name + chevron, hidden below md) | 'mobile' (Me control of the bottom bar)
 */
interface AccountMenuProps {
  variant?: 'masthead' | 'mobile'
}

type SessionUser = { name: string; email?: string; avatar_url?: string | null }

export function AccountMenu({ variant = 'masthead' }: AccountMenuProps) {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const { mounted, btnRef, popoutProps, triggerProps } = usePopout()

  if (!session?.user) return null
  const user = session.user as SessionUser
  const avatarUrl = user.avatar_url ?? undefined

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <>
      {variant === 'mobile' ? (
        <button ref={btnRef} type="button" className="sh-mctl" aria-label="Account menu" {...triggerProps}>
          <span className="sh-mctl-avatar"><UserAvatar avatarUrl={avatarUrl} name={user.name} size={18} /></span>
          <span className="sh-mctl-label">Me</span>
        </button>
      ) : (
        <button ref={btnRef} type="button" className="ui-btn sh-account" data-appearance="subtle" aria-label="Account menu" {...triggerProps}>
          <UserAvatar avatarUrl={avatarUrl} name={user.name} size={26} />
          <span className="sh-account-name">{user.name}</span>
          <DownSmallFilled aria-hidden />
        </button>
      )}

      {mounted && (
        <Popout {...popoutProps} width={variant === 'mobile' ? 280 : 260} align="end">
          <div className="sh-acct-head">
            <UserAvatar avatarUrl={avatarUrl} name={user.name} size={36} />
            <div className="sh-acct-text">
              <span className="sh-acct-name">@{user.name}</span>
              {user.email && <span className="sh-acct-mail">{user.email}</span>}
            </div>
          </div>
          <>
              <MenuItem icon={<Home1Filled />} label="Home" to="/app" />
              <MenuItem icon={<User1Filled />} label="Profile" to="/app/profile" />
              <MenuItem icon={<NewsFilled />} label="Request a Set" to="/app/request-set" />
              <MenuItem icon={<UserStarFilled />} label="Changelog" onClick={() => openChangelog()} />
              <MenuSeparator />
              <a
                href={REPORT_ISSUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="ui-btn ui-menu-item"
                data-tone="default"
              >
                <span className="ui-menu-lead"><BugFilled /></span>
                <span className="ui-menu-body"><span>Report Issue</span></span>
              </a>
              <MenuSeparator />
              <MenuItem icon={<ExitFilled />} label="Sign out" tone="danger" onClick={handleSignOut} />
          </>
        </Popout>
      )}
    </>
  )
}
