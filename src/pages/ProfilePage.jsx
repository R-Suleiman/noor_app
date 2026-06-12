import { useEffect, useState, useRef } from "react";
import Avatar from "../components/Avatar";
import TrackRow from "../components/TrackRow";
import Spinner from "../components/Spinner";
import { axiosClient, fmtNum } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AlbumManagementModal from "../components/AlbumManagementModal";

export default function ProfilePage({ userId }) {
  const { user: authUser, logout } = useAuth();
  const API_BASE_URL = "http://localhost:3001";
  const navigate = useNavigate();

  // Profile Core Data States
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("liked"); // 'liked' | 'playlists' | 'tracks' | 'manage_library'

  // Profile Edit Handling States
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", bio: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Upload & Library Sub-Management States
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [managingAlbumId, setManagingAlbumId] = useState(null);

  // Create New Album Inline Form State
  const [newAlbum, setNewAlbum] = useState({
    title: "",
    description: "",
    releaseYear: new Date().getFullYear(),
  });
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  // HTML Native File Input Referencing Handler
  const avatarInputRef = useRef(null);

  const uid = userId ?? authUser?.id;
  const isOwn = authUser?.id && uid && String(authUser.id) === String(uid);
  const isArtist = profile?.role === "ARTIST";

  // Main Profile Fetch Effect
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    axiosClient
      .get(`/users/${uid}`)
      .then((res) => {
        const userData = res.data?.user || res.user || res.data;
        if (!userData) throw new Error("Malformed data signature.");

        setProfile(userData);
        setForm({
          displayName: userData.displayName || "",
          bio: userData.artistProfile?.bio || "",
          location: userData.artistProfile?.location || "",
        });

        if (userData.role === "ARTIST") {
          setActiveTab("tracks");
        } else {
          setActiveTab("liked");
        }
      })
      .catch((err) => {
        console.error("Profile structural sync failure:", err);
        setError(
          "Unable to resolve the requested user identity profile records.",
        );
        if (isOwn) setProfile(authUser);
      })
      .finally(() => setLoading(false));
  }, [uid, authUser, isOwn]);

  // Fetch Artist Albums for Library Management Sub-system
  useEffect(() => {
    if (isArtist && isOwn) {
      setLoadingLibrary(true);
      axiosClient
        .get(`/artists/${uid}/albums`)
        .then((res) => {
          setAlbums(res.data?.albums || res.albums || []);
        })
        .catch((err) => {
          console.error("Failed to load library albums:", err);
        })
        .finally(() => setLoadingLibrary(false));
    }
  }, [isArtist, isOwn, uid]);

  // AVATAR MULTIPART UPLOAD CONTROL DISPATCHER
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");

    setUploadingAvatar(true);
    setError("");

    try {
      const res = await axiosClient.patch(`/artists/profile/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = res.data?.user || res.user || res.data;
      setProfile((prev) => ({ ...prev, ...updatedUser }));
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to upload your chosen avatar.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault();
    if (!form.displayName.trim()) {
      setError("Display name field is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await axiosClient.patch(`/users/${uid}`, {
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
      });

      const updatedUser = res.data?.user || res.user || res.data;
      setProfile((prev) => ({ ...prev, ...updatedUser }));
      setEditing(false);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to finalize profile modifications.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Create New Album Submission Handler
  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    if (!newAlbum.title.trim()) return;

    setCreatingAlbum(true);
    try {
      const res = await axiosClient.post("/upload/album", {
        title: newAlbum.title.trim(),
        description: newAlbum.description.trim(),
        releaseYear:
          parseInt(newAlbum.releaseYear, 10) || new Date().getFullYear(),
      });
      const created = res.data?.album || res.album;
      if (created) {
        setAlbums((prev) => [created, ...prev]);
        setNewAlbum({
          title: "",
          description: "",
          releaseYear: new Date().getFullYear(),
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to generate new studio album collection.",
      );
    } finally {
      setCreatingAlbum(false);
    }
  };

  // Track Deletion Handler for Library View
  const handleDeleteTrack = async (trackId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently remove this track from your public catalog?",
      )
    )
      return;
    try {
      await axiosClient.delete(`/upload/track/${trackId}`);
      setProfile((prev) => {
        const targetKey = prev.artistProfile ? "artistProfile" : "tracks";
        if (targetKey === "artistProfile") {
          return {
            ...prev,
            artistProfile: {
              ...prev.artistProfile,
              tracks: prev.artistProfile.tracks.filter((t) => t.id !== trackId),
            },
          };
        }
        return {
          ...prev,
          tracks: (prev.tracks || []).filter((t) => t.id !== trackId),
        };
      });
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Failed to drop chosen track asset from core system.",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto">
        <i className="ti ti-user-x text-5xl text-zinc-600 block mb-4" />
        <p className="text-zinc-400 text-sm mb-4">
          The requested profile account context was not found.
        </p>
        <button
          onClick={() => navigate("login")}
          className="bg-zinc-800 text-zinc-200 px-5 py-2.5 rounded-xl text-xs font-semibold border-0 cursor-pointer"
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  const artist = profile.artistProfile;
  const counts = profile._count ?? {};

  const likedCollection = profile.likes || [];
  const playlistCollection = profile.playlists || [];
  const publishedTracks = artist?.tracks || profile.tracks || [];

  return (
    <div className="max-w-7xl mx-auto min-h-screen pb-24 bg-zinc-950 text-zinc-100">
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Visual Decorative Spacing Banner */}
      <div className="h-40 sm:h-40 w-full bg-gradient-to-r from-zinc-900 to-zinc-900/50 rounded-b-2xl border-b border-white/5" />

      {/* PROFILE META OVERLAY CONTEXT GRID */}
      <div className="px-8 pt-0">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 sm:-mt-24 mb-8 pb-8 border-b border-white/5 text-center sm:text-left relative z-10">
          <div className="relative group rounded-full flex-shrink-0">
            <Avatar
              name={profile.displayName}
              url={`${API_BASE_URL}${profile.avatarUrl}`}
              size="xl"
              className="shadow-2xl ring-4 ring-zinc-950 w-32 h-32 sm:w-40 sm:h-40 object-cover"
            />
            {isOwn && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
              >
                {uploadingAvatar ? (
                  <Spinner />
                ) : (
                  <>
                    <i className="ti ti-camera text-xl mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Change
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Profile Details Identity Feed */}
          <div className="flex-1 min-w-0 w-full sm:mb-2">
            {editing ? (
              <div className="max-w-md mx-auto sm:mx-0">
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1.5">
                  Edit Public Name
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, displayName: e.target.value }))
                  }
                  className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm font-medium text-zinc-100 outline-none w-full focus:border-emerald-500 transition-colors"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight truncate">
                {profile.displayName}
              </h1>
            )}

            <p className="text-sm font-medium text-zinc-400 mb-4 flex items-center justify-center sm:justify-start gap-2">
              <span>@{profile.username}</span>
              <span className="text-zinc-700">•</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  isArtist
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                }`}
              >
                {isArtist
                  ? artist?.isMadrassa
                    ? "Madrassa Account"
                    : "Artist Profile"
                  : "Listener"}
              </span>
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-6 bg-zinc-900/40 inline-flex px-5 py-2.5 rounded-xl border border-white/5 shadow-inner">
              {[
                ["Followers", counts.followers ?? 0],
                ["Following", counts.following ?? 0],
                ["Saved Likes", likedCollection.length || counts.likes || 0],
              ].map(([label, val]) => (
                <div key={label} className="text-center sm:text-left">
                  <span className="text-sm font-bold text-zinc-100 block sm:inline mr-1">
                    {fmtNum(val)}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ACTION BUTTON WRAPPER ROW */}
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end flex-shrink-0 sm:mb-2">
            {isOwn && (
              <>
                {isArtist && (
                  <button
                    onClick={() => navigate("/upload")}
                    className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl border-0 cursor-pointer text-white shadow-md transition-colors"
                  >
                    <i className="ti ti-upload text-sm" /> Upload Track
                  </button>
                )}
                {editing ? (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl border-0 cursor-pointer shadow-md transition-colors"
                    >
                      {saving ? <Spinner /> : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setError("");
                      }}
                      className="text-xs font-bold uppercase tracking-wider text-zinc-400 border border-white/5 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="ti ti-edit" /> Edit Details
                    </button>
                    <button
                      onClick={logout}
                      className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-red-400 border border-white/5 hover:border-red-500/10 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/20 cursor-pointer transition-all"
                    >
                      Sign Out
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* CONTENT TABS VIEWPORTS WORK PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* LEFT COLUMN: INFORMATION DETAILS SIDEBAR */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 shadow-sm">
              <h3 className="text-[11px] tracking-widest uppercase font-bold text-zinc-500 mb-3">
                About User
              </h3>

              {editing ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                      Bio Description
                    </label>
                    <textarea
                      value={form.bio}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bio: e.target.value }))
                      }
                      rows={4}
                      placeholder="Write something about your profile timeline..."
                      className="w-full bg-zinc-950 border border-white/5 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none resize-none font-medium placeholder:text-zinc-700 leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, location: e.target.value }))
                      }
                      placeholder="e.g. Mombasa, Kenya"
                      className="w-full bg-zinc-950 border border-white/5 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none font-medium placeholder:text-zinc-700"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isArtist || form.bio ? (
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap">
                      {form.bio || (
                        <span className="text-zinc-600 italic text-xs">
                          No biography summary written yet.
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">
                      This profile represents a registered listener account
                      context.
                    </p>
                  )}

                  {form.location && (
                    <p className="text-xs text-zinc-400 font-semibold inline-flex items-center gap-1.5 pt-2 border-t border-white/5 w-full">
                      <i className="ti ti-map-pin text-emerald-400" /> Located
                      in {form.location}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="text-xs font-semibold text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2.5 mt-4 flex items-center gap-1.5">
                  <i className="ti ti-alert-circle text-sm" /> {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE TABS VIEWPORTS */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex gap-4 border-b border-white/5 pb-px overflow-x-auto">
              {isArtist && (
                <button
                  onClick={() => setActiveTab("tracks")}
                  className={`pb-3 px-1 text-xs font-bold uppercase tracking-wider bg-transparent border-0 cursor-pointer transition-all relative shrink-0 ${
                    activeTab === "tracks"
                      ? "text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Published Catalog ({publishedTracks.length})
                  {activeTab === "tracks" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
              )}

              {isArtist && isOwn && (
                <button
                  onClick={() => setActiveTab("manage_library")}
                  className={`pb-3 px-1 text-xs font-bold uppercase tracking-wider bg-transparent border-0 cursor-pointer transition-all relative shrink-0 ${
                    activeTab === "manage_library"
                      ? "text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Manage Library
                  {activeTab === "manage_library" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab("liked")}
                className={`pb-3 px-1 text-xs font-bold uppercase tracking-wider bg-transparent border-0 cursor-pointer transition-all relative shrink-0 ${
                  activeTab === "liked"
                    ? "text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Liked Songs ({likedCollection.length})
                {activeTab === "liked" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("playlists")}
                className={`pb-3 px-1 text-xs font-bold uppercase tracking-wider bg-transparent border-0 cursor-pointer transition-all relative shrink-0 ${
                  activeTab === "playlists"
                    ? "text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Playlists ({playlistCollection.length})
                {activeTab === "playlists" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            </div>

            {/* TAB PANELS ACTIVE RENDER STREAM */}
            <div className="space-y-1">
              {activeTab === "tracks" && isArtist && (
                <>
                  {publishedTracks.map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={{
                        ...track,
                        artist: { name: profile.displayName },
                      }}
                      index={i}
                    />
                  ))}
                  {publishedTracks.length === 0 && (
                    <div className="text-center py-16 bg-zinc-900/20 border border-dashed border-white/5 rounded-2xl p-6">
                      <i className="ti ti-music-off text-3xl text-zinc-700 block mb-2" />
                      <p className="text-sm font-medium text-zinc-500">
                        No content tracks registered in this repository.
                      </p>
                      {isOwn && (
                        <button
                          onClick={() => navigate("upload")}
                          className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border-0 cursor-pointer transition-colors"
                        >
                          Upload First Track
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* BRAND NEW: LIBRARY MANAGEMENT PANEL FOR CORE ARTISTS */}
              {activeTab === "manage_library" && isArtist && isOwn && (
                <div className="space-y-6 pt-1">
                  {/* Studio Quick Actions Info Header */}
                  <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Noor Studio Manager
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Control your records, upload media, and customize studio
                        album groupings.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/upload")}
                      className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border-0 cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <i className="ti ti-plus" /> Upload Track Form
                    </button>
                  </div>

                  {/* Album Creation Widget */}
                  <form
                    onSubmit={handleCreateAlbum}
                    className="bg-zinc-900/20 border border-white/5 rounded-xl p-4 space-y-3"
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Create New Studio Album
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Album Title"
                        value={newAlbum.title}
                        required
                        onChange={(e) =>
                          setNewAlbum((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="sm:col-span-2 bg-zinc-950 border border-white/5 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none font-medium"
                      />
                      <input
                        type="number"
                        placeholder="Year"
                        value={newAlbum.releaseYear}
                        onChange={(e) =>
                          setNewAlbum((prev) => ({
                            ...prev,
                            releaseYear: e.target.value,
                          }))
                        }
                        className="bg-zinc-950 border border-white/5 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none font-medium"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Optional Album Description"
                      value={newAlbum.description}
                      onChange={(e) =>
                        setNewAlbum((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full bg-zinc-950 border border-white/5 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none font-medium"
                    />
                    <button
                      type="submit"
                      disabled={creatingAlbum}
                      className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border border-emerald-500/20 cursor-pointer transition-colors"
                    >
                      {creatingAlbum ? <Spinner /> : "Confirm & Save Album"}
                    </button>
                  </form>

                  {/* Registered Studio Albums Map */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Your Albums ({albums.length})
                    </h4>
                    {loadingLibrary ? (
                      <div className="flex justify-center py-6">
                        <Spinner />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-3">
                          {albums.map((alb) => (
                            <div
                              key={alb.id}
                              className="bg-zinc-900/40 border border-white/5 rounded-xl p-3 flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate">
                                  {alb.title}
                                </p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                  {alb.releaseYear || "N/A"} •{" "}
                                  {alb._count?.tracks ?? 0} tracks
                                </p>
                              </div>
                              <button
                                onClick={() => setManagingAlbumId(alb.id)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold p-2 px-3 rounded-lg border-0 cursor-pointer text-zinc-200"
                              >
                                Manage
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* ─── ADD THIS MODAL WIREUP RENDER LAYER ───────────────────────── */}
                        {managingAlbumId && (
                          <AlbumManagementModal
                            albumId={managingAlbumId}
                            onClose={() => setManagingAlbumId(null)}
                            onRefresh={() => {
                              navigate(0);
                            }}
                          />
                        )}
                        {albums.length === 0 && (
                          <p className="text-xs text-zinc-600 italic col-span-2 py-4 text-center">
                            No studio albums created under this artist handle
                            yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Registered Catalog Tracks Action Grid */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Catalog Inventory Management
                    </h4>
                    <div className="space-y-1">
                      {publishedTracks.map((track) => (
                        <div
                          key={track.id}
                          className="flex items-center justify-between p-2 bg-zinc-900/20 hover:bg-zinc-900/50 rounded-xl border border-white/5 transition-colors group"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <p className="text-xs font-semibold text-zinc-200 truncate">
                              {track.title}
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase mt-0.5">
                              {track.genre} • {track.language}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteTrack(track.id)}
                            className="bg-transparent border-0 cursor-pointer text-zinc-600 hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-500/5"
                            title="Delete Track permanently"
                          >
                            <i className="ti ti-trash text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "liked" && (
                <>
                  {likedCollection.map((item, i) => {
                    const rawTrack = item?.track || item;
                    return rawTrack?.id ? (
                      <TrackRow key={rawTrack.id} track={rawTrack} index={i} />
                    ) : null;
                  })}
                  {likedCollection.length === 0 && (
                    <div className="text-center py-16 bg-zinc-900/20 border border-dashed border-white/5 rounded-2xl p-6 text-zinc-500">
                      <i className="ti ti-heart text-3xl text-zinc-700 block mb-2" />
                      <p className="text-sm font-medium text-zinc-500">
                        Songs you mark with a heart will aggregate inside this
                        stream.
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeTab === "playlists" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {playlistCollection.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => navigate(`playlists/${pl.id}`)}
                      className="flex items-center gap-4 bg-zinc-900/30 hover:bg-zinc-900/80 border border-white/5 rounded-xl p-3 cursor-pointer transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/5 flex-shrink-0 group-hover:border-emerald-500/20 transition-colors">
                        <i className="ti ti-playlist text-zinc-500 text-xl group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white">
                          {pl.name || pl.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {pl._count?.tracks ?? pl.tracks?.length ?? 0} tracks
                        </p>
                      </div>
                      <i className="ti ti-chevron-right text-zinc-600 text-sm pr-1 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  ))}
                  {playlistCollection.length === 0 && (
                    <div className="text-center py-16 bg-zinc-900/20 border border-dashed border-white/5 rounded-2xl p-6 col-span-2 w-full text-zinc-500">
                      <i className="ti ti-folder text-3xl text-zinc-700 block mb-2" />
                      <p className="text-sm font-medium text-zinc-500">
                        No personal compilation folders mapped to this handle.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
