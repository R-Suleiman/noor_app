import { useState, useEffect } from "react";
import TrackRow from "../components/TrackRow";
import { axiosClient } from "../lib/api";

const GENRES = ["All", "Qasidas", "Nasheeds", "Duff", "Instrumental", "Madrassa"];
const LANGUAGES = [
  { label: "All Languages", value: "All" },
  { label: "Arabic (العربية)", value: "ARABIC" },
  { label: "Swahili (Kiswahili)", value: "SWAHILI" },
  { label: "English", value: "ENGLISH" }
];
const SORTS = [
  { label: "Recently Added", value: "recent" },
  { label: "Popularity / Plays", value: "trending" },
  { label: "Alphabetical (A-Z)", value: "az" }
];

export default function BrowsePage() {
  const [genre, setGenre] = useState("All");
  const [language, setLanguage] = useState("All");
  const [sort, setSort] = useState("recent");
  
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Build standard query parameters safely without stripping characters
    const params = new URLSearchParams();
    if (genre !== "All") params.append("genre", genre.toUpperCase());
    if (language !== "All") params.append("language", language);
    if (sort !== "recent") params.append("sort", sort);

    axiosClient.get(`/tracks?${params.toString()}`)
      .then((res) => {
        if (isMounted) {
          setTracks(res.data.tracks || []);
        }
      })
      .catch((err) => {
        console.error("Browse filter execution failed:", err);
        if (isMounted) setTracks([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [genre, language, sort]);

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      
      {/* Page Header Section */}
      <div className="mb-8 border-b border-zinc-800/60 pb-6">
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight" style={{ fontFamily: "'Cinzel', serif" }}>
          Browse Catalog
        </h1>
        <p className="text-zinc-400 text-sm mt-1.5 font-medium">
          Refine the catalog across specialized vocal fields, language roots, and release timelines.
        </p>
      </div>

      {/* Filter Control Dashboard Section */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 mb-8 backdrop-blur-md flex flex-col gap-5">
        
        {/* Genre Pill Filters Array */}
        <div>
          <p className="text-[11px] uppercase font-bold tracking-widest text-zinc-500 mb-2.5">Vocal & Style Genre</p>
          <div className="flex gap-2 flex-wrap">
            {GENRES.map((g) => {
              const isActive = genre === g;
              return (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10"
                      : "bg-zinc-800/40 border-white/5 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdown Filters Sub-grid Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-800/50 pt-4">
          
          {/* Language Selection Filter Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase font-bold tracking-widest text-zinc-500">
              Spoken Language Root
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-zinc-800/60 text-zinc-200 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-zinc-900 text-zinc-200">
                    {l.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                <i className="ti ti-chevron-down text-xs" />
              </div>
            </div>
          </div>

          {/* Sort Hierarchy Order Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase font-bold tracking-widest text-zinc-500">
              Sort Sequence Priority
            </label>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full bg-zinc-800/60 text-zinc-200 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-zinc-900 text-zinc-200">
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                <i className="ti ti-chevron-down text-xs" />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Dynamic Results Content Processing Block */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-medium tracking-wide">Syncing catalog filters...</span>
        </div>
      ) : tracks.length > 0 ? (
        <div className="flex flex-col gap-1 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center justify-between px-4 mb-2 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            <span>Filtered Track Listing ({tracks.length} found)</span>
            <span>Category Context</span>
          </div>
          {tracks.map((t, i) => (
            <TrackRow 
              key={t.id} 
              track={t} 
              index={i} 
              trackList={tracks} // Injects list to support gapless queue progression
            />
          ))}
        </div>
      ) : (
        /* Empty Filter Match State Fallback Illustration Block */
        <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
          <div className="w-12 h-12 bg-zinc-800/40 rounded-xl border border-white/5 flex items-center justify-center text-zinc-400 mb-4">
            <i className="ti ti-filter-off text-2xl" />
          </div>
          <h3 className="text-zinc-200 font-semibold text-sm">No Tracks Match Filters</h3>
          <p className="text-zinc-500 text-xs max-w-sm mt-1 px-4 leading-normal">
            We couldn't find matches for {genre !== "All" ? `"${genre}"` : ""} tracks in the chosen language layout. Try adjusting your combinations.
          </p>
        </div>
      )}

    </div>
  );
}