import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
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

const Router = () => ([
    <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />

            <Route element={<RootLayout />}>
              
              {/* ─── PUBLIC ROUTES ─── */}
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/search" element={<SearchPage />} />
          
              <Route path="/artist/:artistId" element={<ArtistPage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />

              {/* ─── PROTECTED PRIVATE ROUTES ─── */}
              <Route element={<ProtectedRoute />}>
                <Route path="/library" element={<LibraryPage />} />
              </Route>

              {/* ─── PROTECTED ARTIST ONLY ROUTES ─── */}
              <Route element={<ProtectedRoute allowedRoles={["ARTIST", "ADMIN"]} />}>
                <Route path="/upload" element={<UploadPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
]);

export default Router;
