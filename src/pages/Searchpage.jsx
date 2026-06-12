import { useState, useEffect, useCallback } from "react";
import TrackRow from "../components/TrackRow";
import Avatar from "../components/Avatar";
import { axiosClient } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ tracks: [], artists: [], albums: [] });
  const [activeTab, setActiveTab] = useState("all"); // all | tracks | artists | albums
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = "http://localhost:3001";
  const navigate = useNavigate()

  // Trigger search requests using an optimized fetch routine
  const executeSearch = useCallback((searchStr) => {
    if (searchStr.trim().length < 2) {
      setResults({ tracks: [], artists: [], albums: [] });
      return;
    }

    setLoading(true);
    axiosClient.get(`/search?q=${encodeURIComponent(searchStr)}`)
      .then((res) => {
        setResults({
          tracks: res.tracks || [],
          artists: res.artists || [],
          albums: res.albums || []
        });
      })
      .catch((err) => {
        console.error("Search query execution failed:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Debounce user keystrokes to prevent API spamming
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      executeSearch(query);
    }, 350);

    return () => clearTimeout(delayTimer);
  }, [query, executeSearch]);

  const hasResults = results.tracks.length > 0 || results.artists.length > 0 || results.albums.length > 0;

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      
      {/* Immersive Input Field Section */}
      <div className="mb-8 relative">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-400 text-lg">
          <i className="ti ti-search" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for Qasidas, Nasheeds, artists, or collections..."
          className="w-full bg-zinc-900/80 text-zinc-100 placeholder-zinc-500 font-medium border border-white/5 rounded-2xl pl-14 pr-12 py-4 text-base focus:outline-none focus:border-emerald-500/50 focus:bg-zinc-900 transition-all shadow-inner"
          autoFocus
        />
        {query && (
          <button 
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-5 flex items-center bg-transparent border-0 text-zinc-500 hover:text-zinc-300 cursor-pointer text-sm"
          >
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      {/* Conditional Tab Bar Navigation */}
      {hasResults && !loading && (
        <div className="flex gap-2 border-b border-zinc-800/60 pb-4 mb-6 overflow-x-auto">
          {["all", "tracks", "artists", "albums"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-zinc-100 border-zinc-100 text-zinc-900 shadow-md"
                  : "bg-transparent border-white/5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Results Workspace Canvas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-medium tracking-wide">Searching catalog database...</span>
        </div>
      ) : query.trim().length >= 2 && !hasResults ? (
        /* Empty Results Fallback Block */
        <div className="flex flex-col items-center justify-center text-center py-24 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
          <i className="ti ti-search-off text-3xl text-zinc-600 mb-3" />
          <h4 className="text-sm font-semibold text-zinc-300">No Matches Found</h4>
          <p className="text-xs text-zinc-500 max-w-xs mt-1">
            Double check spelling or try looking for a simpler keyword pattern.
          </p>
        </div>
      ) : query.trim().length < 2 ? (
        /* Prompt Guide View */
        <div className="flex flex-col items-center justify-center text-center py-28 text-zinc-600">
          <i className="ti ti-music-search text-4xl mb-3 opacity-40" />
          <p className="text-sm font-medium max-w-xs leading-normal">
            Type an artist's name, a spiritual title, or a specific genre category to explore.
          </p>
        </div>
      ) : (
        /* Dynamic Multi-Result Layout */
        <div className="space-y-8 animate-[fadeIn_0.2s_ease-out]">
          
          {/* TRACKS PANEL COMPONENT ARRAY */}
          {(activeTab === "all" || activeTab === "tracks") && results.tracks.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1">Audio Tracks</h3>
              <div className="flex flex-col gap-0.5">
                {results.tracks.map((track, i) => (
                  <TrackRow 
                    key={track.id} 
                    track={track} 
                    index={i} 
                    liked={track.liked}
                    trackList={results.tracks} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* ARTISTS PROFILE CARD DISPLAY SECTION */}
          {(activeTab === "all" || activeTab === "artists") && results.artists.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1">Artists</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.artists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => navigate(`/artist/${artist.id}`)}
                    className="bg-zinc-900/40 hover:bg-zinc-800/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer transition-all duration-150"
                  >
                    <Avatar name={artist.name} url={`${API_BASE_URL}${artist.user.avatarUrl}`} size="lg" className="mb-3 shadow-md" />
                    <p className="text-sm font-bold text-zinc-100 truncate w-full">{artist.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {artist._count?.tracks ?? 0} tracks · {artist.user?._count?.followers ?? 0} followers
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALBUMS / COLLECTIONS SELECTION LIST */}
          {(activeTab === "all" || activeTab === "albums") && results.albums.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1">Albums & Collections</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {results.albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => navigate(`album/${album.id}`)}
                    className="flex items-center gap-4 bg-zinc-900/30 hover:bg-zinc-800/40 border border-white/5 p-3 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden shadow border border-white/5">
                      {album.coverUrl ? (
                        <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <i className="ti ti-album text-zinc-600 text-lg" />
                      )}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <h4 className="text-sm font-bold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">{album.title}</h4>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">By {album.artist?.name ?? "Various Artists"}</p>
                    </div>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono border border-white/5">
                      {album._count?.tracks ?? 0} tracks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}