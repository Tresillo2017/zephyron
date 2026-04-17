import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  useSession,
  signOut,
  getSession,
  authClient,
} from "../lib/auth-client";
import {
  fetchHistory,
  fetchPlaylists,
  fetchMonthlyWrapped,
  fetchLikedSongs,
  getSongCoverUrl,
  createPlaylist as createPlaylistApi,
  updateProfileSettings,
  uploadBanner,
  deleteBanner,
} from "../lib/api";
import { getAvailableServices, ServiceIconLink } from "../lib/services";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import {
  formatRelativeTime,
  formatTime,
  formatDuration,
} from "../lib/formatTime";
import { ProfileHeader } from "../components/profile/ProfileHeader";
import { ProfilePictureUpload } from "../components/profile/ProfilePictureUpload";
import { BioEditor } from "../components/profile/BioEditor";
import { DisplayNameEditor } from "../components/profile/DisplayNameEditor";
import { ProfileStatsSection } from "../components/profile/ProfileStatsSection";
import { BadgesGrid } from "../components/profile/BadgesGrid";
import { ActivityFeed } from "../components/activity/ActivityFeed";
import {
  HistoryListSkeleton,
  PlaylistGridSkeleton,
  Skeleton,
} from "../components/ui/Skeleton";
import { LikeButton } from "../components/ui/LikeButton";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore, ACCENTS } from "../stores/themeStore";
import type { ExtendedUser } from "../lib/auth-types";
import type { ListenHistoryItem, Playlist, Song } from "../lib/types";
import { FiHeart, FiMusic, FiExternalLink } from "react-icons/fi";
import { sileo } from "sileo";
import QRCode from "react-qr-code";
import NumberFlow from "@number-flow/react";

type LikedSong = Song & {
  liked_at: string;
  like_count: number;
  set_id: string | null;
};

export function ProfilePage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") || "overview") as
    | "overview"
    | "activity"
    | "badges"
    | "playlists"
    | "liked-songs"
    | "history"
    | "privacy"
    | "appearance"
    | "security"
    | "account"
    | "about";

  const [recentCount, setRecentCount] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [showBannerUpload, setShowBannerUpload] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [currentMonthStats, setCurrentMonthStats] = useState<{
    total_hours: number;
  } | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(
    ["privacy", "appearance", "security", "account"].includes(activeTab)
  );

  // Listen history state
  const [history, setHistory] = useState<ListenHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const play = usePlayerStore((s) => s.play);
  const seek = usePlayerStore((s) => s.seek);

  // Playlists state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState<string | null>(null);
  const [editBio, setEditBio] = useState<string | null>(null);

  // Liked songs state
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [likedSongsTotal, setLikedSongsTotal] = useState(0);
  const [likedSongsPage, setLikedSongsPage] = useState(1);
  const [likedSongsLoading, setLikedSongsLoading] = useState(false);

  useEffect(() => {
    fetchHistory()
      .then((r) => setRecentCount(r.data?.length || 0))
      .catch(() => {});
    fetchPlaylists()
      .then((r) => setPlaylistCount(r.data?.length || 0))
      .catch(() => {});

    // Fetch current month stats
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    fetchMonthlyWrapped(currentYear, currentMonth)
      .then((data) => setCurrentMonthStats({ total_hours: data.total_hours }))
      .catch(() => {});
  }, []);

  // Load history when tab is active
  useEffect(() => {
    if (activeTab === "history" && session?.user) {
      setHistoryLoading(true);
      fetchHistory()
        .then((res) => setHistory(res.data))
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab, session]);

  // Load playlists when tab is active
  useEffect(() => {
    if (activeTab === "playlists" && session?.user) {
      setPlaylistsLoading(true);
      fetchPlaylists()
        .then((res) => setPlaylists(res.data))
        .catch(() => {})
        .finally(() => setPlaylistsLoading(false));
    }
  }, [activeTab, session]);

  // Load liked songs count for overview tab
  useEffect(() => {
    if (activeTab === "overview" && session?.user && likedSongsTotal === 0) {
      fetchLikedSongs(1)
        .then((res) => {
          setLikedSongsTotal(res.total);
        })
        .catch(() => {});
    }
  }, [activeTab, session, likedSongsTotal]);

  // Load liked songs when tab is active
  useEffect(() => {
    if (activeTab === "liked-songs" && session?.user) {
      setLikedSongsLoading(true);
      fetchLikedSongs(likedSongsPage)
        .then((res) => {
          setLikedSongs(res.data as LikedSong[]);
          setLikedSongsTotal(res.total);
        })
        .catch(() => {})
        .finally(() => setLikedSongsLoading(false));
    }
  }, [activeTab, session, likedSongsPage]);

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm" style={{ color: "hsl(var(--c3))" }}>
            Not signed in.
          </p>
          <Link
            to="/login"
            className="text-sm mt-2 inline-block no-underline hover:underline"
            style={{ color: "hsl(var(--h3))" }}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const user = session.user as any;

  // Initialize avatarUrl + bannerUrl from user data
  useEffect(() => {
    if (user?.avatar_url) setAvatarUrl(user.avatar_url);
  }, [user?.avatar_url]);

  useEffect(() => {
    if (user?.banner_url) setBannerUrl(user.banner_url);
  }, [user?.banner_url]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleResume = (item: ListenHistoryItem) => {
    if (item.title && item.duration_seconds) {
      play({
        id: item.set_id,
        title: item.title,
        artist: item.artist || "Unknown",
        duration_seconds: item.duration_seconds,
        genre: item.genre || null,
        r2_key: `sets/${item.set_id}/audio.mp3`,
      } as any);
      if (item.last_position_seconds > 0) {
        setTimeout(() => seek(item.last_position_seconds), 200);
      }
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await createPlaylistApi(
        newTitle.trim(),
        newDescription.trim() || undefined
      );
      setNewTitle("");
      setNewDescription("");
      setShowCreate(false);

      // Reload playlists
      setPlaylistsLoading(true);
      fetchPlaylists()
        .then((res) => {
          setPlaylists(res.data);
          setPlaylistCount(res.data.length);
        })
        .catch(() => {})
        .finally(() => setPlaylistsLoading(false));
    } catch {
      // silent
    } finally {
      setIsCreating(false);
    }
  };

  const likedSongsPageSize = 50;
  const likedSongsTotalPages = Math.ceil(likedSongsTotal / likedSongsPageSize);

  const setActiveTab = (tab: typeof activeTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params);
    // Expand settings dropdown if navigating to a settings tab
    if (["privacy", "appearance", "security", "account"].includes(tab)) {
      setSettingsExpanded(true);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar navigation */}
      <aside
        className="w-[200px] shrink-0 px-4 py-6 self-start flex flex-col overflow-y-auto"
        style={{
          position: 'sticky',
          top: 'calc(20px + var(--button-height))',
          height: 'calc(100vh - 20px - var(--button-height))',
          borderRight: "1px solid hsl(var(--b4) / 0.25)",
          background: "hsl(var(--b6))",
        }}
      >
        <nav className="space-y-1 flex-1">
          {/* Main navigation tabs */}
          {[
            {
              id: "overview",
              label: "Overview",
              icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
            },
            {
              id: "activity",
              label: "Activity",
              icon: "M13 10V3L4 14h7v7l9-11h-7z",
            },
            {
              id: "badges",
              label: "Badges",
              icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
            },
            {
              id: "playlists",
              label: "Playlists",
              icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
            },
            {
              id: "liked-songs",
              label: "Liked Songs",
              icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
            },
            {
              id: "history",
              label: "History",
              icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
            },
            {
              id: "about",
              label: "About",
              icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id ? "font-[var(--font-weight-medium)]" : ""
              }`}
              style={{
                color:
                  activeTab === tab.id ? "hsl(var(--c1))" : "hsl(var(--c2))",
                background:
                  activeTab === tab.id ? "hsl(var(--b4) / 0.5)" : "transparent",
              }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={tab.icon}
                />
              </svg>
              {tab.label}
            </button>
          ))}

          {/* Settings dropdown */}
          <div>
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                ["privacy", "appearance", "security", "account"].includes(
                  activeTab
                )
                  ? "font-[var(--font-weight-medium)]"
                  : ""
              }`}
              style={{
                color: [
                  "privacy",
                  "appearance",
                  "security",
                  "account",
                ].includes(activeTab)
                  ? "hsl(var(--c1))"
                  : "hsl(var(--c2))",
                background: [
                  "privacy",
                  "appearance",
                  "security",
                  "account",
                ].includes(activeTab)
                  ? "hsl(var(--b4) / 0.5)"
                  : "transparent",
              }}
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                </svg>
                Settings
              </div>
              <svg
                className="w-3.5 h-3.5 shrink-0 transition-transform"
                style={{
                  transform: settingsExpanded
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
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

            {/* Settings submenu */}
            <div
              className="overflow-hidden"
              style={{
                maxHeight: settingsExpanded ? '300px' : '0px',
                opacity: settingsExpanded ? 1 : 0,
                transition: 'max-height 0.2s var(--ease-spring), opacity 0.15s ease',
              }}
            >
              <div className="mt-1 ml-4 space-y-1">
                {[
                  {
                    id: "privacy",
                    label: "Privacy",
                    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
                  },
                  {
                    id: "appearance",
                    label: "Appearance",
                    icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
                  },
                  {
                    id: "security",
                    label: "Security",
                    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
                  },
                  {
                    id: "account",
                    label: "Account",
                    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                  },
                ].map((subTab) => (
                  <button
                    key={subTab.id}
                    onClick={() => setActiveTab(subTab.id as typeof activeTab)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === subTab.id
                        ? "font-[var(--font-weight-medium)]"
                        : ""
                    }`}
                    style={{
                      color:
                        activeTab === subTab.id
                          ? "hsl(var(--c1))"
                          : "hsl(var(--c2))",
                      background:
                        activeTab === subTab.id
                          ? "hsl(var(--b4) / 0.5)"
                          : "transparent",
                    }}
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={subTab.icon}
                      />
                    </svg>
                    {subTab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-6 lg:px-10 py-6">
        <div key={activeTab} className="max-w-5xl mx-auto space-y-5" style={{ animation: 'tab-enter 0.18s var(--ease-spring) both' }}>
          {/* Quick Stats Section */}
          {currentMonthStats && (
            <div className="card">
              <h3
                className="text-sm font-[var(--font-weight-medium)] mb-4"
                style={{ color: "hsl(var(--c1))" }}
              >
                This Month
              </h3>
              <div className="flex items-end gap-2">
                <div
                  className="text-4xl font-[var(--font-weight-bold)]"
                  style={{ color: "hsl(var(--h3))" }}
                >
                  <NumberFlow
                    value={Math.round(currentMonthStats.total_hours * 10) / 10}
                    format={{ maximumFractionDigits: 1 }}
                  />
                </div>
                <p className="text-sm mb-1" style={{ color: "hsl(var(--c2))" }}>
                  hours listened
                </p>
              </div>
            </div>
          )}

          {/* Wrapped CTA Section */}
          {(() => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            const showWrapped = currentMonth === 12;

            return showWrapped ? (
              <div className="card">
                <h3
                  className="text-sm font-[var(--font-weight-medium)] mb-2"
                  style={{ color: "hsl(var(--c1))" }}
                >
                  Your {currentYear} Wrapped
                </h3>
                <p className="text-sm mb-4" style={{ color: "hsl(var(--c2))" }}>
                  See your year in electronic music
                </p>
                <Link
                  to={`/app/wrapped/${currentYear}`}
                  className="no-underline"
                >
                  <Button variant="primary" className="w-full justify-center">
                    View Wrapped
                  </Button>
                </Link>
              </div>
            ) : null;
          })()}

          {/* Profile Header */}
          <ProfileHeader
            user={{
              ...user,
              avatar_url: avatarUrl,
              banner_url: bannerUrl,
            }}
            isOwnProfile={true}
            onEditClick={() => {
              setEditDisplayName(user.name || "");
              setEditBio((user as any).bio || "");
              setShowEditModal(true);
            }}
            onAvatarClick={() => setShowAvatarUpload(true)}
            onBannerClick={() => setShowBannerUpload(true)}
          />

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { value: playlistCount, label: "Playlists" },
                  { value: likedSongsTotal, label: "Liked Songs" },
                  { value: recentCount, label: "Sets Listened" },
                ].map((stat) => (
                  <div key={stat.label} className="card !p-4">
                    <div
                      className="text-2xl font-[var(--font-weight-bold)]"
                      style={{ color: "hsl(var(--c1))" }}
                    >
                      <NumberFlow value={stat.value} />
                    </div>
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: "hsl(var(--c3))" }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Listening Statistics */}
              <ProfileStatsSection userId={user.id} />

              {/* Recent Activity */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="text-sm font-[var(--font-weight-medium)]"
                    style={{ color: "hsl(var(--c1))" }}
                  >
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className="text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    View all →
                  </button>
                </div>
                <ActivityFeed feed="me" limit={3} />
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <ActivityFeed feed="user" userId={user.id} limit={5} />
          )}

          {activeTab === "badges" && <BadgesGrid userId={user.id} />}

          {activeTab === "playlists" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-2xl font-[var(--font-weight-bold)]"
                  style={{ color: "hsl(var(--c1))" }}
                >
                  Your Playlists
                </h2>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreate(true)}
                >
                  New Playlist
                </Button>
              </div>

              {/* New Playlist modal */}
              <Modal
                isOpen={showCreate}
                onClose={() => { setShowCreate(false); setNewTitle(""); setNewDescription(""); }}
                title="New Playlist"
              >
                <div className="space-y-4">
                  <Input
                    label="Playlist name"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="My DJ Set Collection"
                    onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
                    autoFocus
                  />
                  <Input
                    label="Description (optional)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="A collection of my favorite sets..."
                  />
                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowCreate(false); setNewTitle(""); setNewDescription(""); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCreatePlaylist}
                      disabled={!newTitle.trim() || isCreating}
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
              </Modal>

              {playlistsLoading ? (
                <PlaylistGridSkeleton count={3} />
              ) : playlists.length === 0 ? (
                <div className="card text-center py-16">
                  <svg
                    className="w-16 h-16 mx-auto mb-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: "hsl(var(--c3) / 0.3)" }}
                  >
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                  </svg>
                  <p
                    className="text-sm"
                    style={{ color: "hsl(var(--c3))" }}
                  >
                    No playlists yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {playlists.map((pl) => (
                    <Link
                      key={pl.id}
                      to={`/playlists/${pl.id}`}
                      className="flex items-center gap-4 card !p-4 hover:bg-[hsl(var(--b4)/0.3)] transition-colors no-underline"
                    >
                      <div
                        className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: "hsl(var(--b4) / 0.4)" }}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: "hsl(var(--c3))" }}
                        >
                          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-[var(--font-weight-medium)] truncate"
                          style={{ color: "hsl(var(--c1))" }}
                        >
                          {pl.title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "hsl(var(--c3))" }}
                        >
                          {pl.item_count ?? 0}{" "}
                          {(pl.item_count ?? 0) === 1 ? "set" : "sets"}
                          {" · "}
                          {formatRelativeTime(pl.updated_at)}
                        </p>
                      </div>
                      <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        style={{ color: "hsl(var(--c3))" }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "liked-songs" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--h3) / 0.15)" }}
                >
                  <FiHeart size={22} style={{ color: "hsl(var(--h3))" }} />
                </div>
                <div>
                  <h2
                    className="text-2xl font-[var(--font-weight-bold)]"
                    style={{ color: "hsl(var(--c1))" }}
                  >
                    Liked Songs
                  </h2>
                  <p className="text-sm" style={{ color: "hsl(var(--c3))" }}>
                    {likedSongsTotal} track{likedSongsTotal !== 1 ? "s" : ""}{" "}
                    you've liked
                  </p>
                </div>
              </div>

              {likedSongsLoading && likedSongs.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : likedSongs.length === 0 ? (
                <div className="card text-center py-16">
                  <div className="flex justify-center mb-4">
                    <FiMusic
                      size={48}
                      style={{ color: "hsl(var(--c3) / 0.3)" }}
                    />
                  </div>
                  <h3
                    className="text-lg mb-2 font-[var(--font-weight-medium)]"
                    style={{ color: "hsl(var(--c1))" }}
                  >
                    No liked songs yet
                  </h3>
                  <p
                    className="text-sm mb-6"
                    style={{ color: "hsl(var(--c3))" }}
                  >
                    Like tracks by clicking the heart icon next to any track in
                    a set
                  </p>
                  <Link
                    to="/"
                    className="button-primary inline-flex items-center gap-2"
                  >
                    Browse Sets
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {likedSongs.map((song) => {
                      const coverUrl = song.cover_art_r2_key
                        ? getSongCoverUrl(song.id)
                        : song.cover_art_url || song.lastfm_album_art;
                      const serviceLinks = getAvailableServices(
                        song as unknown as Record<string, unknown>
                      );

                      return (
                        <div
                          key={song.id}
                          className="card !p-3 group hover:bg-[hsl(var(--b4)/0.3)] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt=""
                                className="w-12 h-12 rounded-lg object-cover shrink-0"
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center"
                                style={{ background: "hsl(var(--b4) / 0.4)" }}
                              >
                                <FiMusic
                                  size={20}
                                  style={{ color: "hsl(var(--c3) / 0.3)" }}
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm truncate font-[var(--font-weight-medium)]"
                                style={{ color: "hsl(var(--c1))" }}
                              >
                                {song.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="text-xs truncate"
                                  style={{ color: "hsl(var(--c2))" }}
                                >
                                  {song.artist}
                                </span>
                                {song.label && (
                                  <>
                                    <span
                                      className="text-[10px]"
                                      style={{ color: "hsl(var(--c3) / 0.4)" }}
                                    >
                                      ·
                                    </span>
                                    <span
                                      className="text-[10px] truncate"
                                      style={{ color: "hsl(var(--c3))" }}
                                    >
                                      {song.label}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <LikeButton
                                songId={song.id}
                                size={16}
                                showCount
                                initialCount={song.like_count}
                              />

                              {serviceLinks.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  {serviceLinks
                                    .slice(0, 5)
                                    .map(({ url, service }) => (
                                      <ServiceIconLink
                                        key={service.key}
                                        url={url}
                                        service={service}
                                        size={16}
                                      />
                                    ))}
                                </div>
                              )}

                              {song.set_id && (
                                <Link
                                  to={`/sets/${song.set_id}`}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Go to set"
                                >
                                  <FiExternalLink
                                    size={16}
                                    style={{ color: "hsl(var(--c3))" }}
                                  />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {likedSongsTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() =>
                          setLikedSongsPage((p) => Math.max(1, p - 1))
                        }
                        disabled={likedSongsPage === 1}
                        className="button-secondary"
                        style={{ opacity: likedSongsPage === 1 ? 0.5 : 1 }}
                      >
                        Previous
                      </button>
                      <span
                        className="text-sm px-4"
                        style={{ color: "hsl(var(--c3))" }}
                      >
                        Page {likedSongsPage} of {likedSongsTotalPages}
                      </span>
                      <button
                        onClick={() =>
                          setLikedSongsPage((p) =>
                            Math.min(likedSongsTotalPages, p + 1)
                          )
                        }
                        disabled={likedSongsPage === likedSongsTotalPages}
                        className="button-secondary"
                        style={{
                          opacity:
                            likedSongsPage === likedSongsTotalPages ? 0.5 : 1,
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div>
              <h2
                className="text-2xl font-[var(--font-weight-bold)] mb-6"
                style={{ color: "hsl(var(--c1))" }}
              >
                Listening History
              </h2>

              {historyLoading ? (
                <HistoryListSkeleton count={5} />
              ) : history.length === 0 ? (
                <div className="card text-center py-16">
                  <svg
                    className="w-16 h-16 mx-auto mb-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: "hsl(var(--c3) / 0.3)" }}
                  >
                    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                  </svg>
                  <p
                    className="text-sm mb-4"
                    style={{ color: "hsl(var(--c3))" }}
                  >
                    No listening history yet.
                  </p>
                  <Link
                    to="/app/browse"
                    className="text-sm no-underline hover:underline"
                    style={{ color: "hsl(var(--h3))" }}
                  >
                    Start listening
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => {
                    const progressPct = item.duration_seconds
                      ? Math.min(
                          100,
                          (item.last_position_seconds / item.duration_seconds) *
                            100
                        )
                      : 0;

                    return (
                      <div
                        key={item.id}
                        className="card !p-3 group hover:bg-[hsl(var(--b4)/0.3)] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleResume(item)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0"
                            style={{
                              background: "hsl(var(--h3) / 0.15)",
                              color: "hsl(var(--h3))",
                            }}
                            title={`Resume at ${formatTime(
                              item.last_position_seconds
                            )}`}
                          >
                            <svg
                              className="w-4 h-4 ml-0.5"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>

                          <Link
                            to={`/app/sets/${item.set_id}`}
                            className="flex-1 min-w-0 no-underline"
                          >
                            <p
                              className="text-sm truncate hover:underline font-[var(--font-weight-medium)]"
                              style={{ color: "hsl(var(--c1))" }}
                            >
                              {item.title || "Untitled"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p
                                className="text-xs truncate"
                                style={{ color: "hsl(var(--c2))" }}
                              >
                                {item.artist || "Unknown"}
                              </p>
                              {item.genre && (
                                <Badge variant="muted">{item.genre}</Badge>
                              )}
                            </div>
                            {item.duration_seconds &&
                              item.last_position_seconds > 0 && (
                                <div className="mt-1.5 flex items-center gap-2">
                                  <div
                                    className="flex-1 h-1 rounded-full overflow-hidden"
                                    style={{ background: "hsl(var(--b4))" }}
                                  >
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${progressPct}%`,
                                        background: "hsl(var(--h3))",
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="text-[10px]"
                                    style={{ color: "hsl(var(--c3))" }}
                                  >
                                    {formatTime(item.last_position_seconds)} /{" "}
                                    {formatDuration(item.duration_seconds)}
                                  </span>
                                </div>
                              )}
                          </Link>

                          <div className="flex flex-col items-end flex-shrink-0">
                            <span
                              className="text-xs"
                              style={{ color: "hsl(var(--c3))" }}
                            >
                              {formatRelativeTime(item.last_listened_at)}
                            </span>
                            {item.listen_count > 1 && (
                              <span
                                className="text-[10px] mt-0.5"
                                style={{ color: "hsl(var(--c3))" }}
                              >
                                {item.listen_count}x played
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "privacy" && <PrivacyTab />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "account" && <AccountTab />}

          {activeTab === "about" && (
            <div className="space-y-4">
              {/* Account Information */}
              <div className="card">
                <h3
                  className="text-sm font-[var(--font-weight-medium)] mb-4"
                  style={{ color: "hsl(var(--c1))" }}
                >
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span
                      className="text-sm"
                      style={{ color: "hsl(var(--c3))" }}
                    >
                      Username
                    </span>
                    <span
                      className="text-sm font-[var(--font-weight-medium)]"
                      style={{ color: "hsl(var(--c1))" }}
                    >
                      {user.name}
                    </span>
                  </div>
                  {user.email && (
                    <div className="flex justify-between items-center">
                      <span
                        className="text-sm"
                        style={{ color: "hsl(var(--c3))" }}
                      >
                        Email
                      </span>
                      <span
                        className="text-sm font-mono"
                        style={{ color: "hsl(var(--c2))" }}
                      >
                        {user.email}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span
                      className="text-sm"
                      style={{ color: "hsl(var(--c3))" }}
                    >
                      Role
                    </span>
                    <Badge variant="accent">{user.role || "user"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span
                      className="text-sm"
                      style={{ color: "hsl(var(--c3))" }}
                    >
                      Member since
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "hsl(var(--c2))" }}
                    >
                      {user.createdAt
                        ? formatRelativeTime(user.createdAt)
                        : "Unknown"}
                    </span>
                  </div>
                  {user.id && (
                    <div className="flex justify-between items-center">
                      <span
                        className="text-sm"
                        style={{ color: "hsl(var(--c3))" }}
                      >
                        User ID
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(user.id)}
                        className="text-[11px] font-mono px-2 py-1 rounded transition-colors"
                        style={{
                          color: "hsl(var(--c3))",
                          background: "hsl(var(--b4) / 0.3)",
                        }}
                        title="Click to copy"
                      >
                        {user.id.slice(0, 8)}...
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Summary */}
              <div className="card">
                <h3
                  className="text-sm font-[var(--font-weight-medium)] mb-4"
                  style={{ color: "hsl(var(--c1))" }}
                >
                  Activity Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p
                      className="text-2xl font-[var(--font-weight-bold)]"
                      style={{ color: "hsl(var(--c1))" }}
                    >
                      {playlistCount}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "hsl(var(--c3))" }}
                    >
                      Playlists
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-2xl font-[var(--font-weight-bold)]"
                      style={{ color: "hsl(var(--c1))" }}
                    >
                      {likedSongsTotal}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "hsl(var(--c3))" }}
                    >
                      Liked Songs
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-2xl font-[var(--font-weight-bold)]"
                      style={{ color: "hsl(var(--c1))" }}
                    >
                      {recentCount}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "hsl(var(--c3))" }}
                    >
                      Sets Played
                    </p>
                  </div>
                </div>
                {currentMonthStats && (
                  <div
                    className="mt-4 pt-4"
                    style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}
                  >
                    <div className="flex items-end gap-2">
                      <p
                        className="text-3xl font-[var(--font-weight-bold)]"
                        style={{ color: "hsl(var(--h3))" }}
                      >
                        {Math.round(currentMonthStats.total_hours * 10) / 10}
                      </p>
                      <p
                        className="text-sm mb-1"
                        style={{ color: "hsl(var(--c2))" }}
                      >
                        hours listened this month
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sign Out */}
              <div className="card">
                <Button
                  variant="danger"
                  onClick={handleSignOut}
                  className="w-full justify-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <ProfilePictureUpload
          currentAvatarUrl={avatarUrl}
          onUploadSuccess={async (url) => {
            const updatedSession = await getSession();
            const user = updatedSession?.data?.user as ExtendedUser | undefined;
            if (user?.avatar_url) {
              setAvatarUrl(user.avatar_url);
            } else {
              setAvatarUrl(url);
            }
          }}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}

      {/* Banner Upload Modal */}
      {showBannerUpload && (
        <ProfilePictureUpload
          currentAvatarUrl={bannerUrl}
          uploadFn={uploadBanner}
          title="Upload Cover Photo"
          onUploadSuccess={(url) => {
            setBannerUrl(url);
          }}
          onClose={() => setShowBannerUpload(false)}
        />
      )}

      {/* Edit Profile modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        size="lg"
      >
        <div>
          {/* Banner + avatar preview */}
          <div className="relative -mx-5 -mt-5 mb-5">
            {/* Banner */}
            <div
              className="relative h-28 overflow-hidden cursor-pointer group"
              onClick={() => { setShowEditModal(false); setShowBannerUpload(true); }}
            >
              {bannerUrl ? (
                <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center" />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--h3) / 0.1), hsl(var(--b4)))' }}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.35)' }}
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-[var(--font-weight-medium)]"
                  style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(8px)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {bannerUrl ? 'Change cover' : 'Add cover'}
                </div>
              </div>
            </div>

            {/* Avatar overlapping banner */}
            <div className="absolute left-5 bottom-0 translate-y-1/2">
              <div
                className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer group/av"
                style={{ boxShadow: '0 0 0 3px hsl(var(--b5)), var(--subtle-shadow)' }}
                onClick={() => { setShowEditModal(false); setShowAvatarUpload(true); }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xl font-[var(--font-weight-bold)]"
                    style={{ background: 'hsl(var(--h3) / 0.15)', color: 'hsl(var(--h3))' }}
                  >
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Remove cover button */}
            {bannerUrl && (
              <button
                className="absolute right-3 bottom-2 text-[10px] px-2 py-1 rounded transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
                onClick={async () => {
                  await deleteBanner();
                  setBannerUrl(null);
                }}
              >
                Remove
              </button>
            )}
          </div>

          {/* Spacer for overlapping avatar */}
          <div className="h-10" />

          {/* Display name */}
          <div className="space-y-4">
            <DisplayNameEditor
              initialName={editDisplayName ?? user.name ?? ''}
              onUpdate={(name) => setEditDisplayName(name)}
            />

            <div style={{ borderTop: '1px solid hsl(var(--b4) / 0.25)', paddingTop: 16 }}>
              <BioEditor
                initialBio={editBio ?? (user as any).bio ?? ''}
                onUpdate={(bio) => setEditBio(bio)}
              />
            </div>

            <div className="flex justify-end pt-2" style={{ borderTop: '1px solid hsl(var(--b4) / 0.25)' }}>
              <Button variant="primary" size="sm" onClick={() => setShowEditModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─────────────────────────── Shared primitives ─────────────────────────── */

/** Consistent section card: title + optional description + content */
function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-4">
      <div>
        <h3 className="text-sm font-[var(--font-weight-medium)]" style={{ color: "hsl(var(--c1))" }}>
          {title}
        </h3>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "hsl(var(--c3))" }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** Row with label+description on the left, control on the right */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3" style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}>
      <div className="min-w-0">
        <p className="text-sm font-[var(--font-weight-medium)]" style={{ color: "hsl(var(--c1))" }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: "hsl(var(--c3))" }}>{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** 42×24px pill switch — white knob, accent fill when on, spring animation */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const [pressing, setPressing] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      onMouseLeave={() => setPressing(false)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        padding: 0,
        border: 'none',
        flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'hsl(var(--h3))' : 'hsl(var(--b3))',
        boxShadow: checked ? '0 0 0 1px hsl(var(--h3) / 0.4)' : 'inset 0 0 0 1px hsl(var(--b4) / 0.5)',
        transform: pressing ? 'scale(0.93)' : 'scale(1)',
        transition: 'background 0.2s var(--ease-out-custom), box-shadow 0.2s var(--ease-out-custom), transform 0.1s var(--ease-out-custom)',
        position: 'relative',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: pressing
            ? '0 1px 3px rgba(0,0,0,0.2)'
            : '0 1px 4px rgba(0,0,0,0.35)',
          transition: 'left 0.25s var(--ease-spring), box-shadow 0.15s var(--ease-out-custom)',
        }}
      />
    </button>
  );
}

/* ─────────────────────────── Privacy ─────────────────────────── */

function PrivacyTab() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [isProfilePublic, setIsProfilePublic] = useState(user?.is_profile_public ?? false);
  const [showActivity, setShowActivity] = useState(user?.show_activity ?? true);
  const [showLikedSongs, setShowLikedSongs] = useState(user?.show_liked_songs ?? true);
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (field: string, value: boolean, revert: () => void) => {
    setSaving(field);
    try {
      await updateProfileSettings({ [field]: value } as any);
    } catch {
      sileo.error({ title: "Failed to save", duration: 5000 });
      revert();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <SettingSection title="Visibility" description="Control who can see your profile and content.">
        <SettingRow label="Public profile" description="Other users can view your profile, stats, and history">
          <Toggle
            checked={isProfilePublic}
            onChange={(v) => { setIsProfilePublic(v); save("is_profile_public", v, () => setIsProfilePublic(!v)); }}
            disabled={saving !== null}
          />
        </SettingRow>
        <SettingRow label="Show listening activity" description="Display what you're listening to on your profile">
          <Toggle
            checked={showActivity}
            onChange={(v) => { setShowActivity(v); save("show_activity", v, () => setShowActivity(!v)); }}
            disabled={saving !== null}
          />
        </SettingRow>
        <SettingRow label="Show liked songs" description="Others can see your liked songs list">
          <Toggle
            checked={showLikedSongs}
            onChange={(v) => { setShowLikedSongs(v); save("show_liked_songs", v, () => setShowLikedSongs(!v)); }}
            disabled={saving !== null}
          />
        </SettingRow>
      </SettingSection>
    </div>
  );
}

function AppearanceTab() {
  const { theme, accent, customHue, setTheme, setAccent, setCustomHue } = useThemeStore();
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("reduceMotion") === "true");

  const handleReduceMotion = (v: boolean) => {
    setReduceMotion(v);
    localStorage.setItem("reduceMotion", String(v));
    document.documentElement.classList.toggle("reduce-motion", v);
  };

  const themeCards = [
    { id: "dark",   label: "Dark",   bg: "hsl(255,4%,14%)", text: "hsl(255,30%,87%)" },
    { id: "darker", label: "Darker", bg: "hsl(255,3%,6%)",  text: "hsl(255,30%,87%)" },
    { id: "oled",   label: "OLED",   bg: "#000",            text: "hsl(255,30%,87%)" },
    { id: "light",  label: "Light",  bg: "hsl(255,5%,94%)", text: "hsl(255,4%,6%)"  },
  ];

  return (
    <div className="space-y-4">
      <SettingSection title="Theme" description="Choose how Zephyron looks.">
        <div className="flex gap-3 flex-wrap pt-1">
          {themeCards.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div
                className={`w-[52px] h-[40px] rounded-lg flex items-center justify-center text-sm font-[var(--font-weight-bold)] transition-all ${
                  theme === t.id ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : "group-hover:scale-105"
                }`}
                style={{ background: t.bg, color: t.text, boxShadow: "var(--card-border)" }}
              >
                Aa
              </div>
              <span className="text-[11px]" style={{ color: theme === t.id ? "hsl(var(--c1))" : "hsl(var(--c3))" }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        <SettingRow label="Reduce animations" description="Minimise motion across the interface">
          <Toggle checked={reduceMotion} onChange={handleReduceMotion} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Accent colour" description="Pick an accent colour or set a custom hue.">
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccent(a.id as any)}
              className={`w-[28px] h-[28px] rounded-full cursor-pointer transition-all ${
                accent === a.id && customHue === null ? "ring-2 ring-white scale-110" : "hover:scale-110"
              }`}
              style={{ background: `hsl(${a.hue}, 60%, 55%)` }}
              title={a.label}
            />
          ))}
        </div>

        <div className="py-3" style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-[var(--font-weight-medium)]" style={{ color: "hsl(var(--c1))" }}>Custom hue</p>
            <span className="text-xs font-mono" style={{ color: "hsl(var(--c3))" }}>{customHue ?? 255}</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={customHue ?? 255}
            onChange={(e) => setCustomHue(parseInt(e.target.value))}
            className="w-full h-[6px] rounded-full appearance-none cursor-pointer block"
            style={{ background: "linear-gradient(to right, hsl(0,70%,55%), hsl(60,70%,55%), hsl(120,70%,55%), hsl(180,70%,55%), hsl(240,70%,55%), hsl(300,70%,55%), hsl(360,70%,55%))" }}
          />
          <p className="text-xs mt-1.5" style={{ color: "hsl(var(--c3))" }}>Fine-tune the exact hue value (0–360)</p>
        </div>
      </SettingSection>
    </div>
  );
}

/* ── Shared feedback banner ── */
function FeedbackBanner({ type, text }: { type: "success" | "error"; text: string }) {
  const isSuccess = type === "success";
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs"
      style={{
        background: isSuccess ? "hsl(var(--h3) / 0.08)" : "hsl(0 60% 55% / 0.08)",
        border: `1px solid ${isSuccess ? "hsl(var(--h3) / 0.25)" : "hsl(0 60% 55% / 0.25)"}`,
        color: isSuccess ? "hsl(var(--h3))" : "hsl(0 60% 60%)",
      }}
    >
      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        {isSuccess
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        }
      </svg>
      {text}
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-4">
      <ChangePasswordSection />
      <TwoFactorSection />
      <ApiKeysSection />
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) { setMessage({ type: "error", text: "Password must be at least 8 characters" }); return; }
    if (newPassword !== confirmPassword) { setMessage({ type: "error", text: "Passwords do not match" }); return; }
    setSaving(true);
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) {
        setMessage({ type: "error", text: error.message || "Failed to change password" });
      } else {
        setMessage({ type: "success", text: "Password changed successfully" });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingSection title="Change password" description="Use a strong password of at least 8 characters.">
      <form onSubmit={handleChangePassword} className="space-y-3">
        <Input type="password" label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" autoComplete="current-password" />
        <Input type="password" label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
        <Input type="password" label="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
        {message && <FeedbackBanner type={message.type} text={message.text} />}
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" size="sm" disabled={saving || !currentPassword || !newPassword || !confirmPassword}>
            {saving ? "Saving…" : "Update password"}
          </Button>
        </div>
      </form>
    </SettingSection>
  );
}

function TwoFactorSection() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const is2FAEnabled = user?.twoFactorEnabled;

  const [step, setStep] = useState<"idle" | "enabling" | "qr" | "verify" | "backup" | "disabling">("idle");
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const { data, error: err } = await authClient.twoFactor.enable({ password });
      if (err) { setError(err.message || "Failed to enable 2FA"); return; }
      if (data) { setTotpURI(data.totpURI); setBackupCodes(data.backupCodes); setStep("qr"); }
    } catch { setError("Something went wrong"); } finally { setLoading(false); }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const { error: err } = await authClient.twoFactor.verifyTotp({ code: verifyCode });
      if (err) { setError(err.message || "Invalid code"); return; }
      setStep("backup");
    } catch { setError("Something went wrong"); } finally { setLoading(false); }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const { error: err } = await authClient.twoFactor.disable({ password });
      if (err) { setError(err.message || "Failed to disable 2FA"); return; }
      setStep("idle"); setPassword("");
    } catch { setError("Something went wrong"); } finally { setLoading(false); }
  };

  const resetFlow = () => { setStep("idle"); setPassword(""); setTotpURI(""); setBackupCodes([]); setVerifyCode(""); setError(""); };

  return (
    <SettingSection title="Two-factor authentication" description="Require a verification code from your authenticator app on every sign-in.">
      {/* Status row */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: is2FAEnabled ? "hsl(var(--h3))" : "hsl(var(--c3))" }} />
          <span className="text-sm" style={{ color: "hsl(var(--c2))" }}>
            {is2FAEnabled ? "Enabled" : "Not enabled"}
          </span>
        </div>
        {step === "idle" && (
          is2FAEnabled
            ? <Button variant="ghost" size="sm" onClick={() => setStep("disabling")} style={{ color: "hsl(0 60% 55%)" }}>Disable</Button>
            : <Button variant="primary" size="sm" onClick={() => setStep("enabling")}>Enable</Button>
        )}
      </div>

      {/* Step: confirm password to enable */}
      {step === "enabling" && (
        <form onSubmit={handleEnable2FA} className="space-y-3 pt-2" style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}>
          <p className="text-xs" style={{ color: "hsl(var(--c3))" }}>Confirm your password to continue.</p>
          <Input type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" />
          {error && <FeedbackBanner type="error" text={error} />}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={loading || !password}>{loading ? "Verifying…" : "Continue"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Step: QR + verify */}
      {step === "qr" && (
        <div className="space-y-4 pt-2" style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}>
          <p className="text-xs" style={{ color: "hsl(var(--c3))" }}>
            Scan with Google Authenticator, Authy, 1Password, or any TOTP app.
          </p>
          <div className="flex justify-center">
            <div className="p-3 rounded-xl" style={{ background: "#fff", boxShadow: "var(--card-border)" }}>
              <QRCode value={totpURI} size={168} />
            </div>
          </div>
          <form onSubmit={handleVerifyTotp} className="space-y-3">
            <Input
              label="6-digit code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000 000"
              className="font-mono text-center tracking-[0.4em] text-lg"
              maxLength={6}
              autoComplete="one-time-code"
            />
            {error && <FeedbackBanner type="error" text={error} />}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={loading || verifyCode.length !== 6}>{loading ? "Verifying…" : "Verify & enable"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Step: backup codes */}
      {step === "backup" && (
        <div className="space-y-4 pt-2" style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}>
          <FeedbackBanner type="success" text="2FA is now enabled. Save these backup codes — each can only be used once." />
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <code key={i} className="rounded-lg px-3 py-2 text-xs font-mono text-center tracking-wider"
                style={{ background: "hsl(var(--b4) / 0.4)", color: "hsl(var(--c1))", boxShadow: "inset 0 0 0 1px hsl(var(--b4) / 0.25)" }}>
                {code}
              </code>
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={resetFlow}>Done</Button>
        </div>
      )}

      {/* Step: confirm password to disable */}
      {step === "disabling" && (
        <form onSubmit={handleDisable2FA} className="space-y-3 pt-2" style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}>
          <p className="text-xs" style={{ color: "hsl(var(--c3))" }}>Enter your password to disable two-factor authentication.</p>
          <Input type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" />
          {error && <FeedbackBanner type="error" text={error} />}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" size="sm" disabled={loading || !password}>{loading ? "Disabling…" : "Disable 2FA"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>Cancel</Button>
          </div>
        </form>
      )}
    </SettingSection>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<Array<{ id: string; name: string | null; start: string | null; createdAt: string; expiresAt: string | null; enabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Browser Extension");
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const loadKeys = async () => {
    try {
      const { data, error: err } = await (authClient.apiKey as any).list();
      if (err) { setError(err.message || "Failed to load API keys"); return; }
      setKeys(data || []);
    } catch { setError("Failed to load API keys"); } finally { setLoading(false); }
  };

  useState(() => { loadKeys(); });

  const handleCreate = async () => {
    setCreating(true); setError("");
    try {
      const { data, error: err } = await (authClient.apiKey as any).create({ name: newKeyName.trim() || "API Key" });
      if (err) { setError(err.message || "Failed to create API key"); return; }
      setNewKey(data.key); loadKeys();
    } catch { setError("Failed to create API key"); } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await (authClient.apiKey as any).delete({ keyId: id });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch { setError("Failed to delete API key"); }
  };

  const handleCopy = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SettingSection title="API keys" description="Keys for the browser extension and external integrations.">
      {/* New key reveal */}
      {newKey && (
        <div className="space-y-3 p-3 rounded-lg" style={{ background: "hsl(var(--h3) / 0.06)", border: "1px solid hsl(var(--h3) / 0.2)" }}>
          <p className="text-xs font-[var(--font-weight-medium)]" style={{ color: "hsl(var(--h3))" }}>
            Copy your key now — it won't be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono rounded-lg px-3 py-2 select-all break-all"
              style={{ background: "hsl(var(--b4) / 0.5)", color: "hsl(var(--c1))", boxShadow: "inset 0 0 0 1px hsl(var(--b4) / 0.3)" }}>
              {newKey}
            </code>
            <Button variant="secondary" size="sm" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setNewKey(null); setShowCreate(false); }}>Done</Button>
        </div>
      )}

      {/* Create form */}
      {showCreate && !newKey && (
        <div className="flex items-end gap-2 pt-1" style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}>
          <div className="flex-1">
            <Input label="Key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Browser Extension" />
          </div>
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
        </div>
      )}

      {error && <FeedbackBanner type="error" text={error} />}

      {/* Keys list */}
      {loading ? (
        <p className="text-xs" style={{ color: "hsl(var(--c3))" }}>Loading…</p>
      ) : keys.length > 0 ? (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: "hsl(var(--b4) / 0.2)", boxShadow: "inset 0 0 0 1px hsl(var(--b4) / 0.3)" }}>
              {/* Key icon */}
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--c3))" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-[var(--font-weight-medium)] truncate" style={{ color: "hsl(var(--c1))" }}>
                  {key.name || "Unnamed key"}
                </p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "hsl(var(--c3))" }}>
                  {key.start ? `${key.start}••••••••` : "••••••••"}
                  {" · "}
                  {new Date(key.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {key.expiresAt && ` · Expires ${new Date(key.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(key.id)}
                className="text-xs px-2 py-1 rounded-lg transition-colors shrink-0"
                style={{ color: "hsl(0 60% 55%)", background: "hsl(0 60% 55% / 0.08)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(0 60% 55% / 0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(0 60% 55% / 0.08)"; }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      ) : !showCreate && !newKey ? (
        <p className="text-xs" style={{ color: "hsl(var(--c3))" }}>No API keys yet.</p>
      ) : null}

      {/* Add key button */}
      {!showCreate && !newKey && (
        <div style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)", paddingTop: 12 }}>
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New key
          </Button>
        </div>
      )}
    </SettingSection>
  );
}

function AccountTab() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [signingOut, setSigningOut] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleSignOutAll = async () => {
    setSigningOut(true);
    try {
      await authClient.revokeSessions();
      window.location.href = "/login";
    } catch {
      setSigningOut(false);
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || "");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid hsl(var(--b4) / 0.25)" }}>
      <span className="text-sm" style={{ color: "hsl(var(--c3))" }}>{label}</span>
      <div className="text-sm" style={{ color: "hsl(var(--c2))" }}>{children}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <SettingSection title="Account information" description="Details about your Zephyron account.">
        <InfoRow label="Display name">
          <span className="font-[var(--font-weight-medium)]" style={{ color: "hsl(var(--c1))" }}>{user?.name}</span>
        </InfoRow>
        {user?.email && (
          <InfoRow label="Email">
            <span className="font-mono text-xs">{user.email}</span>
          </InfoRow>
        )}
        <InfoRow label="Role">
          <Badge variant="accent">{user?.role || "user"}</Badge>
        </InfoRow>
        <InfoRow label="Member since">
          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Unknown"}
        </InfoRow>
        <InfoRow label="User ID">
          <button
            onClick={copyUserId}
            className="flex items-center gap-1.5 font-mono text-xs px-2 py-1 rounded transition-colors"
            style={{ background: "hsl(var(--b4) / 0.4)", color: copiedId ? "hsl(var(--h3))" : "hsl(var(--c3))" }}
            title="Click to copy"
          >
            {copiedId ? "Copied!" : `${user?.id?.slice(0, 10)}…`}
          </button>
        </InfoRow>
        <InfoRow label="App version">
          <Link to="/app/changelog" className="font-mono text-xs hover:underline no-underline" style={{ color: "hsl(var(--h3))" }}>
            v{__APP_VERSION__}
          </Link>
        </InfoRow>
      </SettingSection>

      <SettingSection title="Sessions" description="Manage your active login sessions.">
        <Button variant="secondary" size="sm" onClick={handleSignOutAll} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out all devices"}
        </Button>
      </SettingSection>

      <div className="card" style={{ border: "1px solid hsl(0 60% 40% / 0.2)" }}>
        <h3 className="text-sm font-[var(--font-weight-medium)] mb-1" style={{ color: "hsl(0 60% 55%)" }}>
          Danger zone
        </h3>
        <p className="text-xs mb-4" style={{ color: "hsl(var(--c3))" }}>
          Account deletion is not yet available. Contact support if you need to delete your account.
        </p>
        <Button variant="danger" size="sm" disabled>
          Delete account
        </Button>
      </div>
    </div>
  );
}
