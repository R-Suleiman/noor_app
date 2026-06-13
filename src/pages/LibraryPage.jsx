import { useState, useEffect } from "react";
import TrackRow from "../components/TrackRow";
import Avatar from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { axiosClient } from "../lib/api";
import Spinner from "../components/Spinner";
import { useNavigate } from "react-router-dom";

export default function LibraryPage() {
  const [tab, setTab] = useState("liked");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const API_BASE_URL = "http://localhost:3001";

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setLoading(true);
    setData([]);

    // Compute the accurate relational sub-route mapping dynamically
    let endpoint = `/users/${user.id}/liked`;
    if (tab === "playlists") endpoint = `/users/${user.id}/playlists`;
    if (tab === "artists") endpoint = `/users/${user.id}/following`;

    axiosClient
      .get(endpoint)
      .then((res) => {
        if (!isMounted) return;

        if (tab === "liked") setData(res.tracks || []);
        else if (tab === "playlists") setData(res.playlists || []);
        else if (tab === "artists") setData(res.artists || []);
      })
      .catch((err) => {
        console.error(`Failed to sync user library sub-dataset [${tab}]:`, err);
        if (isMounted) setData([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tab, user]);

  // Auth Guard Fallback
  if (!user) {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-center mb-5 text-zinc-500">
          <i className="ti ti-lock text-3xl" />
        </div>
        <h3
          className="text-xl font-bold text-zinc-200 mb-2"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Sign in to view your library
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Your collection of spiritual audio recordings, customized playlists,
          and followed orators live here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      {/* Premium Profile Banner Card Area */}
      <div className="flex flex-col sm:flex-items-center sm:flex-row gap-5 mb-8 bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Avatar
            name={user.displayName}
            url={`${API_BASE_URL}${user.avatarUrl}`}
            size="xl"
            className="shadow-lg border border-white/10"
          />
          <div>
            <h1
              className="text-3xl font-bold text-zinc-100 tracking-tight"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {user.displayName}
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              @{user.username}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/profile/${user.id}`)}
          className="sm:ml-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-zinc-100 border border-white/5 hover:border-zinc-700 px-4 py-2.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 transition-all cursor-pointer shadow-sm"
        >
          <i className="ti ti-user-edit text-sm" /> View Profile
        </button>
      </div>

      {/* Modern Tab Interface (Albums dropped) */}
      <div className="flex gap-2 border-b border-zinc-800/60 mb-6 overflow-x-auto scrollbar-none">
        {[
          ["liked", "Liked Tracks", "ti-heart-filled"],
          ["playlists", "Playlists", "ti-playlist"],
          ["artists", "Following", "ti-users"],
        ].map(([id, label, icon]) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 bg-transparent px-4 py-3 text-xs font-bold tracking-wide border-0 border-b-2 -mb-px cursor-pointer transition-all ${
                isActive
                  ? "text-emerald-400 border-emerald-500 font-extrabold"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <i className={`ti ${icon} text-sm`} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Global Tab Loader */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="animate-[fadeIn_0.15s_ease-out]">
          {/* 1. LIKED TRACKS PANEL */}
          {tab === "liked" &&
            (data.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {data.map((t, i) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    index={i}
                    liked
                    trackList={data}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <i className="ti ti-heart-broken text-4xl mb-3 opacity-40" />
                <p className="text-zinc-400 text-sm font-medium">
                  No liked tracks yet.
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  Tap the heart icon on browse pages to seed this collection.
                </p>
              </div>
            ))}

          {/* 2. PLAYLISTS GRID */}
          {tab === "playlists" &&
            (data.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() =>
                      navigate("playlist", { playlistId: playlist.id })
                    }
                    className="bg-zinc-900/40 hover:bg-zinc-800/40 border border-white/5 rounded-2xl p-4 flex flex-col cursor-pointer transition-all duration-200 group"
                  >
                    <div className="aspect-square w-full rounded-xl bg-zinc-800 flex items-center justify-center mb-3 shadow relative overflow-hidden">
                      <i className="ti ti-playlist text-zinc-600 text-4xl group-hover:scale-105 transition-transform" />
                    </div>
                    <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">
                      {playlist._count?.tracks ?? 0} tracks
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <i className="ti ti-folder-plus text-4xl mb-3 opacity-40" />
                <p className="text-zinc-400 text-sm font-medium">
                  Your custom playlist list is empty.
                </p>
              </div>
            ))}

          {/* 3. FOLLOWING ORATORS MODULE */}
          {tab === "artists" &&
            (data.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => navigate(`/artist/${a.id}`)}
                    className="bg-zinc-900/40 hover:bg-zinc-800/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-200 group"
                  >
                    <div className="relative mb-4">
                      <Avatar
                        name={a.name}
                        url={`${API_BASE_URL}${a.user.avatarUrl}`}
                        size="xl"
                      />
                      <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <i className="ti ti-eye text-white text-lg" />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-zinc-100 truncate w-full group-hover:text-emerald-400 transition-colors">
                      {a.name}
                    </p>
                    {a.isMadrassa && (
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full mt-1.5 font-medium tracking-wide">
                        Madrassa
                      </span>
                    )}
                    <p className="text-xs text-zinc-500 mt-2 font-medium">
                      {a._count.tracks ?? 0} tracks · {a._count.followers ?? 0}{" "}
                      followers
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <i className="ti ti-user-plus text-4xl mb-3 opacity-40" />
                <p className="text-zinc-400 text-sm font-medium">
                  Not following any artists yet.
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
