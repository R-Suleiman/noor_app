import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";

import HomePage from "../pages/HomePage";
import BrowsePage from "../pages/BrowsePage";
import LibraryPage from "../pages/LibraryPage";
import UploadPage from "../pages/UploadPage";
import ArtistPage from "../pages/ArtistPage";
import ProfilePage from "../pages/ProfilePage";
import AuthPage from "../pages/AuthPage";
import ProtectedRoute from "../components/ProtectedRoute";
import SearchPage from "../pages/Searchpage";
import AlbumPage from "../pages/AlbumPage";
import PlaylistPage from "../pages/PlaylistPage";
import AdminPage from "../pages/AdminPage";
import NowPlayingPage from "../pages/NowPlayingPage";

const Router = () => [
  <BrowserRouter>
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

        {/* ─── PERSONAL LIBRARY ROUTES ─── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/playlists/:playlistId" element={<PlaylistPage />} />
        </Route>

        {/* ─── PROTECTED ARTIST ONLY ROUTES ─── */}
        <Route element={<ProtectedRoute allowedRoles={["ARTIST"]} />}>
          <Route path="/upload" element={<UploadPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>,
];

export default Router;
