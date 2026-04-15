import { Link, useNavigate, useLocation } from "react-router";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "../../lib/auth-client";
import { UserAvatar } from "../ui/UserAvatar";
import { Logo } from "../ui/Logo";
import { openChangelog } from "../WhatsNew";
import {
  searchSets,
  getCoverUrl,
  getEventCoverUrl,
  getSongCoverUrl,
} from "../../lib/api";
import type { SearchResults } from "../../lib/types";

export function TopNav() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuExiting, setMenuExiting] = useState(false);
  const menuExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showSearchPreview, setShowSearchPreview] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchPreview(false);
      }
    };
    if (showUserMenu || showSearchPreview) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu, showSearchPreview]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchPreview(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await searchSets(searchQuery.trim());
        setSearchResults(data);
        setShowSearchPreview(true);
      } catch {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Scroll-driven blur — listen to the actual scroll container, not window
  useEffect(() => {
    const container = document.getElementById("app-scroll-container");
    if (!container) return;
    const onScroll = () => setScrolled(container.scrollTop > 10);
    container.addEventListener("scroll", onScroll, { passive: true });
    setScrolled(container.scrollTop > 10);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

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
        <div className="relative" ref={searchRef}>
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
            onFocus={() => searchQuery && setShowSearchPreview(true)}
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

          {/* Search preview dropdown */}
          {showSearchPreview && searchQuery && (
            <div
              className="absolute top-full left-0 right-0 mt-2 max-h-[480px] overflow-y-auto rounded-[var(--card-radius)] p-2"
              style={{
                background: "hsl(var(--b5) / 0.97)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px hsl(var(--b4) / 0.3)",
              }}
            >
              {isSearching ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm" style={{ color: "hsl(var(--c3))" }}>
                    Searching...
                  </p>
                </div>
              ) : searchResults ? (
                <>
                  {/* Sets */}
                  {searchResults.sets.length > 0 && (
                    <div className="mb-3">
                      <p
                        className="text-xs font-mono tracking-wider uppercase px-3 py-2"
                        style={{ color: "hsl(var(--c3))" }}
                      >
                        Sets
                      </p>
                      <div className="space-y-1">
                        {searchResults.sets.slice(0, 5).map((set) => (
                          <Link
                            key={set.id}
                            to={`/app/sets/${set.id}`}
                            onClick={() => {
                              setShowSearchPreview(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline"
                            style={{ color: "hsl(var(--c2))" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "hsl(var(--b4) / 0.4)";
                              e.currentTarget.style.color = "hsl(var(--c1))";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "hsl(var(--c2))";
                            }}
                          >
                            {/* Set cover thumbnail */}
                            <div
                              className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                              style={{
                                background: "hsl(var(--b4) / 0.3)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                              }}
                            >
                              {set.cover_image_r2_key ? (
                                <img
                                  src={getCoverUrl(set.id)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, hsl(var(--h3) / 0.15), hsl(var(--b4) / 0.3))",
                                  }}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    style={{ color: "hsl(var(--c3) / 0.3)" }}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{set.title}</p>
                              <p
                                className="text-xs truncate"
                                style={{ color: "hsl(var(--c3))" }}
                              >
                                {set.artist}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {searchResults.events.length > 0 && (
                    <div className="mb-3">
                      <p
                        className="text-xs font-mono tracking-wider uppercase px-3 py-2"
                        style={{ color: "hsl(var(--c3))" }}
                      >
                        Events
                      </p>
                      <div className="space-y-1">
                        {searchResults.events.slice(0, 3).map((event) => (
                          <Link
                            key={event.id}
                            to={`/app/events/${event.slug || event.id}`}
                            onClick={() => {
                              setShowSearchPreview(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline"
                            style={{ color: "hsl(var(--c2))" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "hsl(var(--b4) / 0.4)";
                              e.currentTarget.style.color = "hsl(var(--c1))";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "hsl(var(--c2))";
                            }}
                          >
                            {/* Event cover thumbnail */}
                            <div
                              className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                              style={{
                                background: "hsl(var(--b4) / 0.3)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                              }}
                            >
                              {event.cover_image_r2_key ? (
                                <img
                                  src={getEventCoverUrl(event.id)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, hsl(var(--h3) / 0.15), hsl(var(--b4) / 0.3))",
                                  }}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    style={{ color: "hsl(var(--c3) / 0.3)" }}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{event.name}</p>
                              <p
                                className="text-xs"
                                style={{ color: "hsl(var(--c3))" }}
                              >
                                {event.set_count}{" "}
                                {event.set_count === 1 ? "set" : "sets"}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tracks */}
                  {searchResults.tracks.length > 0 && (
                    <div>
                      <p
                        className="text-xs font-mono tracking-wider uppercase px-3 py-2"
                        style={{ color: "hsl(var(--c3))" }}
                      >
                        Tracks
                      </p>
                      <div className="space-y-1">
                        {searchResults.tracks.slice(0, 5).map((track) => {
                          const coverUrl = track.song?.cover_art_r2_key
                            ? getSongCoverUrl(track.song.id)
                            : track.song?.cover_art_url ||
                              track.song?.lastfm_album_art ||
                              null;

                          return (
                            <Link
                              key={track.id}
                              to={`/app/sets/${track.set_id}`}
                              onClick={() => {
                                setShowSearchPreview(false);
                                setSearchQuery("");
                              }}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline"
                              style={{ color: "hsl(var(--c2))" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                  "hsl(var(--b4) / 0.4)";
                                e.currentTarget.style.color = "hsl(var(--c1))";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                                e.currentTarget.style.color = "hsl(var(--c2))";
                              }}
                            >
                              {/* Track cover thumbnail */}
                              <div
                                className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                                style={{
                                  background: "hsl(var(--b4) / 0.3)",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                }}
                              >
                                {coverUrl ? (
                                  <img
                                    src={coverUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, hsl(var(--h3) / 0.15), hsl(var(--b4) / 0.3))",
                                    }}
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      style={{ color: "hsl(var(--c3) / 0.3)" }}
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={1.5}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">
                                  {track.track_title}
                                </p>
                                <p
                                  className="text-xs truncate"
                                  style={{ color: "hsl(var(--c3))" }}
                                >
                                  {track.track_artist} · {track.set_artist}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No results */}
                  {searchResults.sets.length === 0 &&
                    searchResults.events.length === 0 &&
                    searchResults.tracks.length === 0 && (
                      <div className="px-3 py-8 text-center">
                        <p
                          className="text-sm"
                          style={{ color: "hsl(var(--c3))" }}
                        >
                          No results found for "{searchQuery}"
                        </p>
                      </div>
                    )}

                  {/* View all results link */}
                  {(searchResults.sets.length > 0 ||
                    searchResults.events.length > 0 ||
                    searchResults.tracks.length > 0) && (
                    <>
                      <div
                        className="h-px my-2"
                        style={{ background: "hsl(var(--b4) / 0.3)" }}
                      />
                      <Link
                        to={`/app/search?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => {
                          setShowSearchPreview(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all no-underline"
                        style={{ color: "hsl(var(--h3))" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "hsl(var(--b4) / 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span className="text-sm font-[var(--font-weight-medium)]">
                          View all results
                        </span>
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
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </Link>
                    </>
                  )}
                </>
              ) : null}
            </div>
          )}
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

        {/* User dropdown */}
        {session?.user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => showUserMenu ? closeMenu() : setShowUserMenu(true)}
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
