import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BellRingingFilled } from '@mingcute/react/core-filled'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../lib/api'
import type { Notification } from '../../lib/types'
import { Counter, Popout, usePopout } from '../bleh'

const POLL_MS = 60_000
const NOTIFICATION_LIMIT = 10

const ICONS: Record<string, string> = { new_set: '🎧', annotation_approved: '✅' }

/**
 * Notification bell with a glass dropdown. Mounted only for signed-in users. Polls every 60s;
 * opening the menu marks everything read (as before the port). Clicking an item marks it read
 * and follows its link. No props.
 */
export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { open, mounted, btnRef, popoutProps, triggerProps, toggle, close } = usePopout()

  useEffect(() => {
    const fetchNotifs = () => {
      getNotifications()
        .then((res) => {
          setNotifications(res.data.notifications)
          setUnreadCount(res.data.unread_count)
        })
        .catch(() => {})
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, POLL_MS)
    return () => clearInterval(interval)
  }, [])

  const handleBell = () => {
    if (!open && unreadCount > 0) {
      markAllNotificationsRead()
        .then(() => {
          setUnreadCount(0)
          setNotifications((prev) => prev.map((x) => ({ ...x, is_read: 1 })))
        })
        .catch(() => {})
    }
    toggle()
  }

  const handleItem = (id: Notification['id']) => {
    markNotificationRead(id).catch(() => {})
    setNotifications((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: 1 } : x)))
    close()
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="ui-btn sh-bell"
        data-appearance="subtle"
        data-icon=""
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        {...triggerProps}
        onClick={handleBell}
      >
        <BellRingingFilled aria-hidden />
        <Counter count={unreadCount} className="sh-bell-count" />
      </button>

      {mounted && (
        <Popout {...popoutProps} width={320} align="end">
          <div className="ui-menu-header">Notifications</div>
          {notifications.length === 0 ? (
            <div className="sh-menu-empty">No notifications yet</div>
          ) : (
            <div className="sh-notif-list">
              {notifications.slice(0, NOTIFICATION_LIMIT).map((n) => (
                <Link
                  key={n.id}
                  to={n.link ?? '/app'}
                  role="menuitem"
                  className="ui-btn ui-menu-item sh-notif-item"
                  data-unread={n.is_read === 0 ? '' : undefined}
                  onClick={() => handleItem(n.id)}
                >
                  <span className="ui-menu-lead" aria-hidden="true">{ICONS[n.type] ?? '✗'}</span>
                  <span className="ui-menu-body">
                    <span>{n.title}</span>
                    <span className="ui-menu-desc">{n.body}</span>
                    <span className="ui-menu-desc">{new Date(n.created_at).toLocaleDateString()}</span>
                  </span>
                  {n.is_read === 0 && <span className="sh-notif-dot" aria-hidden="true" />}
                </Link>
              ))}
            </div>
          )}
        </Popout>
      )}
    </>
  )
}
