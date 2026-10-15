import { useEffect, useState, type ComponentType } from "react";
import { Link, useSearchParams } from "react-router";
import { useSession, getSession } from "../lib/auth-client";
import { fetchHistory, fetchPlaylists, fetchMonthlyWrapped, fetchLikedSongs, uploadBanner, deleteBanner } from "../lib/api";
import type { ExtendedUser } from "../lib/auth-types";
import { ContentCard, ToolbarTabs } from "../components/bleh";
import { PageFrame } from "../components/shell/PageFrame";
import { ProfileHeader } from "../components/profile/ProfileHeader";
import { ProfilePictureUpload } from "../components/profile/ProfilePictureUpload";
import { EditProfileModal } from "../components/profile/EditProfileModal";
import { BadgesGrid } from "../components/profile/BadgesGrid";
import { ActivityFeed } from "../components/activity/ActivityFeed";
import { OverviewTab } from "../components/profile/tabs/OverviewTab";
import { PlaylistsTab } from "../components/profile/tabs/PlaylistsTab";
import { LikedSongsTab } from "../components/profile/tabs/LikedSongsTab";
import { HistoryTab } from "../components/profile/tabs/HistoryTab";
import { SettingsLayout } from "../components/profile/settings/SettingsLayout";
import { PrivacyTab } from "../components/profile/settings/PrivacyTab";
import { AppearanceTab } from "../components/profile/settings/AppearanceTab";
import { SecurityTab } from "../components/profile/settings/SecurityTab";
import { AccountTab } from "../components/profile/settings/AccountTab";
import { AboutTab } from "../components/profile/settings/AboutTab";
import {
  MAIN_TABS,
  isSettingsTab,
  parseProfileTab,
  type ProfileTab,
  type ProfileUser,
  type SettingsTab,
} from "../components/profile/profileTabs";
import "../components/profile/profile.css";

/** Top-level sections shown in the tab bar. Settings groups the five settings tabs. */
type Section = Exclude<ProfileTab, SettingsTab> | "settings";

const SETTINGS_DEFAULT: SettingsTab = "appearance";

const SETTINGS_BODIES: Record<SettingsTab, ComponentType> = {
  privacy: PrivacyTab,
  appearance: AppearanceTab,
  security: SecurityTab,
  account: AccountTab,
  about: AboutTab,
};

export function ProfilePage() {
  const { data: session } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseProfileTab(searchParams.get("tab"));

  const [recentCount, setRecentCount] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);
  const [monthHours, setMonthHours] = useState<number | null>(null);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [showBannerUpload, setShowBannerUpload] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  // Edit profile modal drafts
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState<string | null>(null);
  const [editBio, setEditBio] = useState<string | null>(null);

  // Liked songs total feeds the overview count; the page itself lives in LikedSongsTab
  const [likedSongsTotal, setLikedSongsTotal] = useState(0);
  const [likedSongsPage, setLikedSongsPage] = useState(1);

  const user = session?.user as ProfileUser | undefined;

  useEffect(() => {
    fetchHistory()
      .then((r) => setRecentCount(r.data?.length || 0))
      .catch(() => {});
    fetchPlaylists()
      .then((r) => setPlaylistCount(r.data?.length || 0))
      .catch(() => {});

    const now = new Date();
    fetchMonthlyWrapped(now.getFullYear(), now.getMonth() + 1)
      .then((data) => setMonthHours(data.total_hours))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.avatar_url) setAvatarUrl(user.avatar_url);
  }, [user?.avatar_url]);

  useEffect(() => {
    if (user?.banner_url) setBannerUrl(user.banner_url);
  }, [user?.banner_url]);

  useEffect(() => {
    if (activeTab === "overview" && session?.user && likedSongsTotal === 0) {
      fetchLikedSongs(1)
        .then((res) => setLikedSongsTotal(res.total))
        .catch(() => {});
    }
  }, [activeTab, session, likedSongsTotal]);

  if (!session?.user || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm" style={{ color: "oklch(var(--c3))" }}>
            Not signed in.
          </p>
          <Link
            to="/login"
            className="text-sm mt-2 inline-block no-underline hover:underline"
            style={{ color: "oklch(var(--h3))" }}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const setActiveTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params);
  };

  const section: Section = isSettingsTab(activeTab) ? "settings" : activeTab;

  const handleSectionChange = (next: Section) => {
    if (next !== "settings") return setActiveTab(next);
    // Keep the current settings tab if we are already in Settings
    setActiveTab(isSettingsTab(activeTab) ? activeTab : SETTINGS_DEFAULT);
  };

  const tabs: { key: Section; label: string }[] = [
    ...MAIN_TABS.map((t) => ({ key: t.id as Section, label: t.label })),
    { key: "settings", label: "Settings" },
  ];

  const openEditModal = () => {
    setEditDisplayName(user.name || "");
    setEditBio(user.bio || "");
    setShowEditModal(true);
  };

  const openBannerUpload = () => {
    setShowEditModal(false);
    setShowBannerUpload(true);
  };

  const openAvatarUpload = () => {
    setShowEditModal(false);
    setShowAvatarUpload(true);
  };

  const removeBanner = async () => {
    await deleteBanner();
    setBannerUrl(null);
  };

  const renderMain = () => {
    if (isSettingsTab(activeTab)) {
      const Body = SETTINGS_BODIES[activeTab];
      return (
        <SettingsLayout tab={activeTab} onSelect={setActiveTab}>
          <Body />
        </SettingsLayout>
      );
    }
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            userId={user.id}
            playlistCount={playlistCount}
            likedSongsTotal={likedSongsTotal}
            recentCount={recentCount}
            monthHours={monthHours}
            onViewAll={() => setActiveTab("activity")}
          />
        );
      case "activity":
        return <ActivityFeed feed="user" userId={user.id} limit={5} />;
      case "badges":
        return <BadgesGrid userId={user.id} />;
      case "playlists":
        return <PlaylistsTab onCountChange={setPlaylistCount} />;
      case "liked-songs":
        return (
          <LikedSongsTab
            page={likedSongsPage}
            onPageChange={setLikedSongsPage}
            total={likedSongsTotal}
            onTotalChange={setLikedSongsTotal}
          />
        );
      case "history":
        return <HistoryTab />;
    }
  };

  return (
    <>
      <ProfileHeader
        user={{ ...user, avatar_url: avatarUrl, banner_url: bannerUrl }}
        isOwnProfile={true}
        onEditClick={openEditModal}
        onAvatarClick={() => setShowAvatarUpload(true)}
        onBannerClick={() => setShowBannerUpload(true)}
      />

      <PageFrame>
        <ContentCard
          toolbar={<ToolbarTabs tabs={tabs} active={section} onChange={handleSectionChange} />}
          main={section === "settings" ? renderMain() : (
            <div key={activeTab} className="profile-tab-enter">
              {renderMain()}
            </div>
          )}
        />
      </PageFrame>

      {showAvatarUpload && (
        <ProfilePictureUpload
          currentAvatarUrl={avatarUrl}
          onUploadSuccess={async (url) => {
            const updatedSession = await getSession();
            const updatedUser = updatedSession?.data?.user as ExtendedUser | undefined;
            if (updatedUser?.avatar_url) {
              setAvatarUrl(updatedUser.avatar_url);
            } else {
              setAvatarUrl(url);
            }
          }}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}

      {showBannerUpload && (
        <ProfilePictureUpload
          currentAvatarUrl={bannerUrl}
          uploadFn={uploadBanner}
          title="Upload Cover Photo"
          onUploadSuccess={(url) => setBannerUrl(url)}
          onClose={() => setShowBannerUpload(false)}
        />
      )}

      {showEditModal && (
        <EditProfileModal
          user={user}
          avatarUrl={avatarUrl}
          bannerUrl={bannerUrl}
          displayName={editDisplayName}
          bio={editBio}
          onClose={() => setShowEditModal(false)}
          onChangeBanner={openBannerUpload}
          onChangeAvatar={openAvatarUpload}
          onRemoveBanner={removeBanner}
          onDisplayNameChange={setEditDisplayName}
          onBioChange={setEditBio}
        />
      )}
    </>
  );
}
