import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import PageLoader from "../components/PageLoader";

const HomePage = lazy(() => import("../pages/HomePage"));
const BrowsePage = lazy(() => import("../pages/BrowsePage"));
const LibraryPage = lazy(() => import("../pages/LibraryPage"));
const UploadPage = lazy(() => import("../pages/UploadPage"));
const ArtistPage = lazy(() => import("../pages/ArtistPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const AuthPage = lazy(() => import("../pages/AuthPage"));
const SearchPage = lazy(() => import("../pages/Searchpage"));
const AlbumPage = lazy(() => import("../pages/AlbumPage"));
const PlaylistPage = lazy(() => import("../pages/PlaylistPage"));
const AdminPage = lazy(() => import("../pages/AdminPage"));
const NowPlayingPage = lazy(() => import("../pages/NowPlayingPage"));
const TrackDeepLinkPage = lazy(() => import("../pages/TrackDeepLinkPage"));

const Router = () => (
  <BrowserRouter>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/artist/:artistId" element={<ArtistPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/albums/:albumId" element={<AlbumPage />} />
        <Route path="/now-playing" element={<NowPlayingPage />} />
        <Route path="/tracks/:trackId" element={<TrackDeepLinkPage />} />

        {/* ─── PERSONAL LIBRARY ROUTES ─── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/playlists/:playlistId" element={<PlaylistPage />} />
        </Route>

        {/* ─── PROTECTED ARTIST ONLY ROUTES ─── */}
        <Route element={<ProtectedRoute allowedRoles={["ARTIST", "ADMIN"]} />}>
          <Route path="/upload" element={<UploadPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default Router;
