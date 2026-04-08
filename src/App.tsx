import React from 'react'
import { Routes, Route, Outlet, Navigate } from 'react-router'
import { useSession } from './lib/auth-client'
import { useThemeStore } from './stores/themeStore'
import { TopNav } from './components/layout/TopNav'
import { PlayerBar } from './components/layout/PlayerBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WhatsNew } from './components/WhatsNew'
import { CookieConsent } from './components/CookieConsent'
import { Toaster } from 'sileo'

// Public pages
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AboutPage } from './pages/AboutPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { TwoFactorPage } from './pages/TwoFactorPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ChangelogPage as PublicChangelogPage } from './pages/ChangelogPage'

// App pages (authenticated)
import { HomePage } from './pages/HomePage'
import { BrowsePage } from './pages/BrowsePage'
import { SetPage } from './pages/SetPage'
import { SearchPage } from './pages/SearchPage'
import { PlaylistsPage } from './pages/PlaylistsPage'
import { PlaylistPage } from './pages/PlaylistPage'
import { HistoryPage } from './pages/HistoryPage'
import { LikedSongsPage } from './pages/LikedSongsPage'
import { AdminPage } from './pages/AdminPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { ArtistsPage } from './pages/ArtistsPage'
import { ArtistPage } from './pages/ArtistPage'
import { EventsPage } from './pages/EventsPage'
import { EventPage } from './pages/EventPage'
import { ChangelogPage } from './pages/ChangelogPage'
import { RequestSetPage } from './pages/RequestSetPage'

/** Layout for authenticated app pages — top nav over content + player */
function AppLayout() {
  return (
    <div className="h-screen flex flex-col bg-surface text-text-primary">
      <div id="app-scroll-container" className="flex-1 overflow-y-auto relative">
        <TopNav />
        <Outlet />
      </div>
      <PlayerBar />
      <WhatsNew />
    </div>
  )
}

/** Redirect to login if not authenticated */
function RequireAuth() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}

/** Redirect to app if already authenticated */
function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}

function App() {
  const theme = useThemeStore((state) => state.theme)

  // Compute toast background color from CSS variables to match Zephyron's HSL-parametric system
  // Sileo uses SVG <rect> elements with fill attribute that CSS background can't override
  const toastFillColor = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const root = document.documentElement
    const b5 = getComputedStyle(root).getPropertyValue('--b5').trim()
    return b5 ? `hsl(${b5})` : undefined
  }, [theme])

  return (
    <ErrorBoundary>
      <CookieConsent />
      <Routes>
        {/* Public routes */}
        <Route index element={<RedirectIfAuth><LandingPage /></RedirectIfAuth>} />
        <Route path="login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
        <Route path="register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
        <Route path="2fa" element={<TwoFactorPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="changelog" element={<PublicChangelogPage />} />

        {/* Protected app routes */}
        <Route path="app" element={<RequireAuth />}>
          <Route index element={<HomePage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="sets/:id" element={<SetPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="playlists/:id" element={<PlaylistPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="liked-songs" element={<LikedSongsPage />} />
          <Route path="artists" element={<ArtistsPage />} />
          <Route path="artists/:id" element={<ArtistPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:id" element={<EventPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="request-set" element={<RequestSetPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster
        position="top-center"
        theme={theme === 'light' ? 'light' : 'dark'}
        options={toastFillColor ? { fill: toastFillColor } : undefined}
      />
    </ErrorBoundary>
  )
}

export default App
