import { Link, useNavigate, useLocation } from "react-router";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "../../lib/auth-client";
import { UserAvatar } from "../ui/UserAvatar";
import { Logo } from "../ui/Logo";
import { openChangelog } from "../WhatsNew";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../lib/api";
import type { Notification } from "../../lib/types";

export function TopNav() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuExiting, setMenuExiting] = useState(false);
  const menuExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [notifExiting, setNotifExiting] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const closeMenu = () => {
    if (menuExitTimer.current) clearTimeout(menuExitTimer.current)
    setMenuExiting(true)
    menuExitTimer.current = setTimeout(() => {
      setShowUserMenu(false)
      setMenuExiting(false)
    }, 150)
  }

  // Close menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    if (showUserMenu) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  // Scroll-driven blur — listen to the actual scroll container, not window
  useEffect(() => {
    const container = document.getElementById("app-scroll-container");
    if (!container) return;
    const onScroll = () => setScrolled(container.scrollTop > 10);
    container.addEventListener("scroll", onScroll, { passive: true });
    setScrolled(container.scrollTop > 10);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch notifications on mount and poll every 60s
  useEffect(() => {
    if (!session) return
    const fetchNotifs = () => {
      getNotifications()
        .then((res) => {
          setNotifications(res.data.notifications)
          setUnreadCount(res.data.unread_count)
        })
        .catch(() => {})
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60_000)
    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (!showNotifMenu) return
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifExiting(true)
        setTimeout(() => { setShowNotifMenu(false); setNotifExiting(false) }, 150)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifMenu])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/app/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    closeMenu();
    await signOut();
    navigate("/");
  };

  // Is this a page with a banner? (artist, set pages)
  const hasBanner = location.pathname.match(/\/app\/(sets|artists)\//);

  // Non-banner: glass always visible (blur + bg from page load), deepens on scroll
  // Banner: transparent until scrolled past threshold (~280px banner)
  const glassOpacity = hasBanner
    ? scrolled
      ? 0.92
      : 0
    : scrolled
    ? 0.95
    : 0.85;
  const blurAmount = hasBanner
    ? scrolled
      ? "blur(20px)"
      : "blur(0px)"
    : scrolled
    ? "blur(24px)"
    : "blur(20px)";

  return (
    <nav
      className="sticky top-0 z-40 flex items-center h-[calc(20px+var(--button-height))] px-4 sm:px-6 gap-3 sm:gap-4"
      style={{ background: "transparent" }}
    >
      {/* Gradient overlay behind nav — transitions in on scroll */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `hsl(var(--b6) / ${glassOpacity})`,
          backdropFilter: `${blurAmount} saturate(180%)`,
          WebkitBackdropFilter: `${blurAmount} saturate(180%)`,
          boxShadow: scrolled ? "0 1px 0 hsl(var(--b4) / 0.2)" : "none",
          transition:
            "background 0.3s ease, backdrop-filter 0.3s ease, box-shadow 0.3s ease",
        }}
      />

      {/* Logo */}
      <Link to="/app" className="flex items-center gap-2 no-underline shrink-0">
        <Logo size={24} />
        <div className="hidden sm:flex items-center gap-2">
          <span
            className="text-sm font-[var(--font-weight-bold)] tracking-tight"
            style={{ color: "hsl(var(--c1))" }}
          >
            Zephyron
          </span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: "hsl(var(--h3) / 0.12)",
              color: "hsl(var(--h3))",
            }}
          >
            v{__APP_VERSION__}
          </span>
        </div>
      </Link>

      {/* Main nav links */}
      <div className="hidden md:flex items-center gap-0.5 ml-2">
        {[
          { to: "/app", label: "Home" },
          { to: "/app/browse", label: "Browse" },
          { to: "/app/artists", label: "Artists" },
          { to: "/app/events", label: "Events" },
        ].map((link) => {
          const isActive =
            location.pathname === link.to ||
            (link.to !== "/app" && location.pathname.startsWith(link.to));
          return (
            <Link
              key={link.to}
              to={link.to}
              className="px-3 py-1.5 rounded-lg text-sm no-underline transition-all"
              style={{
                color: isActive ? "hsl(var(--c1))" : "hsl(var(--c3))",
                background: isActive ? "hsl(var(--b4) / 0.4)" : "transparent",
                fontWeight: isActive
                  ? "var(--font-weight-medium)"
                  : "var(--font-weight-default)",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Center: search */}
      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-lg mx-auto hidden sm:block"
      >
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "hsl(var(--c3) / 0.6)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sets, artists, events..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg text-sm focus:outline-none transition-all"
            style={{
              background: scrolled ? "hsl(var(--b4) / 0.4)" : "transparent",
              color: "hsl(var(--c1))",
              border: scrolled
                ? "1px solid hsl(var(--b4) / 0.3)"
                : "1px solid transparent",
            }}
          />
        </div>
      </form>

      {/* Right: icons + user */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search icon for mobile */}
        <Link
          to="/app/search"
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ color: "hsl(var(--c3))" }}
          title="Search"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </Link>

        {session?.user?.role === "admin" && (
          <Link
            to="/app/admin"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "hsl(var(--c3))" }}
            title="Admin"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
        )}

        {/* Notification bell */}
        {session?.user && (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                if (showNotifMenu) {
                  setNotifExiting(true)
                  setTimeout(() => { setShowNotifMenu(false); setNotifExiting(false) }, 150)
                } else {
                  setShowNotifMenu(true)
                  // Close user menu if open
                  if (showUserMenu) closeMenu()
                  if (unreadCount > 0) {
                    markAllNotificationsRead()
                      .then(() => {
                        setUnreadCount(0)
                        setNotifications(prev => prev.map(x => ({ ...x, is_read: 1 })))
                      })
                      .catch(() => {})
                  }
                }
              }}
              className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
              style={{ color: 'hsl(var(--c2))' }}
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                  style={{ background: 'hsl(0 70% 55%)' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {(showNotifMenu || notifExiting) && (
              <div
                className="absolute right-0 top-full mt-2 w-[320px] z-50 rounded-[var(--card-radius)] overflow-hidden"
                style={{
                  background: 'hsl(var(--b5) / 0.97)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px hsl(var(--b4) / 0.3)',
                  animation: notifExiting
                    ? 'solarium-out 0.15s ease-in forwards'
                    : 'solarium 0.2s var(--ease-out-custom)',
                }}
              >
                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid hsl(var(--b4) / 0.3)' }}>
                  <p className="text-xs font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>
                    Notifications
                  </p>
                </div>

                {notifications.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>No notifications yet</p>
                  </div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.slice(0, 10).map((n) => (
                      <Link
                        key={n.id}
                        to={n.link ?? '/app'}
                        onClick={() => {
                          markNotificationRead(n.id).catch(() => {})
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x))
                          setNotifExiting(true)
                          setTimeout(() => { setShowNotifMenu(false); setNotifExiting(false) }, 150)
                        }}
                        className="flex items-start gap-3 px-3 py-2.5 no-underline transition-colors"
                        style={{
                          background: n.is_read === 0 ? 'hsl(var(--h3) / 0.06)' : 'transparent',
                          borderBottom: '1px solid hsl(var(--b4) / 0.15)',
                        }}
                      >
                        <span className="text-base mt-0.5 shrink-0">
                          {n.type === 'new_set' ? '🎧' : n.type === 'annotation_approved' ? '✅' : '✗'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--c1))' }}>
                            {n.title}
                          </p>
                          <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--c2))' }}>
                            {n.body}
                          </p>
                          <p className="text-[10px] mt-1 font-mono" style={{ color: 'hsl(var(--c3))' }}>
                            {new Date(n.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {n.is_read === 0 && (
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'hsl(var(--h3))' }} />
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* User dropdown */}
        {session?.user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                if (showUserMenu) {
                  closeMenu()
                } else {
                  setShowUserMenu(true)
                  // Close notif menu if open
                  if (showNotifMenu) {
                    setNotifExiting(true)
                    setTimeout(() => { setShowNotifMenu(false); setNotifExiting(false) }, 150)
                  }
                }
              }}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full transition-all"
              style={{
                background: showUserMenu
                  ? "hsl(var(--b4) / 0.4)"
                  : "transparent",
              }}
            >
              <UserAvatar
                avatarUrl={(session.user as any)?.avatar_url}
                name={session.user.name}
                size={26}
              />
              <span
                className="text-sm hidden sm:inline"
                style={{ color: "hsl(var(--c1))" }}
              >
                {session.user.name}
              </span>
              <svg
                className="w-3 h-3 transition-transform"
                style={{
                  color: "hsl(var(--c3))",
                  transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {(showUserMenu || menuExiting) && (
              <div
                className="absolute right-0 top-full mt-2 w-[280px] p-2.5 z-50 rounded-[var(--card-radius)]"
                style={{
                  background: "hsl(var(--b5) / 0.97)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px hsl(var(--b4) / 0.3)",
                  animation: menuExiting
                    ? "solarium-out 0.15s ease-in forwards"
                    : "solarium 0.2s var(--ease-out-custom)",
                }}
              >
                {/* User info */}
                <div className="flex flex-col items-center py-4 mb-1">
                  <div className="mb-3">
                    <UserAvatar
                      avatarUrl={(session.user as any)?.avatar_url}
                      name={session.user.name}
                      size={64}
                    />
                  </div>
                  <p
                    className="text-sm font-[var(--font-weight-medium)]"
                    style={{ color: "hsl(var(--c1))" }}
                  >
                    @{session.user.name}
                  </p>
                  {(session.user as any)?.email && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "hsl(var(--c3))" }}
                    >
                      {(session.user as any).email}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div
                  className="h-px my-2"
                  style={{ background: "hsl(var(--b4) / 0.3)" }}
                />

                {/* Nav links */}
                {[
                  {
                    to: "/app",
                    label: "Home",
                    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
                  },
                  {
                    to: "/app/request-set",
                    label: "Request a Set",
                    icon: "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z",
                  },
                  {
                    to: "/app/profile",
                    label: "Profile",
                    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                  },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => closeMenu()}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all no-underline"
                    style={{ color: "hsl(var(--c2))" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "hsl(var(--c1))";
                      e.currentTarget.style.background = "hsl(var(--b4) / 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "hsl(var(--c2))";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <svg
                      className="w-4 h-4"
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
                  </Link>
                ))}

                {/* Changelog button */}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    openChangelog();
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all w-full"
                  style={{ color: "hsl(var(--c2))" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "hsl(var(--c1))";
                    e.currentTarget.style.background = "hsl(var(--b4) / 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "hsl(var(--c2))";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Changelog
                </button>

                {/* Divider */}
                <div
                  className="h-px my-2"
                  style={{ background: "hsl(var(--b4) / 0.3)" }}
                />

                <a
                  href="https://github.com/Tresillo2017/zephyron/issues/new?template=bug_report.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all no-underline"
                  style={{ color: "hsl(var(--c3))" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "hsl(var(--c2))";
                    e.currentTarget.style.background = "hsl(var(--b4) / 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "hsl(var(--c3))";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  Report Issue
                </a>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                  style={{ color: "hsl(var(--c3))" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ef4444";
                    e.currentTarget.style.background = "hsl(var(--b4) / 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "hsl(var(--c3))";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="text-sm text-text-muted hover:text-text-primary transition-colors no-underline"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
