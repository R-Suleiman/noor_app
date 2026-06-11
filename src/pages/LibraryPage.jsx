import { useState, useEffect } from "react";
import TrackRow from "../components/TrackRow";
import Avatar from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { axiosClient, trackBg } from "../lib/api";
import Spinner from "../components/Spinner";

export default function LibraryPage({ navigate }) {
  const [tab, setTab] = useState("liked");
  const [data, setData] = useState([]); // Dynamic state context holder matching the selected tab
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setLoading(true);
    setData([]);

    // Compute the accurate relational sub-route mapping dynamically
    let endpoint = `/users/${user.id}/liked`;
    if (tab === "playlists") endpoint = `/users/${user.id}/playlists`;
    if (tab === "albums") endpoint = `/users/${user.id}/saved-albums`;
    if (tab === "artists") endpoint = `/users/${user.id}/following`;

    axiosClient.get(endpoint)
      .then((res) => {
        if (!isMounted) return;
        // Check for specific payload keys depending on the endpoint response structure
        if (tab === "liked") setData(res.data.tracks || []);
        else if (tab === "playlists") setData(res.data.playlists || []);
        else if (tab === "albums") setData(res.data.albums || []);
        else if (tab === "artists") setData(res.data.artists || []);
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

  // Auth Guard Gatekeeper View Fallback State
  if (!user) {
    return (
      <div className="p-8 flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-center mb-5 text-zinc-500">
          <i className="ti ti-lock text-3xl" />
        </div>
        <h3 className="text-xl font-bold text-zinc-200 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
          Sign in to view your library
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Your collection of spiritual audio recordings, customized play queues, and followed orators live here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      
      {/* Premium Profile Banner Card Area */}
      <div className="flex flex-col sm:flex-items-center sm:flex-row gap-5 mb-8 bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Avatar name={user.displayName} url={user.avatarUrl} size="xl" className="shadow-lg border border-white/10" />
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight" style={{ fontFamily: "'Cinzel', serif" }}>
              {user.displayName}
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">@{user.username}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate("profile", { userId: user.id })}
          className="sm:ml-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-zinc-100 border border-white/5 hover:border-zinc-700 px-4 py-2.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 transition-all cursor-pointer shadow-sm"
        >
          <i className="ti ti-user-edit text-sm" /> View Profile
        </button>
      </div>

      {/* Modern High-End Tab Interface */}
      <div className="flex gap-2 border-b border-zinc-800/60 mb-6 overflow-x-auto scrollbar-none">
        {[
          ["liked", "Liked Tracks", "ti-heart-filled"],
          ["playlists", "Playlists", "ti-playlist"],
          ["albums", "Albums", "ti-album"],
          ["artists", "Following", "ti-users"]
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
          
          {/* 1. LIKED TRACKS GRID PANEL VIEW */}
          {tab === "liked" && (
            data.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {data.map((t, i) => (
                  <TrackRow key={t.id} track={t} index={i} liked trackList={data} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <i className="ti ti-heart-broken text-4xl mb-3 opacity-40" />
                <p className="text-zinc-400 text-sm font-medium">No liked tracks yet.</p>
                <p className="text-zinc-600 text-xs mt-1">Tap the heart icon on browse pages to seed this collection.</p>
              </div>
            )
          )}

          {/* 2. PLAYLISTS ARCHIVE SUB-GRID DISPLAY */}
          {tab === "playlists" && (
            data.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => navigate("playlist", { playlistId: playlist.id })}
                    className="bg-zinc-900/40 hover:bg-zinc-800/40 border border-white/5 rounded-2xl p-4 flex flex-col cursor-pointer transition-all duration-200 group"
                  >
                    <div className="aspect-square w-full rounded-xl bg-zinc-800 flex items-center justify-center mb-3 shadow relative overflow-hidden">
                      <i className="ti ti-playlist text-zinc-600 text-4xl group-hover:scale-105 transition-transform" />
                    </div>
                    <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">{playlist.name}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">{playlist._count?.tracks ?? 0} tracks</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <i className="ti ti-folder-plus text-4xl mb-3 opacity-40" />
                <p className="text-zinc-400 text-sm font-medium">Your custom playlists list is empty.</p>
              </div>
            )
          )}

          {/* 3. SAVED ALBUMS DISPLAY COMPONENT */}
          {tab === "albums" && (
            data.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => navigate("album", { albumId: album.id })}
                    className="bg-zinc-900/30 hover:bg-zinc-800/40 border border-white/5 rounded-2xl p-4 cursor-pointer transition-all duration-200 group text-center"
                  >
                    <div className={`aspect-square w-full rounded-xl flex items-center justify-center mb-3 shadow relative overflow-hidden ${trackBg({ id: album.id })}`}>
                      {album.coverUrl ? (
                        <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <i className="ti ti-album text-white/20 text-3xl" />
                      )}
                    </div>
                    <p className="text-sm font-bold text-zinc-200 truncate w-full group-hover:text-emerald-400 transition-colors">{album.title}</p>
                    <p className="text-xs text-zinc-500 truncate w-full mt-1 font-medium">By {album.artist?.name ?? "Various Orators"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <i className="ti ti-disc text-4xl mb-3 opacity-40" />
                <p className="text-zinc-400 text-sm font-medium">No albums saved to library.</p>
              </div>
            )
          )}

          {/* 4. FOLLOWING ORATORS PROFILE MODULE ARRAY */}
          {tab === "artists" && (
            data.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => navigate("artist", { artistId: artist.id })}
                    className="bg-zinc-900/40 hover:bg-zinc-800/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-200"
                  >
                    <Avatar name={artist.name} size="lg" className="mb-3 shadow" />
                    <p className="text-sm font-bold text-zinc-200 truncate w-full">{artist.name}</p>
                    {artist.isMadrassa && (
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.25 rounded-full mt-1 font-semibold">
                        Madrassa
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <i className="ti ti-user-plus text-4xl mb-3 opacity-40" />
                <p className="text-zinc-400 text-sm font-medium">Not following any artists yet.</p>
              </div>
            )
          )}

        </div>
      )}

    </div>
  );
}