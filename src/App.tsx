import { Routes, Route, Outlet, Navigate } from 'react-router'
import { useSession } from './lib/auth-client'
import { Sidebar } from './components/layout/Sidebar'
import { PlayerBar } from './components/layout/PlayerBar'

// Public pages
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

// App pages (authenticated)
import { HomePage } from './pages/HomePage'
import { BrowsePage } from './pages/BrowsePage'
import { SetPage } from './pages/SetPage'
import { SearchPage } from './pages/SearchPage'
import { PlaylistsPage } from './pages/PlaylistsPage'
import { PlaylistPage } from './pages/PlaylistPage'
import { HistoryPage } from './pages/HistoryPage'
import { AdminPage } from './pages/AdminPage'
import { ProfilePage } from './pages/ProfilePage'
import { ArtistsPage } from './pages/ArtistsPage'
import { ArtistPage } from './pages/ArtistPage'

/** Layout for authenticated app pages — sidebar + content + player */
function AppLayout() {
  return (
    <div className="h-screen flex bg-surface text-text-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <PlayerBar />
      </div>
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
  return (
    <Routes>
      {/* Public routes */}
      <Route index element={<RedirectIfAuth><LandingPage /></RedirectIfAuth>} />
      <Route path="login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
      <Route path="register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />

      {/* Protected app routes */}
      <Route path="app" element={<RequireAuth />}>
        <Route index element={<HomePage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="sets/:id" element={<SetPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="playlists/:id" element={<PlaylistPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="artists" element={<ArtistsPage />} />
        <Route path="artists/:id" element={<ArtistPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
