import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import TrackRow from "../components/TrackRow";
import { axiosClient, fmtNum } from "../lib/api";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage({ userId, navigate }) {
  const { user: authUser, logout } = useAuth();
  
  // Profile Information States
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tracks"); // Toggle tabs: 'tracks' vs 'liked'

  // Edit Management Sub-States
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", bio: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const uid = userId ?? authUser?.id;
  const isOwn = authUser?.id === uid;

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    axiosClient.get(`/users/${uid}`)
      .then((res) => {
        // Expecting data layer signature: { user: { id, displayName, role, artistProfile: {...} } }
        const userData = res.data?.user || res.user || res.data;
        setProfile(userData);
        
        // Populate standard state forms seamlessly
        setForm({
          displayName: userData?.displayName || "",
          bio: userData?.artistProfile?.bio || "",
          location: userData?.artistProfile?.location || ""
        });

        // Safe dynamic tab initialization fallback
        if (userData?.role !== "ARTIST") {
          setActiveTab("liked");
        }
      })
      .catch((err) => {
        console.error("Profile payload mapping failure:", err);
        setError("Could not load user profile details.");
        if (isOwn) setProfile(authUser);
      })
      .finally(() => setLoading(false));
  }, [uid, authUser, isOwn]);

  const save = async () => {
    if (!form.displayName.trim()) {
      setError("Display name cannot be left blank.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Replaced flawed axios get wrapper configuration with an explicit PATCH call
      const res = await axiosClient.patch(`/users/${uid}`, {
        displayName: form.displayName.trim(),
        // Pass parameters transparently to be sorted by underlying middleware controllers
        bio: form.bio.trim(),
        location: form.location.trim()
      });

      const updatedUser = res.data?.user || res.user || res.data;
      setProfile(updatedUser);
      setEditing(false);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to update profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  const p = profile;
  if (!p) {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto">
        <i className="ti ti-user-x text-5xl text-zinc-700 block mb-4" />
        <p className="text-zinc-400 text-sm mb-4">Account session context not found.</p>
        <button onClick={() => navigate("login")} className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-xl text-xs font-semibold">
          Sign In
        </button>
      </div>
    );
  }

  const artist = p.artistProfile;
  const isArtist = p.role === "ARTIST";
  const counts = p._count ?? {};

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      
      {/* Upper Cover Header & Avatar Meta Panel Row Block */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-white/5 text-center sm:text-left">
        <Avatar name={p.displayName} url={p.avatarUrl} size="xl" className="shadow-xl ring-4 ring-zinc-900" />
        
        <div className="flex-1 min-w-0 w-full">
          {editing ? (
            <div className="max-w-md mx-auto sm:mx-0">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Display Name</label>
              <input 
                value={form.displayName} 
                onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))} 
                className="bg-zinc-900 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-base font-semibold text-zinc-100 outline-none w-full mb-3"
              />
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-zinc-100 mb-1 tracking-tight" style={{ fontFamily: "'Cinzel', serif" }}>
              {p.displayName}
            </h1>
          )}
          
          <p className="text-sm font-medium text-zinc-500 mb-4">
            @{p.username} · <span className="text-emerald-400">{isArtist ? (artist?.isMadrassa ? "Madrassa Account" : "Artist Profile") : "Listener"}</span>
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-6 bg-zinc-900/30 inline-flex px-4 py-2 rounded-xl border border-white/5">
            {[
              ["Followers", counts.followers ?? 0],
              ["Following", counts.following ?? 0],
              ["Liked", counts.likes ?? 0]
            ].map(([label, val]) => (
              <div key={label} className="text-center sm:text-left">
                <span className="text-sm font-bold text-zinc-200 block sm:inline mr-1">{fmtNum(val)}</span> 
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Identity & Administration Action Handles */}
        {isOwn && (
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end mt-4 sm:mt-0">
            {editing ? (
              <>
                <button 
                  onClick={save} 
                  disabled={saving} 
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border-0 cursor-pointer text-white shadow-md transition-colors"
                >
                  {saving ? <Spinner sm /> : "Save Changes"}
                </button>
                <button 
                  onClick={() => { setEditing(false); setError(""); }} 
                  className="text-xs font-bold uppercase tracking-wider text-zinc-400 border border-white/5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setEditing(true)} 
                  className="text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <i className="ti ti-edit text-sm" /> Edit Profile
                </button>
                <button 
                  onClick={logout} 
                  className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-red-400 border border-white/5 hover:border-red-500/10 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/20 cursor-pointer transition-all"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Relational Content Panels Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Secondary Metadata Sub-Card Section */}
        <div className="md:col-span-1 space-y-4">
          {(isArtist || artist) && (
            <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] tracking-widest uppercase font-bold text-zinc-500 mb-3">Biography Details</p>
              
              {editing ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Public Bio</label>
                    <textarea 
                      value={form.bio} 
                      onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} 
                      rows={4} 
                      placeholder="Tell the community about your tracks..."
                      className="w-full bg-zinc-950 border border-white/5 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none resize-none font-medium placeholder:text-zinc-700" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Location / Center</label>
                    <input 
                      value={form.location} 
                      onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} 
                      placeholder="e.g. Mombasa, Kenya"
                      className="w-full bg-zinc-950 border border-white/5 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none font-medium placeholder:text-zinc-700" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {artist?.bio ? (
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap">{artist.bio}</p>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">No biographical information added yet.</p>
                  )}
                  {artist?.location && (
                    <p className="text-xs text-zinc-500 font-semibold inline-flex items-center gap-1.5">
                      <i className="ti ti-map-pin text-emerald-400" /> {artist.location}
                    </p>
                  )}
                </div>
              )}
              
              {error && (
                <div className="text-xs font-semibold text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2 mt-3 flex items-center gap-1.5">
                  <i className="ti ti-alert-circle" /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Primary Content Feeds & Tracks Tabbing Elements Container */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Dynamic Tab Navigation Row Headers */}
          <div className="flex gap-2 border-b border-white/5 pb-px">
            {isArtist && (
              <button 
                onClick={() => setActiveTab("tracks")} 
                className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider bg-transparent border-0 cursor-pointer transition-all relative ${
                  activeTab === "tracks" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Published Catalog
                {activeTab === "tracks" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
              </button>
            )}
            <button 
              onClick={() => setActiveTab("liked")} 
              className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider bg-transparent border-0 cursor-pointer transition-all relative ${
                activeTab === "liked" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Liked Tracks
              {activeTab === "liked" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
            </button>
          </div>

          {/* Render Active Tab Dynamic Window Layout Contexts */}
          <div className="space-y-1">
            {activeTab === "tracks" && isArtist && (
              <>
                {(artist?.tracks ?? []).map((track, i) => (
                  <TrackRow key={track.id} track={{ ...track, artist: { name: p.displayName } }} index={i} />
                ))}
                {(!artist?.tracks || artist.tracks.length === 0) && (
                  <div className="text-center py-20 bg-zinc-900/20 border border-dashed border-white/5 rounded-2xl p-6">
                    <i className="ti ti-music-off text-4xl text-zinc-700 block mb-3" />
                    <p className="text-sm font-semibold text-zinc-400">No content published to this feed.</p>
                    {isOwn && (
                      <button 
                        onClick={() => navigate("upload")} 
                        className="mt-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all border-0 cursor-pointer"
                      >
                        Upload First Track →
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "liked" && (
              <>
                {/* Dynamically reads and renders liked items array mapped cleanly from database relations */}
                {(p.likedTracks ?? []).map((item, i) => (
                  <TrackRow key={item.track.id} track={item.track} index={i} />
                ))}
                {(!p.likedTracks || p.likedTracks.length === 0) && (
                  <div className="text-center py-20 bg-zinc-900/20 border border-dashed border-white/5 rounded-2xl p-6 text-zinc-500">
                    <i className="ti ti-heart-broken text-4xl text-zinc-700 block mb-3" />
                    <p className="text-sm font-semibold text-zinc-400">No media additions tracked in your favorites collection.</p>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}